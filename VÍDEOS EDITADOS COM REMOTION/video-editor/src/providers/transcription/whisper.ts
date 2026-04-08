import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { ProviderInfo } from '../types';
import {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionSegment,
  WordTimestamp,
} from './interface';

export class WhisperTranscriptionProvider implements TranscriptionProvider {
  name = 'openai-whisper';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async validateAvailability(): Promise<ProviderInfo> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        name: this.name,
        status: 'unavailable',
        error: 'OPENAI_API_KEY environment variable is not set',
      };
    }

    try {
      // Lightweight check: list models to verify API key validity
      await this.client.models.list();
      return { name: this.name, status: 'available' };
    } catch (err: any) {
      return {
        name: this.name,
        status: 'error',
        error: `OpenAI API error: ${err.message ?? String(err)}`,
      };
    }
  }

  async transcribe(
    audioPath: string,
    options?: { language?: string },
  ): Promise<TranscriptionResult> {
    const resolvedPath = path.resolve(audioPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Audio file not found: ${resolvedPath}`);
    }

    const fileStream = fs.createReadStream(resolvedPath);

    const response = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: fileStream,
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
      ...(options?.language ? { language: options.language } : {}),
    });

    const raw = response as any;

    const segments: TranscriptionSegment[] = (raw.segments ?? []).map(
      (seg: any, idx: number) => {
        const words: WordTimestamp[] = (seg.words ?? []).map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        }));

        return {
          index: idx,
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
          ...(words.length > 0 ? { words } : {}),
        };
      },
    );

    // If segments don't contain words but the top-level response does, attach them
    if (
      segments.length > 0 &&
      !segments[0].words &&
      Array.isArray(raw.words) &&
      raw.words.length > 0
    ) {
      const topLevelWords: WordTimestamp[] = raw.words.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }));

      for (const seg of segments) {
        seg.words = topLevelWords.filter(
          (w) => w.start >= seg.start && w.end <= seg.end,
        );
      }
    }

    const fullText =
      raw.text ?? segments.map((s) => s.text).join(' ');

    return {
      segments,
      fullText,
      language: raw.language ?? undefined,
      duration: raw.duration ?? undefined,
    };
  }
}
