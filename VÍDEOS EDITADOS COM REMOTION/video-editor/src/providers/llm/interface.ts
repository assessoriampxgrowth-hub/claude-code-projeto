import { ProviderInfo } from '../types';
import { TranscriptionSegment } from '../transcription/interface';

export interface EditPlanScene {
  id: string;
  type:
    | 'hook'
    | 'problem'
    | 'solution'
    | 'benefit'
    | 'proof'
    | 'cta'
    | 'narration'
    | 'title'
    | 'transition';
  startTime: number;
  endTime: number;
  title: string;
  subtitle?: string;
  body?: string;
  emoji?: string;
  color: { bg: string; accent: string; text: string };
  compositionType:
    | 'full_video'
    | 'full_broll'
    | 'overlay_half'
    | 'side_by_side'
    | 'pip'
    | 'text_overlay'
    | 'clean';
  zoomIntensity: number;
  transitionIn: 'cut' | 'fade' | 'slide' | 'flash';
  transitionOut: 'cut' | 'fade' | 'slide' | 'flash';
  illustrationPrompt?: string;
  confidenceScore: number;
  emotion: string;
  energyLevel: number;
}

export interface EditPlan {
  format: string;
  mainTheme: string;
  dominantEmotion: string;
  suggestedPace: 'slow' | 'medium' | 'fast' | 'aggressive';
  scenes: EditPlanScene[];
  hookMoments: number[];
  impactPhrases: { text: string; timestamp: number }[];
  lowEnergySegments: { start: number; end: number }[];
  suggestedCuts: { timestamp: number; reason: string }[];
  captionBlocks: {
    start: number;
    end: number;
    text: string;
    highlight?: string[];
  }[];
  detectedCTA?: { text: string; timestamp: number };
  keywords: string[];
  totalDuration: number;
}

export interface LLMProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  analyzeContent(
    transcript: string,
    transcriptionSegments: TranscriptionSegment[],
    userPrompt: string,
    presetName?: string,
  ): Promise<EditPlan>;
}
