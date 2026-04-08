import { mixAudio as ffmpegMixAudio } from '@/lib/ffmpeg';
import { AUDIO_DEFAULTS } from '@/config/defaults';

export interface MixOptions {
  /** Background music volume (0-1), default 0.2 */
  musicVolume?: number;
  /** Enable ducking (lower music when voice present), default true */
  duckingEnabled?: boolean;
  /** Ducking amount in dB, default 14 */
  duckAmount?: number;
  /** Fade in music over this many seconds, default 2 */
  fadeInDuration?: number;
  /** Fade out music over this many seconds, default 3 */
  fadeOutDuration?: number;
}

/**
 * Mix voice audio with background music.
 * Applies ducking by default (music volume lowers when voice is present).
 *
 * @param voicePath - Path to the voice/speech audio file
 * @param musicPath - Path to the background music file
 * @param outputPath - Path for the mixed output
 * @param options - Mixing options
 */
export async function mixVoiceAndMusic(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  options?: MixOptions
): Promise<void> {
  const musicVolume = options?.musicVolume ?? AUDIO_DEFAULTS.musicVolume;
  const duckingEnabled =
    options?.duckingEnabled ?? AUDIO_DEFAULTS.duckingEnabled;
  const duckAmount = options?.duckAmount ?? AUDIO_DEFAULTS.duckAmount;

  await ffmpegMixAudio(voicePath, musicPath, outputPath, {
    musicVolume,
    duckingEnabled,
    duckAmount,
  });
}

/**
 * Mix voice audio with background music, with fade in/out on the music track.
 * Uses a more complex filter graph than the basic mix.
 */
export async function mixWithFades(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  voiceDuration: number,
  options?: MixOptions
): Promise<void> {
  const musicVolume = options?.musicVolume ?? AUDIO_DEFAULTS.musicVolume;
  const fadeIn = options?.fadeInDuration ?? 2;
  const fadeOut = options?.fadeOutDuration ?? 3;
  const duckingEnabled =
    options?.duckingEnabled ?? AUDIO_DEFAULTS.duckingEnabled;
  const duckAmount = options?.duckAmount ?? AUDIO_DEFAULTS.duckAmount;

  const ffmpeg = await import('fluent-ffmpeg').then((m) => m.default);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    cmd.input(voicePath);
    cmd.input(musicPath);

    // Build complex filter with fades and optional ducking
    const fadeOutStart = Math.max(0, voiceDuration - fadeOut);

    const filters: string[] = [
      // Format voice
      '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]',
      // Format music, apply volume + fades, and trim to voice duration
      `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVolume},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},atrim=0:${voiceDuration}[music_faded]`,
    ];

    if (duckingEnabled) {
      filters.push(
        `[music_faded][voice]sidechaincompress=threshold=0.02:ratio=6:attack=200:release=1000:knee=${duckAmount}[ducked]`,
        '[voice][ducked]amix=inputs=2:duration=first:dropout_transition=2[out]'
      );
    } else {
      filters.push(
        '[voice][music_faded]amix=inputs=2:duration=first:dropout_transition=2[out]'
      );
    }

    cmd
      .complexFilter(filters)
      .outputOptions(['-map', '[out]'])
      .audioCodec('aac')
      .audioBitrate('192k')
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`mixWithFades failed: ${err.message}`))
      )
      .save(outputPath);
  });
}
