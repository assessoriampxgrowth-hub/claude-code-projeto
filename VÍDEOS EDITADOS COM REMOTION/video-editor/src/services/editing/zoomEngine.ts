import type { EditPlan } from '@/services/pipeline/types';
import type { SceneFace } from './faceDetector';

export interface ZoomInstruction {
  startTime: number;
  endTime: number;
  scale: number; // 1.0 = normal
  focusX: number; // 0-1
  focusY: number; // 0-1
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  mode?: 'in' | 'out';
  rampSeconds?: number;
}

/**
 * Strategic, face-aware zoom engine — MPX standard.
 *
 * Fixes the "seesaw" problem: zoom is applied only on the hook and a LIMITED
 * number of high-emphasis scenes as punch-ins. Each punch-in ramps in fast,
 * holds, then ramps back out. Adjacent zoomed scenes are merged.
 *
 * Face-aware: when face detections are provided, the zoom focus point tracks
 * the detected face and the max scale is chosen so the face is NEVER cropped:
 *   - close-up  -> max 1.08
 *   - medium    -> max 1.12
 *   - wide      -> max 1.15
 */
export function generateZoomInstructions(
  editPlan: EditPlan,
  enabled: boolean,
  videoDuration?: number,
  faces?: SceneFace[]
): ZoomInstruction[] {
  if (!enabled || editPlan.scenes.length === 0) return [];

  const scenes = [...editPlan.scenes].sort((a, b) => a.startTime - b.startTime);
  const duration = videoDuration ?? scenes[scenes.length - 1].endTime;

  // Max zooms by video length (MPX rule)
  const maxZooms = duration <= 15 ? 4 : duration <= 30 ? 7 : 10;

  const faceMap = new Map<string, SceneFace>();
  if (faces) for (const f of faces) faceMap.set(f.sceneId, f);

  // 1) Hook zoom — always zoom the first scene
  const selected = new Set<number>([0]);

  // 2) Punch-ins on the highest-emphasis scenes (excluding the hook)
  const candidates = scenes
    .map((s, i) => ({ s, i }))
    .filter(
      ({ s, i }) =>
        i !== 0 &&
        s.zoomSuggestion !== 'none' &&
        s.emphasis >= 0.6 &&
        s.endTime - s.startTime >= 1.5
    )
    .sort((a, b) => b.s.emphasis - a.s.emphasis)
    .slice(0, Math.max(0, maxZooms - 1));

  for (const c of candidates) selected.add(c.i);

  // 3) Build instructions; merge consecutive selected scenes into one held zoom
  const sortedIdx = Array.from(selected).sort((a, b) => a - b);
  const instructions: ZoomInstruction[] = [];

  let g = 0;
  while (g < sortedIdx.length) {
    const start = sortedIdx[g];
    let end = start;
    while (g + 1 < sortedIdx.length && sortedIdx[g + 1] === end + 1) {
      end = sortedIdx[g + 1];
      g++;
    }
    g++;

    const isHook = start === 0;
    const startScene = scenes[start];

    // Face-aware focus + scale
    const face = faceMap.get(startScene.id);
    let focusX = 0.5;
    let focusY = 0.38;
    let maxScale = 1.08; // conservative default (talking head)

    if (face && face.detected) {
      focusX = face.centerX;
      focusY = face.centerY;
      maxScale =
        face.shot === 'wide' ? 1.15 : face.shot === 'medium' ? 1.12 : 1.08;
      // Safety: if the face is near an edge, pull the zoom back so a punch-in
      // never pushes the face out of frame.
      const edgeMargin = Math.min(focusX, 1 - focusX, focusY, 1 - focusY);
      if (edgeMargin < 0.18) maxScale = Math.min(maxScale, 1.06);
    }

    instructions.push({
      startTime: startScene.startTime,
      endTime: scenes[end].endTime,
      scale: maxScale,
      focusX,
      focusY,
      easing: 'easeOut',
      mode: 'in',
      rampSeconds: isHook ? 0.38 : 0.4,
    });
  }

  return instructions;
}
