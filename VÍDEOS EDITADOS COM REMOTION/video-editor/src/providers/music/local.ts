import fs from 'fs';
import path from 'path';
import { ProviderInfo } from '../types';
import { MusicProvider, MusicTrack } from './interface';

/**
 * Known mood keywords and their synonyms for fuzzy matching.
 */
const MOOD_SYNONYMS: Record<string, string[]> = {
  motivational: ['motivation', 'inspiring', 'uplifting', 'empowering', 'epic'],
  calm: ['relaxing', 'peaceful', 'ambient', 'chill', 'soft', 'gentle'],
  energetic: ['energy', 'hype', 'pump', 'workout', 'intense', 'power'],
  happy: ['fun', 'cheerful', 'joyful', 'bright', 'positive'],
  sad: ['melancholy', 'emotional', 'dramatic', 'somber'],
  cinematic: ['cinema', 'trailer', 'film', 'movie', 'orchestral'],
  corporate: ['business', 'professional', 'clean', 'modern'],
  lofi: ['lo-fi', 'study', 'beats', 'hip-hop'],
  aggressive: ['dark', 'trap', 'bass', 'edgy', 'urban'],
};

/**
 * Estimates track duration by reading the file size and assuming
 * an average bitrate of 192kbps for MP3.
 * This avoids requiring ffprobe just for duration estimation.
 */
function estimateDuration(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeBytes = stats.size;
    const avgBitrate = 192000; // 192kbps in bits per second
    return (fileSizeBytes * 8) / avgBitrate;
  } catch {
    return 0;
  }
}

/**
 * Parses mood and name from a filename like "motivational-track1.mp3"
 * or "calm_ambient_music.mp3".
 */
function parseFilename(filename: string): { mood: string; name: string } {
  const base = path.basename(filename, path.extname(filename));
  const parts = base.split(/[-_]/);
  const mood = parts[0]?.toLowerCase() ?? 'unknown';
  const name = base.replace(/[-_]/g, ' ');
  return { mood, name };
}

/**
 * Computes a similarity score between a requested mood and a track mood.
 * Returns a value between 0 and 1.
 */
function moodSimilarity(requested: string, trackMood: string): number {
  const req = requested.toLowerCase().trim();
  const tm = trackMood.toLowerCase().trim();

  // Exact match
  if (req === tm) return 1.0;

  // Check if one contains the other
  if (req.includes(tm) || tm.includes(req)) return 0.8;

  // Check synonyms
  for (const [canonical, synonyms] of Object.entries(MOOD_SYNONYMS)) {
    const allTerms = [canonical, ...synonyms];
    const reqMatch = allTerms.some((t) => req.includes(t) || t.includes(req));
    const tmMatch = allTerms.some((t) => tm.includes(t) || t.includes(req));
    if (reqMatch && tmMatch) return 0.6;
  }

  return 0.0;
}

export class LocalMusicProvider implements MusicProvider {
  name = 'local-music';
  private musicDir: string;

  constructor(musicDir?: string) {
    this.musicDir = musicDir ?? path.join(process.cwd(), 'public', 'music');
  }

  async validateAvailability(): Promise<ProviderInfo> {
    // Local provider is always "available" — it just might have zero tracks
    return { name: this.name, status: 'available' };
  }

  async listTracks(): Promise<MusicTrack[]> {
    if (!fs.existsSync(this.musicDir)) {
      return [];
    }

    const files = fs.readdirSync(this.musicDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.m4a';
    });

    return files.map((file) => {
      const fullPath = path.join(this.musicDir, file);
      const { mood, name } = parseFilename(file);
      const durationSeconds = estimateDuration(fullPath);

      return {
        path: fullPath,
        name,
        mood,
        durationSeconds,
      };
    });
  }

  async selectTrack(
    mood: string,
    targetDuration: number,
  ): Promise<MusicTrack | null> {
    const tracks = await this.listTracks();

    if (tracks.length === 0) {
      return null;
    }

    // Score each track by mood similarity and duration fit
    const scored = tracks.map((track) => {
      const moodScore = moodSimilarity(mood, track.mood);

      // Prefer tracks that are at least as long as the target duration
      let durationScore: number;
      if (track.durationSeconds >= targetDuration) {
        // Longer is fine, but not excessively so
        const excess = track.durationSeconds - targetDuration;
        durationScore = Math.max(0, 1 - excess / (targetDuration * 2));
      } else {
        // Shorter than target — penalize proportionally
        durationScore = track.durationSeconds / targetDuration;
      }

      const totalScore = moodScore * 0.7 + durationScore * 0.3;
      return { track, totalScore, moodScore };
    });

    // Sort by total score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // If the best match has zero mood similarity and there are tracks,
    // still return the best-duration match
    return scored[0].track;
  }
}
