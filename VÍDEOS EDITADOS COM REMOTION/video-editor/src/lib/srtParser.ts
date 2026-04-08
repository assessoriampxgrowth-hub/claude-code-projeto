import type { SrtEntry } from '@/types';

export function parseSrt(srt: string): SrtEntry[] {
  const blocks = srt.trim().split(/\n\n+/);
  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    const index = parseInt(lines[0], 10);
    const [start, end] = lines[1].split(' --> ');
    const text = lines.slice(2).join(' ').trim();
    return {
      index,
      start,
      end,
      text,
      startSeconds: srtTimeToSeconds(start),
      endSeconds: srtTimeToSeconds(end),
    };
  }).filter((e) => !isNaN(e.index));
}

function srtTimeToSeconds(time: string): number {
  const [h, m, sMs] = time.split(':');
  const [s, ms] = sMs.replace(',', '.').split('.');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000;
}

export function convertScenesFromLegendaIndex(
  scenes: { startLeg: number; endLeg: number }[],
  legendas: { startSeconds: number; endSeconds: number }[],
  fps: number
) {
  return scenes.map((scene) => {
    const startEntry = legendas[scene.startLeg] ?? legendas[0];
    const endEntry = legendas[scene.endLeg] ?? legendas[legendas.length - 1];
    return {
      startFrame: Math.floor(startEntry.startSeconds * fps),
      durationFrames: Math.max(30, Math.floor((endEntry.endSeconds - startEntry.startSeconds) * fps)),
    };
  });
}
