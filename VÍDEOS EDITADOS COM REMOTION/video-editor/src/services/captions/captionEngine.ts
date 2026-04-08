import { v4 as uuidv4 } from 'uuid';
import type { TranscriptionSegment } from '@/services/pipeline/types';
import type { CaptionStyle } from './styles';
import { splitIntoWordLines } from './wordSync';
import { CAPTION_DEFAULTS } from '@/config/defaults';

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  isHighlight: boolean;
}

export interface CaptionBlock {
  id: string;
  startTime: number;
  endTime: number;
  words: CaptionWord[];
  text: string;
  style: CaptionStyle;
}

/**
 * Generate caption blocks from transcription segments.
 * Splits text into word-level timed blocks ready for Remotion rendering.
 *
 * @param segments - Transcription segments with timing
 * @param style - Caption style preset
 * @param highlights - Keywords to highlight (e.g. action words)
 */
export function generateCaptionBlocks(
  segments: TranscriptionSegment[],
  style: CaptionStyle,
  highlights?: string[]
): CaptionBlock[] {
  const highlightSet = buildHighlightSet(highlights);

  // Split into word-timed lines
  const wordLines = splitIntoWordLines(segments, style.maxWordsPerLine);

  // Convert each word line into a caption block
  const blocks: CaptionBlock[] = wordLines.map((line) => {
    const words: CaptionWord[] = line.words.map((w) => ({
      word: style.uppercase ? w.word.toUpperCase() : w.word,
      start: w.start,
      end: w.end,
      isHighlight: isHighlightWord(w.word, highlightSet),
    }));

    const text = words.map((w) => w.word).join(' ');

    return {
      id: uuidv4(),
      startTime: line.start,
      endTime: line.end,
      words,
      text,
      style,
    };
  });

  // Post-process: ensure minimum display time
  return ensureMinDisplayTime(blocks);
}

/**
 * Build a Set of lowercase highlight words for fast lookup.
 */
function buildHighlightSet(highlights?: string[]): Set<string> {
  const defaultHighlights = CAPTION_DEFAULTS.defaultHighlightKeywords;
  const combined = [...defaultHighlights, ...(highlights ?? [])];
  return new Set(combined.map((w) => w.toLowerCase()));
}

/**
 * Check if a word should be highlighted.
 * Strips punctuation for matching.
 */
function isHighlightWord(word: string, highlightSet: Set<string>): boolean {
  const cleaned = word
    .toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ]/g, '');
  return highlightSet.has(cleaned);
}

/**
 * Ensure each caption block is displayed for at least a minimum duration
 * so it's readable. Extends endTime if needed (without overlapping the next block).
 */
function ensureMinDisplayTime(blocks: CaptionBlock[]): CaptionBlock[] {
  const minDisplaySec = CAPTION_DEFAULTS.minWordDurationMs / 1000;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const displayTime = block.endTime - block.startTime;

    // Minimum display time based on number of words
    const requiredTime = Math.max(
      minDisplaySec * block.words.length,
      0.5 // At least 500ms per block
    );

    if (displayTime < requiredTime) {
      // Extend endTime, but don't overlap next block
      const maxEnd =
        i < blocks.length - 1 ? blocks[i + 1].startTime : Infinity;
      block.endTime = Math.min(
        block.startTime + requiredTime,
        maxEnd
      );
    }
  }

  return blocks;
}

/**
 * Generate SRT subtitle content from caption blocks.
 */
export function captionBlocksToSrt(blocks: CaptionBlock[]): string {
  return blocks
    .map((block, index) => {
      const startSrt = secondsToSrtTime(block.startTime);
      const endSrt = secondsToSrtTime(block.endTime);
      return `${index + 1}\n${startSrt} --> ${endSrt}\n${block.text}`;
    })
    .join('\n\n');
}

/**
 * Generate VTT subtitle content from caption blocks.
 */
export function captionBlocksToVtt(blocks: CaptionBlock[]): string {
  const header = 'WEBVTT\n\n';
  const cues = blocks
    .map((block) => {
      const startVtt = secondsToVttTime(block.startTime);
      const endVtt = secondsToVttTime(block.endTime);
      return `${startVtt} --> ${endVtt}\n${block.text}`;
    })
    .join('\n\n');
  return header + cues;
}

function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

function secondsToVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}
