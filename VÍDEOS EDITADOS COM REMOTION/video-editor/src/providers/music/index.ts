import { MusicProvider } from './interface';
import { LocalMusicProvider } from './local';

/**
 * Returns the local music provider. Always available (may have zero tracks).
 */
export async function getMusicProvider(): Promise<MusicProvider> {
  return new LocalMusicProvider();
}

export { LocalMusicProvider } from './local';
export type { MusicProvider, MusicTrack } from './interface';
