import { ProviderInfo } from '../types';

export interface VoiceOptions {
  voiceId?: string;
  speed?: number;
  language?: string;
}

export interface VoiceSynthesisResult {
  audioPath: string;
  durationSeconds: number;
}

export interface VoiceProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  synthesizeVoice(
    text: string,
    outputPath: string,
    options?: VoiceOptions,
  ): Promise<VoiceSynthesisResult>;
  listVoices(): Promise<{ id: string; name: string; language: string }[]>;
}
