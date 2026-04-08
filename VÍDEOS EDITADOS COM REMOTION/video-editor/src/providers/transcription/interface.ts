import { ProviderInfo } from '../types';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionSegment {
  index: number;
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  fullText: string;
  language?: string;
  duration?: number;
}

export interface TranscriptionProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  transcribe(audioPath: string, options?: { language?: string }): Promise<TranscriptionResult>;
}
