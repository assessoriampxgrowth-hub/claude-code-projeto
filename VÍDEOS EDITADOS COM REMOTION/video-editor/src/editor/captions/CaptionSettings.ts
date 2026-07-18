import type { CaptionStyle } from '@/services/captions/styles';

/** Configuração de legenda editável pelo usuário. */
export interface CaptionSettings {
  fontFamily: string;
  fallbackFonts: string[];
  fontSize: number;
  primaryColor: string;
  accentColor: string;
  strokeColor: string;
  strokeWidth: number;
  position: 'lower-center' | 'center' | 'upper-center';
  positionY: number; // 0-1
  maxLines: number;
  animation: string; // 'premium-pop' | 'fade' | ...
  uppercase: boolean;
  renderer?: string;
}

const FALLBACKS = ['Space Grotesk', 'Plus Jakarta Sans', 'Arial'];

/** Presets de legenda prontos. */
export const CAPTION_PRESETS: Record<string, CaptionSettings> = {
  'mpx-premium': {
    fontFamily: 'Bebas Neue',
    fallbackFonts: FALLBACKS,
    fontSize: 84,
    primaryColor: '#FFFFFF',
    accentColor: '#4DFF2E',
    strokeColor: '#0A0A0A',
    strokeWidth: 6,
    position: 'lower-center',
    positionY: 0.72,
    maxLines: 2,
    animation: 'premium-pop',
    uppercase: true,
    renderer: 'outline-bold',
  },
  'venda-agressiva': {
    fontFamily: 'Bebas Neue',
    fallbackFonts: FALLBACKS,
    fontSize: 96,
    primaryColor: '#FFFFFF',
    accentColor: '#FF4444',
    strokeColor: '#0A0A0A',
    strokeWidth: 8,
    position: 'center',
    positionY: 0.5,
    maxLines: 2,
    animation: 'premium-pop',
    uppercase: true,
    renderer: 'outline-bold',
  },
  institucional: {
    fontFamily: 'Space Grotesk',
    fallbackFonts: FALLBACKS,
    fontSize: 72,
    primaryColor: '#FFFFFF',
    accentColor: '#4DFF2E',
    strokeColor: '#0A0A0A',
    strokeWidth: 4,
    position: 'lower-center',
    positionY: 0.74,
    maxLines: 2,
    animation: 'fade',
    uppercase: false,
    renderer: 'glass',
  },
  autoridade: {
    fontFamily: 'Space Grotesk',
    fallbackFonts: FALLBACKS,
    fontSize: 78,
    primaryColor: '#FFFFFF',
    accentColor: '#4DFF2E',
    strokeColor: '#0A0A0A',
    strokeWidth: 5,
    position: 'lower-center',
    positionY: 0.72,
    maxLines: 2,
    animation: 'slide',
    uppercase: false,
    renderer: 'spotlight',
  },
  'minimal-clean': {
    fontFamily: 'Plus Jakarta Sans',
    fallbackFonts: FALLBACKS,
    fontSize: 68,
    primaryColor: '#FFFFFF',
    accentColor: '#4DFF2E',
    strokeColor: '#0A0A0A',
    strokeWidth: 3,
    position: 'lower-center',
    positionY: 0.76,
    maxLines: 2,
    animation: 'fade',
    uppercase: false,
    renderer: 'default',
  },
};

export const DEFAULT_CAPTION_PRESET = 'mpx-premium';

/** Converte CaptionSettings em CaptionStyle (consumido pela composição). */
export function settingsToStyle(s: CaptionSettings): CaptionStyle {
  const fontStack = [s.fontFamily, ...s.fallbackFonts]
    .map((f) => (f.includes(' ') ? `"${f}"` : f))
    .join(', ');

  return {
    name: 'custom',
    renderer: s.renderer,
    fontFamily: fontStack,
    fontWeight: 700,
    fontSize: s.fontSize,
    color: s.primaryColor,
    highlightColor: s.accentColor,
    position: s.position === 'center' ? 'center' : 'bottom',
    positionYPercent: s.positionY,
    uppercase: s.uppercase,
    maxWordsPerLine: 4,
    maxHighlightWords: 3,
    animation: s.animation === 'premium-pop' ? 'pop' : (s.animation as any),
    outlineColor: s.strokeColor,
    outlineWidth: s.strokeWidth,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 10,
  };
}

export function getCaptionPreset(name: string): CaptionSettings {
  return CAPTION_PRESETS[name] ?? CAPTION_PRESETS[DEFAULT_CAPTION_PRESET];
}
