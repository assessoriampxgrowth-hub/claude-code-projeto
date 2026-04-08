import type { EditPlan, EditPlanScene } from '@/services/pipeline/types';

export interface CutSegment {
  start: number;
  end: number;
  type: 'speech' | 'scene' | 'transition' | 'emphasis';
}

export interface CutList {
  segments: CutSegment[];
  totalDuration: number;
}

/**
 * Generate a final cut list by combining the edit plan with silence detection results.
 *
 * @param editPlan - The AI-generated edit plan with scene info
 * @param silences - Detected silence segments to remove
 * @param videoDuration - Total video duration in seconds
 * @param aggressiveness - Cut aggressiveness 0-1 (from preset)
 */
export function generateCutList(
  editPlan: EditPlan,
  silences: { start: number; end: number }[],
  videoDuration: number,
  aggressiveness: number
): CutList {
  // Step 1: Build speech segments (non-silent parts)
  const speechSegments = invertSilences(silences, videoDuration);

  // Step 2: If aggressiveness is high, tighten the speech segments
  const tightenedSegments = tightenSegments(speechSegments, aggressiveness);

  // Step 3: Overlay scene emphasis data - prioritize high-emphasis scenes
  const emphasizedSegments = applySceneEmphasis(
    tightenedSegments,
    editPlan.scenes,
    aggressiveness
  );

  // Step 4: Apply pace-based trimming
  const pacedSegments = applyPacing(
    emphasizedSegments,
    editPlan.pace,
    aggressiveness
  );

  // Step 5: Remove very short segments that would look jarring
  const minSegmentDuration = 0.3 + (1 - aggressiveness) * 0.7; // 0.3s-1.0s min
  const filtered = pacedSegments.filter(
    (s) => s.end - s.start >= minSegmentDuration
  );

  // Step 6: Ensure segments don't exceed video duration
  const clamped = filtered.map((s) => ({
    ...s,
    start: Math.max(0, s.start),
    end: Math.min(s.end, videoDuration),
  }));

  const totalDuration = clamped.reduce(
    (acc, s) => acc + (s.end - s.start),
    0
  );

  return { segments: clamped, totalDuration };
}

/**
 * Invert silence segments to get speech segments.
 */
function invertSilences(
  silences: { start: number; end: number }[],
  duration: number
): CutSegment[] {
  if (silences.length === 0) {
    return [{ start: 0, end: duration, type: 'speech' }];
  }

  const segments: CutSegment[] = [];
  const sorted = [...silences].sort((a, b) => a.start - b.start);

  // Before first silence
  if (sorted[0].start > 0.05) {
    segments.push({ start: 0, end: sorted[0].start, type: 'speech' });
  }

  // Between silences
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    if (gapEnd - gapStart > 0.05) {
      segments.push({ start: gapStart, end: gapEnd, type: 'speech' });
    }
  }

  // After last silence
  const lastEnd = sorted[sorted.length - 1].end;
  if (duration - lastEnd > 0.05) {
    segments.push({ start: lastEnd, end: duration, type: 'speech' });
  }

  return segments;
}

/**
 * Tighten segments by trimming padding based on aggressiveness.
 * Higher aggressiveness = tighter cuts, less breathing room.
 */
function tightenSegments(
  segments: CutSegment[],
  aggressiveness: number
): CutSegment[] {
  // At aggressiveness 0, keep original. At 1, trim up to 200ms from each end.
  const trimAmount = aggressiveness * 0.2;

  return segments.map((s) => {
    const duration = s.end - s.start;
    // Only trim if segment is long enough
    if (duration < 0.5) return s;

    const maxTrim = Math.min(trimAmount, duration * 0.1);
    return {
      ...s,
      start: s.start + maxTrim,
      end: s.end - maxTrim,
    };
  });
}

/**
 * Emphasize or extend segments that overlap with high-emphasis scenes.
 */
function applySceneEmphasis(
  segments: CutSegment[],
  scenes: EditPlanScene[],
  aggressiveness: number
): CutSegment[] {
  if (scenes.length === 0) return segments;

  return segments.map((seg) => {
    // Find overlapping scenes
    const overlapping = scenes.filter(
      (scene) => scene.startTime < seg.end && scene.endTime > seg.start
    );

    if (overlapping.length === 0) {
      // No scene overlap - if aggressiveness is high, potentially skip
      if (aggressiveness > 0.8 && seg.end - seg.start < 1.0) {
        return { ...seg, type: 'transition' as const };
      }
      return seg;
    }

    // Mark high-emphasis segments
    const maxEmphasis = Math.max(...overlapping.map((s) => s.emphasis));
    if (maxEmphasis > 0.7) {
      return { ...seg, type: 'emphasis' as const };
    }

    return seg;
  });
}

/**
 * Apply pacing rules based on the target pace.
 */
function applyPacing(
  segments: CutSegment[],
  pace: 'slow' | 'medium' | 'fast' | 'aggressive',
  aggressiveness: number
): CutSegment[] {
  // Maximum segment duration before we consider splitting
  const maxDurations: Record<string, number> = {
    slow: 15,
    medium: 10,
    fast: 6,
    aggressive: 4,
  };

  const maxDuration = maxDurations[pace] ?? 10;

  const result: CutSegment[] = [];
  for (const seg of segments) {
    const duration = seg.end - seg.start;

    if (duration <= maxDuration || seg.type === 'emphasis') {
      result.push(seg);
    } else {
      // Split long segments
      const numParts = Math.ceil(duration / maxDuration);
      const partDuration = duration / numParts;
      for (let i = 0; i < numParts; i++) {
        result.push({
          start: seg.start + i * partDuration,
          end: seg.start + (i + 1) * partDuration,
          type: seg.type,
        });
      }
    }
  }

  return result;
}
