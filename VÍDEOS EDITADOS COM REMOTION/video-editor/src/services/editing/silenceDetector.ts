import { detectSilences } from '@/lib/ffmpeg';
import { SILENCE_DEFAULTS } from '@/config/defaults';

export interface SilenceDetectionResult {
  /** Segments of audio to keep (non-silent) */
  keep: { start: number; end: number }[];
  /** Segments of audio that were removed (silent) */
  removed: { start: number; end: number }[];
  /** Total duration of removed silence in seconds */
  totalRemoved: number;
}

/**
 * Detect silences in an audio file and return segments to keep vs remove.
 * Inverts silence periods into "keep" segments with optional padding.
 */
export async function detectAndRemoveSilences(
  audioPath: string,
  options?: {
    threshold?: string;
    minSilenceDuration?: number;
    paddingMs?: number;
  }
): Promise<SilenceDetectionResult> {
  const threshold = options?.threshold ?? SILENCE_DEFAULTS.threshold;
  const minSilenceDuration =
    options?.minSilenceDuration ?? SILENCE_DEFAULTS.minDuration;
  const paddingMs = options?.paddingMs ?? SILENCE_DEFAULTS.paddingMs;
  const paddingSec = paddingMs / 1000;

  // Detect silences using ffmpeg
  const silences = await detectSilences(audioPath, {
    threshold,
    minDuration: minSilenceDuration,
  });

  if (silences.length === 0) {
    // No silences found - keep everything
    return {
      keep: [],
      removed: [],
      totalRemoved: 0,
    };
  }

  // Invert silences to get "keep" segments
  // Add padding around speech segments
  const keep: { start: number; end: number }[] = [];

  // Before first silence
  if (silences[0].start > 0) {
    keep.push({
      start: 0,
      end: Math.min(
        silences[0].start + paddingSec,
        silences[0].end
      ),
    });
  }

  // Between silences
  for (let i = 0; i < silences.length - 1; i++) {
    const currentEnd = silences[i].end;
    const nextStart = silences[i + 1].start;

    if (nextStart > currentEnd) {
      keep.push({
        start: Math.max(0, currentEnd - paddingSec),
        end: nextStart + paddingSec,
      });
    }
  }

  // After last silence (need total duration, but we approximate with a large number)
  const lastSilence = silences[silences.length - 1];
  keep.push({
    start: Math.max(0, lastSilence.end - paddingSec),
    end: Number.MAX_SAFE_INTEGER, // Will be clamped by actual duration
  });

  // Merge overlapping keep segments
  const merged = mergeSegments(keep);

  // Calculate total removed duration
  const totalRemoved = silences.reduce(
    (acc, s) => acc + (s.end - s.start),
    0
  );

  return {
    keep: merged,
    removed: silences,
    totalRemoved,
  };
}

/**
 * Merge overlapping or adjacent segments into contiguous blocks.
 */
function mergeSegments(
  segments: { start: number; end: number }[]
): { start: number; end: number }[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.start <= last.end) {
      // Overlapping or adjacent - extend the current merged segment
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Clamp keep segments to the actual video duration.
 */
export function clampSegments(
  segments: { start: number; end: number }[],
  duration: number
): { start: number; end: number }[] {
  return segments
    .map((s) => ({
      start: Math.max(0, Math.min(s.start, duration)),
      end: Math.min(s.end, duration),
    }))
    .filter((s) => s.end > s.start);
}
