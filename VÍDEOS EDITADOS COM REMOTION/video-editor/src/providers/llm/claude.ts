import Anthropic from '@anthropic-ai/sdk';
import { ProviderInfo } from '../types';
import { TranscriptionSegment } from '../transcription/interface';
import { LLMProvider, EditPlan, EditPlanScene } from './interface';

const SYSTEM_PROMPT = `You are an expert video editor AI. Your job is to analyze a video transcript and produce a detailed JSON edit plan that a Remotion-based video renderer will consume.

You MUST return ONLY valid JSON — no markdown fences, no commentary, no explanation. Just the raw JSON object.

The JSON must conform to this schema:

{
  "format": string,            // e.g. "vertical_short", "horizontal", "square"
  "mainTheme": string,         // one-sentence summary of the content
  "dominantEmotion": string,   // e.g. "motivational", "educational", "urgent", "calm"
  "suggestedPace": "slow" | "medium" | "fast" | "aggressive",
  "scenes": [                  // array of scene objects, covering the full duration
    {
      "id": string,            // unique ID like "scene-1"
      "type": "hook" | "problem" | "solution" | "benefit" | "proof" | "cta" | "narration" | "title" | "transition",
      "startTime": number,     // seconds from video start
      "endTime": number,       // seconds from video start
      "title": string,         // short title for this scene (will be rendered on screen)
      "subtitle": string,      // optional subtitle text
      "body": string,          // optional longer body text
      "emoji": string,         // single emoji representing the scene mood
      "color": {
        "bg": string,          // hex background color (dark tones preferred)
        "accent": string,      // hex accent color (vibrant)
        "text": string         // hex text color
      },
      "compositionType": "full_video" | "full_broll" | "overlay_half" | "side_by_side" | "pip" | "text_overlay" | "clean",
      "zoomIntensity": number, // 0 to 1, how much camera zoom/ken-burns effect
      "transitionIn": "cut" | "fade" | "slide" | "flash",
      "transitionOut": "cut" | "fade" | "slide" | "flash",
      "illustrationPrompt": string, // optional DALL-E prompt for b-roll illustration
      "confidenceScore": number,    // 0 to 1, how confident you are this scene classification is correct
      "emotion": string,            // emotion for this specific scene
      "energyLevel": number         // 0 to 1, energy level of this scene
    }
  ],
  "hookMoments": number[],    // timestamps (seconds) of attention-grabbing moments
  "impactPhrases": [          // powerful phrases worth highlighting
    { "text": string, "timestamp": number }
  ],
  "lowEnergySegments": [      // sections that are slow / could use b-roll
    { "start": number, "end": number }
  ],
  "suggestedCuts": [          // where to cut / speed-ramp
    { "timestamp": number, "reason": string }
  ],
  "captionBlocks": [          // subtitle blocks for rendering
    { "start": number, "end": number, "text": string, "highlight": string[] }
  ],
  "detectedCTA": { "text": string, "timestamp": number } | null,
  "keywords": string[],       // top keywords/tags for the video
  "totalDuration": number     // total duration in seconds
}

Guidelines:
- The first scene should almost always be a "hook" — the opening seconds that grab attention.
- Scenes should cover the entire duration without gaps or overlaps.
- Use vibrant accent colors that contrast with dark backgrounds.
- compositionType "full_video" means the original video fills the frame. "text_overlay" means text over video. "full_broll" means a generated illustration fills the frame.
- For illustrationPrompt, write a vivid, specific DALL-E prompt that would produce a relevant cinematic image. Only include when compositionType is "full_broll" or "overlay_half".
- captionBlocks should break the transcript into readable subtitle chunks (2-8 words each). The "highlight" array contains words within the text that should be visually emphasized.
- Be aggressive with hookMoments — social media content needs frequent attention resets.
- energyLevel should reflect the speaking pace, volume, and emotional intensity of that segment.`;

export class ClaudeLLMProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async validateAvailability(): Promise<ProviderInfo> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        name: this.name,
        status: 'unavailable',
        error: 'ANTHROPIC_API_KEY environment variable is not set',
      };
    }

    try {
      // Quick validation by sending a minimal request
      await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { name: this.name, status: 'available' };
    } catch (err: any) {
      return {
        name: this.name,
        status: 'error',
        error: `Anthropic API error: ${err.message ?? String(err)}`,
      };
    }
  }

  async analyzeContent(
    transcript: string,
    transcriptionSegments: TranscriptionSegment[],
    userPrompt: string,
    presetName?: string,
  ): Promise<EditPlan> {
    const segmentSummary = transcriptionSegments
      .map(
        (s) =>
          `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`,
      )
      .join('\n');

    const totalDuration =
      transcriptionSegments.length > 0
        ? transcriptionSegments[transcriptionSegments.length - 1].end
        : 0;

    let userMessage = `Analyze this video transcript and generate a complete edit plan as JSON.

FULL TRANSCRIPT:
${transcript}

TIMESTAMPED SEGMENTS:
${segmentSummary}

TOTAL DURATION: ${totalDuration.toFixed(1)} seconds

USER INSTRUCTIONS: ${userPrompt}`;

    if (presetName) {
      userMessage += `\n\nPRESET STYLE: ${presetName} — Adapt the edit plan to match this content style. For example:
- "viral_short": aggressive pacing, flashy transitions, lots of hooks
- "educational": calmer pacing, clear sections, text overlays for key points
- "testimonial": focus on proof/benefit scenes, emotional moments
- "sales": problem-solution structure, strong CTA
- "podcast": minimal cuts, clean composition, caption-focused`;
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude returned no text content');
    }

    const rawText = textBlock.text.trim();
    const jsonText = this.extractJSON(rawText);
    const parsed = JSON.parse(jsonText);
    return this.validateAndNormalize(parsed, totalDuration);
  }

  /**
   * Extract JSON from a response that might be wrapped in markdown fences
   * or have extra text around it.
   */
  private extractJSON(text: string): string {
    // Try direct parse first
    try {
      JSON.parse(text);
      return text;
    } catch {
      // continue to extraction
    }

    // Try extracting from markdown code block
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }

    // Try finding the first { ... last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1);
    }

    throw new Error('Could not extract valid JSON from Claude response');
  }

  /**
   * Validate and normalize the parsed edit plan, filling in defaults
   * for any missing fields.
   */
  private validateAndNormalize(
    raw: any,
    totalDuration: number,
  ): EditPlan {
    const scenes: EditPlanScene[] = (raw.scenes ?? []).map(
      (s: any, idx: number) => ({
        id: s.id ?? `scene-${idx + 1}`,
        type: s.type ?? 'narration',
        startTime: s.startTime ?? 0,
        endTime: s.endTime ?? totalDuration,
        title: s.title ?? `Scene ${idx + 1}`,
        subtitle: s.subtitle,
        body: s.body,
        emoji: s.emoji ?? '🎬',
        color: {
          bg: s.color?.bg ?? '#050508',
          accent: s.color?.accent ?? '#FFB800',
          text: s.color?.text ?? '#FFFFFF',
        },
        compositionType: s.compositionType ?? 'full_video',
        zoomIntensity: clamp(s.zoomIntensity ?? 0.3, 0, 1),
        transitionIn: s.transitionIn ?? 'cut',
        transitionOut: s.transitionOut ?? 'cut',
        illustrationPrompt: s.illustrationPrompt,
        confidenceScore: clamp(s.confidenceScore ?? 0.7, 0, 1),
        emotion: s.emotion ?? 'neutral',
        energyLevel: clamp(s.energyLevel ?? 0.5, 0, 1),
      }),
    );

    return {
      format: raw.format ?? 'vertical_short',
      mainTheme: raw.mainTheme ?? '',
      dominantEmotion: raw.dominantEmotion ?? 'neutral',
      suggestedPace: raw.suggestedPace ?? 'medium',
      scenes,
      hookMoments: raw.hookMoments ?? [],
      impactPhrases: raw.impactPhrases ?? [],
      lowEnergySegments: raw.lowEnergySegments ?? [],
      suggestedCuts: raw.suggestedCuts ?? [],
      captionBlocks: raw.captionBlocks ?? [],
      detectedCTA: raw.detectedCTA ?? undefined,
      keywords: raw.keywords ?? [],
      totalDuration: raw.totalDuration ?? totalDuration,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
