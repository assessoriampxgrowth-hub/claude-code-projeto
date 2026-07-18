import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath as string);

export interface SfxPlacement {
  time: number; // seconds
  file: string; // absolute path to sfx audio
  volumeDb: number; // negative dB, e.g. -18
}

const SFX_DIR = path.join(process.cwd(), 'public', 'sfx');
const SFX_ASSETS_DIR = path.join(process.cwd(), 'assets', 'sfx');

/**
 * Resolve an SFX type name to a local file, checking public/sfx then
 * assets/sfx. Tries .mp3 and .wav. Returns null if not found.
 */
export function resolveSfxFile(type: string): string | null {
  for (const dir of [SFX_DIR, SFX_ASSETS_DIR]) {
    for (const ext of ['mp3', 'wav']) {
      const p = path.join(dir, `${type}.${ext}`);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Build SFX placements from context-aware cues (SfxDecisionEngine output).
 * Cues whose SFX file is missing are silently skipped.
 */
export function buildCueSfx(
  cues: { time: number; type: string; volumeDb: number }[]
): SfxPlacement[] {
  const out: SfxPlacement[] = [];
  for (const c of cues) {
    const file = resolveSfxFile(c.type);
    if (file) out.push({ time: c.time, file, volumeDb: c.volumeDb });
  }
  return out;
}

/**
 * Build SFX placements for the MPX preset:
 *  - impact.mp3 on the hook (first scene)
 *  - cut.mp3 on every other scene boundary
 * Only includes placements whose audio file actually exists, so the pipeline
 * gracefully no-ops when the user hasn't added SFX files yet.
 */
export function buildSceneSfx(sceneStartTimes: number[]): SfxPlacement[] {
  const impact = path.join(SFX_DIR, 'impact.mp3');
  const cut = path.join(SFX_DIR, 'cut.mp3');
  const placements: SfxPlacement[] = [];

  sceneStartTimes.forEach((time, i) => {
    if (time <= 0.05) return; // skip SFX exactly at 0
    if (i === 0) {
      if (existsSync(impact)) placements.push({ time, file: impact, volumeDb: -17 });
      else if (existsSync(cut)) placements.push({ time, file: cut, volumeDb: -19 });
    } else if (existsSync(cut)) {
      placements.push({ time, file: cut, volumeDb: -19 });
    }
  });

  return placements;
}

/**
 * Overlay SFX onto a voice/music track. The voice stays at full level
 * (amix normalize=0) and each SFX is delayed to its timestamp and attenuated.
 * Returns true if SFX were applied, false if there was nothing to do.
 */
export async function mixSfx(
  basePath: string,
  outputPath: string,
  placements: SfxPlacement[]
): Promise<boolean> {
  if (placements.length === 0) return false;

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(basePath);
    placements.forEach((p) => cmd.input(p.file));

    const filters: string[] = [];
    const mixLabels: string[] = ['[0:a]'];

    placements.forEach((p, i) => {
      const delayMs = Math.max(0, Math.round(p.time * 1000));
      const gain = Math.pow(10, p.volumeDb / 20);
      filters.push(
        `[${i + 1}:a]adelay=${delayMs}|${delayMs},volume=${gain.toFixed(3)}[sfx${i}]`
      );
      mixLabels.push(`[sfx${i}]`);
    });

    // normalize=0 keeps the voice at its original loudness
    filters.push(
      `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:normalize=0[out]`
    );

    cmd
      .complexFilter(filters, 'out')
      .outputOptions(['-c:a aac', '-b:a 192k'])
      .on('end', () => resolve(true))
      .on('error', (err: Error) =>
        reject(new Error(`mixSfx failed: ${err.message}`))
      )
      .save(outputPath);
  });
}
