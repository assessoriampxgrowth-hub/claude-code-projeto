export interface CaptionStyle {
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  highlightColor: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  position: 'top' | 'center' | 'bottom';
  uppercase: boolean;
  maxWordsPerLine: number;
  animation: string;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  // Extended fields for advanced renderers
  renderer?: string;
  glowColor?: string;
  glowIntensity?: number;
  gradientColors?: string[];
  letterSpacing?: number;
  positionYPercent?: number;
  maxHighlightWords?: number;
}

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
  // ═══════════════════════════════════════
  // MPX REELS PREMIUM — estilo oficial MPX
  // ═══════════════════════════════════════
  'mpx-reels': {
    name: 'mpx-reels',
    renderer: 'outline-bold',
    fontFamily: '"Bebas Neue", "Space Grotesk", "Plus Jakarta Sans", Arial, sans-serif',
    fontWeight: 700,
    fontSize: 84,
    color: '#FFFFFF',
    highlightColor: '#4DFF2E',
    position: 'bottom',
    positionYPercent: 0.72,
    uppercase: true,
    maxWordsPerLine: 4,
    maxHighlightWords: 3,
    animation: 'pop',
    outlineColor: '#0A0A0A',
    outlineWidth: 6,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 10,
  },

  // ═══════════════════════════════════════
  // ORIGINAL 5 STYLES
  // ═══════════════════════════════════════

  clean: {
    name: 'clean',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 42,
    color: '#FFFFFF',
    highlightColor: '#00D4FF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.6,
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 5,
    animation: 'fade',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
  },
  bold: {
    name: 'bold',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: 52,
    color: '#FFFFFF',
    highlightColor: '#FFB800',
    position: 'center',
    uppercase: true,
    maxWordsPerLine: 3,
    animation: 'pop',
    outlineColor: '#000000',
    outlineWidth: 3,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 8,
  },
  premium: {
    name: 'premium',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 46,
    color: '#FFFFFF',
    highlightColor: '#B800FF',
    backgroundColor: 'rgba(0,0,0,0.4)',
    backgroundOpacity: 0.4,
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'slide',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 6,
  },
  minimal: {
    name: 'minimal',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 36,
    color: '#FFFFFF',
    highlightColor: '#00FF88',
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 6,
    animation: 'fade',
    outlineColor: '#000000',
    outlineWidth: 1,
  },
  aggressive: {
    name: 'aggressive',
    fontFamily: 'Bebas Neue, Impact, sans-serif',
    fontWeight: 900,
    fontSize: 60,
    color: '#FFFFFF',
    highlightColor: '#FF4444',
    position: 'center',
    uppercase: true,
    maxWordsPerLine: 2,
    animation: 'pop',
    outlineColor: '#000000',
    outlineWidth: 4,
    shadowColor: 'rgba(255,0,0,0.3)',
    shadowBlur: 12,
  },

  // ═══════════════════════════════════════
  // NEW 10 STYLES
  // ═══════════════════════════════════════

  karaoke: {
    name: 'karaoke',
    renderer: 'karaoke',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: 48,
    color: '#FFFFFF',
    highlightColor: '#FFD700',
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'fade',
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 8,
  },

  neon: {
    name: 'neon',
    renderer: 'neon',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 44,
    color: '#FFFFFF',
    highlightColor: '#00FFFF',
    glowColor: '#00FFFF',
    glowIntensity: 1.2,
    position: 'center',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'fade',
  },

  'neon-pink': {
    name: 'neon-pink',
    renderer: 'neon',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 44,
    color: '#FFFFFF',
    highlightColor: '#FF00FF',
    glowColor: '#FF00FF',
    glowIntensity: 1.5,
    position: 'center',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'fade',
  },

  shadow3d: {
    name: 'shadow3d',
    renderer: 'shadow3d',
    fontFamily: 'Bebas Neue, Impact, sans-serif',
    fontWeight: 900,
    fontSize: 56,
    color: '#FFFFFF',
    highlightColor: '#FFB800',
    position: 'center',
    uppercase: true,
    maxWordsPerLine: 3,
    animation: 'pop',
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 0,
  },

  gradient: {
    name: 'gradient',
    renderer: 'gradient',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: 50,
    color: '#FFFFFF',
    highlightColor: '#FF6B00',
    gradientColors: ['#FFB800', '#FF6B00', '#FF0080'],
    position: 'center',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'fade',
  },

  'gradient-cool': {
    name: 'gradient-cool',
    renderer: 'gradient',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: 50,
    color: '#FFFFFF',
    highlightColor: '#00D4FF',
    gradientColors: ['#00D4FF', '#7B2FFF', '#FF00FF'],
    position: 'center',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'fade',
  },

  bounce: {
    name: 'bounce',
    renderer: 'bounce',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 46,
    color: '#FFFFFF',
    highlightColor: '#00FF88',
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'bounce',
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 6,
  },

  wave: {
    name: 'wave',
    renderer: 'wave',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 44,
    color: '#FFFFFF',
    highlightColor: '#00D4FF',
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 5,
    animation: 'wave',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 6,
  },

  glass: {
    name: 'glass',
    renderer: 'glass',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 40,
    color: '#FFFFFF',
    highlightColor: '#B800FF',
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 5,
    animation: 'fade',
  },

  spotlight: {
    name: 'spotlight',
    renderer: 'spotlight',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: 48,
    color: '#FFFFFF',
    highlightColor: '#FFD700',
    position: 'center',
    uppercase: false,
    maxWordsPerLine: 4,
    animation: 'spotlight',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
  },

  'outline-bold': {
    name: 'outline-bold',
    renderer: 'outline-bold',
    fontFamily: 'Bebas Neue, Impact, sans-serif',
    fontWeight: 900,
    fontSize: 58,
    color: '#FFFFFF',
    highlightColor: '#FF4444',
    position: 'center',
    uppercase: true,
    maxWordsPerLine: 3,
    animation: 'pop',
    outlineColor: '#000000',
    outlineWidth: 5,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 12,
  },
};

export function getCaptionStyle(name: string): CaptionStyle {
  return CAPTION_STYLES[name] ?? CAPTION_STYLES.clean;
}

export function getAllStyleNames(): string[] {
  return Object.keys(CAPTION_STYLES);
}
