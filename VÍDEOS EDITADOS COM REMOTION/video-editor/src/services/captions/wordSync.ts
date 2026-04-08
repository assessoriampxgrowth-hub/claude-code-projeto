import type { TranscriptionSegment } from '@/services/pipeline/types';
import type { CaptionStyle } from './styles';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface WordLine {
  words: WordTiming[];
  start: number;
  end: number;
  text: string;
}

/**
 * Split transcription segments into word-level timing blocks
 * with smart line breaking based on the caption style's maxWordsPerLine.
 */
export function splitIntoWordLines(
  segments: TranscriptionSegment[],
  maxWordsPerLine: number
): WordLine[] {
  // First, extract all words with timing
  const allWords = extractWords(segments);
  if (allWords.length === 0) return [];

  // Group words into lines respecting max words per line
  const lines: WordLine[] = [];
  let currentWords: WordTiming[] = [];

  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    currentWords.push(word);

    const shouldBreak =
      currentWords.length >= maxWordsPerLine ||
      // Break at natural punctuation
      isPunctBreak(word.word) ||
      // Break if there's a significant pause before the next word
      (i < allWords.length - 1 &&
        allWords[i + 1].start - word.end > 0.5);

    if (shouldBreak || i === allWords.length - 1) {
      if (currentWords.length > 0) {
        lines.push({
          words: [...currentWords],
          start: currentWords[0].start,
          end: currentWords[currentWords.length - 1].end,
          text: currentWords.map((w) => w.word).join(' '),
        });
        currentWords = [];
      }
    }
  }

  return lines;
}

/**
 * Extract individual word timings from transcription segments.
 * If segments have word-level timing, use that.
 * Otherwise, estimate word timings by evenly distributing within the segment.
 */
function extractWords(segments: TranscriptionSegment[]): WordTiming[] {
  const words: WordTiming[] = [];

  for (const segment of segments) {
    if (segment.words && segment.words.length > 0) {
      // Use existing word-level timing
      for (const w of segment.words) {
        words.push({
          word: cleanWord(w.word),
          start: w.start,
          end: w.end,
        });
      }
    } else {
      // Estimate word timings from segment timing
      const segWords = segment.text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (segWords.length === 0) continue;

      const segDuration = segment.end - segment.start;
      const wordDuration = segDuration / segWords.length;

      for (let i = 0; i < segWords.length; i++) {
        words.push({
          word: cleanWord(segWords[i]),
          start: segment.start + i * wordDuration,
          end: segment.start + (i + 1) * wordDuration,
        });
      }
    }
  }

  return words;
}

/**
 * Clean a word for display: trim whitespace but preserve punctuation.
 */
function cleanWord(word: string): string {
  return word.trim();
}

/**
 * Check if a word ends with punctuation that suggests a line break.
 */
function isPunctBreak(word: string): boolean {
  return /[.!?;:]$/.test(word);
}

/**
 * Estimate the display duration needed for a word based on its length.
 * Used as a minimum display time to ensure readability.
 */
export function estimateWordDisplayMs(word: string): number {
  const baseMs = 200;
  const perCharMs = 30;
  return baseMs + word.length * perCharMs;
}
