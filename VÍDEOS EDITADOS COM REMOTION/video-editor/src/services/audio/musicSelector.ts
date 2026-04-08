import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

export interface MusicTrack {
  name: string;
  path: string;
  mood: string;
  bpm?: number;
  durationSeconds?: number;
}

/** Moods mapped to subdirectory names in the music library */
const MOOD_DIRECTORIES: Record<string, string[]> = {
  energetic: ['energetic', 'upbeat', 'hype'],
  calm: ['calm', 'ambient', 'chill'],
  cinematic: ['cinematic', 'epic', 'dramatic'],
  inspiring: ['inspiring', 'motivational', 'uplifting'],
  corporate: ['corporate', 'professional', 'business'],
  playful: ['playful', 'fun', 'quirky'],
};

/** Fallback moods to try if the requested mood has no tracks */
const MOOD_FALLBACKS: Record<string, string[]> = {
  energetic: ['inspiring', 'cinematic'],
  calm: ['corporate', 'cinematic'],
  cinematic: ['inspiring', 'calm'],
  inspiring: ['cinematic', 'energetic'],
  corporate: ['calm', 'cinematic'],
  playful: ['energetic', 'inspiring'],
};

/**
 * Music library root directory.
 * Expected structure: music/[mood]/track.mp3
 */
function getMusicLibraryDir(): string {
  return path.join(process.cwd(), 'music');
}

/**
 * Select a music track based on the desired mood.
 * Searches the local music library for matching tracks.
 *
 * @param mood - Desired mood (e.g. 'energetic', 'calm', 'cinematic')
 * @param preferredBpm - Optional preferred BPM range
 * @returns Selected track info, or null if no music available
 */
export async function selectMusic(
  mood: string,
  preferredBpm?: { min: number; max: number }
): Promise<MusicTrack | null> {
  const libraryDir = getMusicLibraryDir();

  if (!existsSync(libraryDir)) {
    console.warn(
      `Music library not found at ${libraryDir}. Create it with mood subdirectories.`
    );
    return null;
  }

  // Try to find tracks matching the mood
  const track = await findTrackForMood(libraryDir, mood);
  if (track) return track;

  // Try fallback moods
  const fallbacks = MOOD_FALLBACKS[mood] ?? [];
  for (const fallbackMood of fallbacks) {
    const fallbackTrack = await findTrackForMood(
      libraryDir,
      fallbackMood
    );
    if (fallbackTrack) return fallbackTrack;
  }

  // Last resort: pick any track from any directory
  return findAnyTrack(libraryDir);
}

/**
 * Find a random track matching the specified mood.
 */
async function findTrackForMood(
  libraryDir: string,
  mood: string
): Promise<MusicTrack | null> {
  // Check all possible directory names for this mood
  const dirNames = MOOD_DIRECTORIES[mood] ?? [mood];

  for (const dirName of dirNames) {
    const moodDir = path.join(libraryDir, dirName);
    if (!existsSync(moodDir)) continue;

    const files = await readdir(moodDir);
    const audioFiles = files.filter((f) =>
      /\.(mp3|wav|aac|m4a|ogg)$/i.test(f)
    );

    if (audioFiles.length === 0) continue;

    // Pick a random track
    const chosen =
      audioFiles[Math.floor(Math.random() * audioFiles.length)];
    return {
      name: chosen.replace(/\.[^.]+$/, ''),
      path: path.join(moodDir, chosen),
      mood,
    };
  }

  return null;
}

/**
 * Find any available track in the music library.
 */
async function findAnyTrack(
  libraryDir: string
): Promise<MusicTrack | null> {
  const entries = await readdir(libraryDir);

  for (const entry of entries) {
    const subDir = path.join(libraryDir, entry);
    try {
      const files = await readdir(subDir);
      const audioFiles = files.filter((f) =>
        /\.(mp3|wav|aac|m4a|ogg)$/i.test(f)
      );
      if (audioFiles.length > 0) {
        const chosen =
          audioFiles[Math.floor(Math.random() * audioFiles.length)];
        return {
          name: chosen.replace(/\.[^.]+$/, ''),
          path: path.join(subDir, chosen),
          mood: entry,
        };
      }
    } catch {
      // Not a directory, skip
    }
  }

  // Check root-level audio files
  const rootAudio = entries.filter((f) =>
    /\.(mp3|wav|aac|m4a|ogg)$/i.test(f)
  );
  if (rootAudio.length > 0) {
    const chosen =
      rootAudio[Math.floor(Math.random() * rootAudio.length)];
    return {
      name: chosen.replace(/\.[^.]+$/, ''),
      path: path.join(libraryDir, chosen),
      mood: 'unknown',
    };
  }

  return null;
}

/**
 * Get a list of available moods in the music library.
 */
export async function getAvailableMoods(): Promise<string[]> {
  const libraryDir = getMusicLibraryDir();
  if (!existsSync(libraryDir)) return [];

  const entries = await readdir(libraryDir);
  const moods: string[] = [];

  for (const entry of entries) {
    const subDir = path.join(libraryDir, entry);
    try {
      const files = await readdir(subDir);
      const hasAudio = files.some((f) =>
        /\.(mp3|wav|aac|m4a|ogg)$/i.test(f)
      );
      if (hasAudio) moods.push(entry);
    } catch {
      // Not a directory
    }
  }

  return moods;
}
