import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { EffectsConfig, ColorGradingPreset } from './types';
import { DEFAULT_EFFECTS } from './types';

interface Props {
  effects?: EffectsConfig;
  children: React.ReactNode;
}

// Color grading presets → CSS filter values
const COLOR_PRESETS: Record<
  ColorGradingPreset,
  { brightness: number; contrast: number; saturate: number; sepia: number; hueRotate: number }
> = {
  none: { brightness: 1, contrast: 1, saturate: 1, sepia: 0, hueRotate: 0 },
  warm: { brightness: 1.05, contrast: 1.05, saturate: 1.2, sepia: 0.15, hueRotate: -5 },
  cool: { brightness: 1.0, contrast: 1.1, saturate: 0.9, sepia: 0, hueRotate: 10 },
  vintage: { brightness: 0.95, contrast: 1.15, saturate: 0.7, sepia: 0.3, hueRotate: -10 },
  cinematic: { brightness: 0.92, contrast: 1.2, saturate: 0.85, sepia: 0.05, hueRotate: 0 },
  dramatic: { brightness: 0.85, contrast: 1.35, saturate: 1.1, sepia: 0, hueRotate: 0 },
  desaturated: { brightness: 1, contrast: 1.1, saturate: 0.4, sepia: 0, hueRotate: 0 },
  vivid: { brightness: 1.05, contrast: 1.1, saturate: 1.5, sepia: 0, hueRotate: 0 },
};

export const EffectsLayer: React.FC<Props> = ({ effects: rawEffects, children }) => {
  const effects = rawEffects || DEFAULT_EFFECTS;

  // Build CSS filter from color grading
  const preset = COLOR_PRESETS[effects.colorGrading] || COLOR_PRESETS.none;
  const filterParts: string[] = [];
  if (preset.brightness !== 1) filterParts.push(`brightness(${preset.brightness})`);
  if (preset.contrast !== 1) filterParts.push(`contrast(${preset.contrast})`);
  if (preset.saturate !== 1) filterParts.push(`saturate(${preset.saturate})`);
  if (preset.sepia > 0) filterParts.push(`sepia(${preset.sepia})`);
  if (preset.hueRotate !== 0) filterParts.push(`hue-rotate(${preset.hueRotate}deg)`);
  const filter = filterParts.length > 0 ? filterParts.join(' ') : undefined;

  return (
    <>
      {/* Video content with color grading */}
      <AbsoluteFill style={{ filter }}>
        {children}
      </AbsoluteFill>

      {/* Vignette overlay */}
      {effects.vignette && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${effects.vignetteIntensity}) 100%)`,
          }}
        />
      )}

      {/* Letterbox cinematic bars */}
      {effects.letterbox && <LetterboxBars ratio={effects.letterboxRatio} />}
    </>
  );
};

// ─── Letterbox Bars ───

const LetterboxBars: React.FC<{ ratio: number }> = ({ ratio }) => {
  // Calculate bar height based on target ratio vs 9:16 (0.5625)
  // For a 2.35:1 crop in a 9:16 frame: bars are large
  const sourceRatio = 9 / 16; // 0.5625
  const targetRatio = 1 / ratio; // e.g. 1/2.35 = 0.4255

  if (targetRatio >= sourceRatio) return null; // No bars needed

  const barPercent = ((1 - targetRatio / sourceRatio) / 2) * 100;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${barPercent}%`,
          backgroundColor: '#000',
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${barPercent}%`,
          backgroundColor: '#000',
          zIndex: 10,
        }}
      />
    </>
  );
};
