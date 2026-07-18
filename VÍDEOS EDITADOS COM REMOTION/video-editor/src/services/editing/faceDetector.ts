import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { generateThumbnail } from '@/lib/ffmpeg';
import type { EditPlanScene } from '@/services/pipeline/types';

/** Normalized face position for a scene (0-1 coordinates). */
export interface SceneFace {
  sceneId: string;
  /** Center of the face, 0-1 */
  centerX: number;
  centerY: number;
  /** Approx face height as fraction of frame (used to pick a safe zoom). */
  faceHeight: number;
  /** Shot classification derived from face size. */
  shot: 'close' | 'medium' | 'wide';
  detected: boolean;
}

/**
 * Detect the primary face in each scene using OpenAI Vision.
 *
 * Strategy (cost-aware): extract ONE frame at each scene's midpoint and ask
 * the vision model for the primary face's bounding box. ~7-8 calls per video.
 * If detection fails, falls back to a conservative center crop.
 */
export async function detectFacesForScenes(
  videoPath: string,
  scenes: EditPlanScene[],
  jobDir: string
): Promise<SceneFace[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const results: SceneFace[] = [];

  for (const scene of scenes) {
    const midpoint = (scene.startTime + scene.endTime) / 2;
    const framePath = path.join(jobDir, `face-frame-${scene.id}.jpg`);

    const fallback: SceneFace = {
      sceneId: scene.id,
      centerX: 0.5,
      centerY: 0.38,
      faceHeight: 0.35,
      shot: 'close',
      detected: false,
    };

    if (!apiKey) {
      results.push(fallback);
      continue;
    }

    try {
      await generateThumbnail(videoPath, framePath, midpoint);
      const imgBuffer = await readFile(framePath);
      const b64 = imgBuffer.toString('base64');

      const face = await detectFaceInImage(b64, apiKey);
      results.push(
        face
          ? { sceneId: scene.id, ...face, detected: true }
          : fallback
      );

      // Cleanup the temp frame
      await unlink(framePath).catch(() => {});
    } catch {
      results.push(fallback);
    }
  }

  return results;
}

interface FaceBox {
  centerX: number;
  centerY: number;
  faceHeight: number;
  shot: 'close' | 'medium' | 'wide';
}

async function detectFaceInImage(
  base64Jpeg: string,
  apiKey: string
): Promise<FaceBox | null> {
  const prompt = `You are a face detector for vertical video editing.
Analyze this video frame. Find the PRIMARY person's face (the main speaker).
Respond ONLY with strict JSON, no markdown:
{"found": true|false, "centerX": 0.0-1.0, "centerY": 0.0-1.0, "faceHeightFraction": 0.0-1.0}
Where centerX/centerY is the center of the face as a fraction of frame width/height,
and faceHeightFraction is the face height divided by the frame height.
If no clear face, return {"found": false}.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'low' },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as any;
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (!parsed.found) return null;

  const centerX = clamp01(parsed.centerX ?? 0.5);
  const centerY = clamp01(parsed.centerY ?? 0.38);
  const faceHeight = clamp01(parsed.faceHeightFraction ?? 0.35);

  // Classify shot by face size
  let shot: 'close' | 'medium' | 'wide' = 'medium';
  if (faceHeight >= 0.3) shot = 'close';
  else if (faceHeight >= 0.15) shot = 'medium';
  else shot = 'wide';

  return { centerX, centerY, faceHeight, shot };
}

function clamp01(n: number): number {
  if (typeof n !== 'number' || isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
