import { ProviderInfo } from '../types';

export interface MusicTrack {
  path: string;
  name: string;
  mood: string;
  durationSeconds: number;
  bpm?: number;
}

export interface MusicProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  selectTrack(mood: string, targetDuration: number): Promise<MusicTrack | null>;
  listTracks(): Promise<MusicTrack[]>;
}
