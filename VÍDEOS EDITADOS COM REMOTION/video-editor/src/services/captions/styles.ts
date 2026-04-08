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
  animation: 'none' | 'fade' | 'pop' | 'slide' | 'typewriter';
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
}

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
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
    outlineColor: undefined,
    outlineWidth: undefined,
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
    backgroundColor: undefined,
    backgroundOpacity: undefined,
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
    outlineColor: undefined,
    outlineWidth: undefined,
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
    backgroundColor: undefined,
    backgroundOpacity: undefined,
    position: 'bottom',
    uppercase: false,
    maxWordsPerLine: 6,
    animation: 'fade',
    outlineColor: '#000000',
    outlineWidth: 1,
    shadowColor: undefined,
    shadowBlur: undefined,
  },
  aggressive: {
    name: 'aggressive',
    fontFamily: 'Bebas Neue, Impact, sans-serif',
    fontWeight: 900,
    fontSize: 60,
    color: '#FFFFFF',
    highlightColor: '#FF4444',
    backgroundColor: undefined,
    backgroundOpacity: undefined,
    position: 'center',
    uppercase: true,
    maxWordsPerLine: 2,
    animation: 'pop',
    outlineColor: '#000000',
    outlineWidth: 4,
    shadowColor: 'rgba(255,0,0,0.3)',
    shadowBlur: 12,
  },
};

export function getCaptionStyle(name: string): CaptionStyle {
  return CAPTION_STYLES[name] ?? CAPTION_STYLES.clean;
}
