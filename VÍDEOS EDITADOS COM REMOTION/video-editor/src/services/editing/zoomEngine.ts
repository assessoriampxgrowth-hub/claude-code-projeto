import type { EditPlan, EditPlanScene } from '@/services/pipeline/types';

export interface ZoomInstruction {
  startTime: number;
  endTime: number;
  scale: number; // 1.0 = normal, 1.2 = 20% zoom
  focusX: number; // 0-1, horizontal focus point
  focusY: number; // 0-1, vertical focus point
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/**
 * Generate zoom instructions based on the edit plan and zoom settings.
 * Each scene can have a zoom suggestion; this function translates
 * those into timed zoom instructions for the renderer.
 */
export function generateZoomInstructions(
  editPlan: EditPlan,
  enabled: boolean
): ZoomInstruction[] {
  if (!enabled) return [];

  const instructions: ZoomInstruction[] = [];

  for (const scene of editPlan.scenes) {
    const duration = scene.endTime - scene.startTime;
    if (duration <= 0) continue;

    const zoom = resolveZoom(scene, editPlan.pace);
    if (!zoom) continue;

    instructions.push({
      startTime: scene.startTime,
      endTime: scene.endTime,
      scale: zoom.scale,
      focusX: zoom.focusX,
      focusY: zoom.focusY,
      easing: zoom.easing,
    });
  }

  // Fill gaps between zooms with subtle drift
  const filled = fillGaps(instructions, editPlan);

  return filled;
}

interface ZoomParams {
  scale: number;
  focusX: number;
  focusY: number;
  easing: ZoomInstruction['easing'];
}

/**
 * Determine zoom parameters for a scene based on its type and emphasis.
 */
function resolveZoom(
  scene: EditPlanScene,
  pace: string
): ZoomParams | null {
  const baseFocusX = 0.5;
  const baseFocusY = 0.4; // Slightly above center (face area for talking heads)

  // Honor the scene's zoom suggestion
  if (scene.zoomSuggestion === 'none') return null;

  // Determine scale based on scene type and emphasis
  const typeScales: Record<string, number> = {
    hook: 1.15,
    problem: 1.1,
    solution: 1.05,
    benefit: 1.12,
    proof: 1.08,
    cta: 1.2,
    narration: 1.03,
    title: 1.0,
    transition: 1.0,
  };

  let scale = typeScales[scene.type] ?? 1.05;

  // Adjust by emphasis
  scale = 1 + (scale - 1) * scene.emphasis;

  // Adjust by pace
  if (pace === 'aggressive' || pace === 'fast') {
    scale = 1 + (scale - 1) * 1.3; // Amplify zoom
  } else if (pace === 'slow') {
    scale = 1 + (scale - 1) * 0.6; // Reduce zoom
  }

  // Clamp scale
  scale = Math.max(1.0, Math.min(scale, 1.4));

  // If the resulting zoom is negligible, skip
  if (scale < 1.02) return null;

  // Determine direction
  if (scene.zoomSuggestion === 'out') {
    // Zoom out: start zoomed, end normal
    // We represent this as starting at scale and easing out
    return {
      scale,
      focusX: baseFocusX,
      focusY: baseFocusY,
      easing: 'easeOut',
    };
  }

  // Default: zoom in
  // Vary focus point slightly based on scene type for visual interest
  let focusX = baseFocusX;
  let focusY = baseFocusY;

  if (scene.type === 'cta') {
    focusY = 0.5; // Center for CTA
  } else if (scene.type === 'hook') {
    focusY = 0.35; // Upper area for hook (face)
  }

  // Choose easing based on scene type
  let easing: ZoomInstruction['easing'] = 'easeInOut';
  if (scene.type === 'hook' || scene.type === 'cta') {
    easing = 'easeIn'; // Quick zoom for impact
  } else if (scene.type === 'narration') {
    easing = 'linear'; // Smooth subtle zoom for narration
  }

  return { scale, focusX, focusY, easing };
}

/**
 * Fill gaps between zoom instructions with very subtle drift zooms
 * to avoid static-looking segments.
 */
function fillGaps(
  instructions: ZoomInstruction[],
  editPlan: EditPlan
): ZoomInstruction[] {
  if (instructions.length === 0) return instructions;

  const sorted = [...instructions].sort(
    (a, b) => a.startTime - b.startTime
  );
  const result: ZoomInstruction[] = [];

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);

    // Check gap to next instruction
    if (i < sorted.length - 1) {
      const gapStart = sorted[i].endTime;
      const gapEnd = sorted[i + 1].startTime;
      const gapDuration = gapEnd - gapStart;

      // Only fill gaps longer than 2 seconds
      if (gapDuration > 2) {
        result.push({
          startTime: gapStart,
          endTime: gapEnd,
          scale: 1.02, // Very subtle
          focusX: 0.5,
          focusY: 0.45,
          easing: 'linear',
        });
      }
    }
  }

  return result;
}
