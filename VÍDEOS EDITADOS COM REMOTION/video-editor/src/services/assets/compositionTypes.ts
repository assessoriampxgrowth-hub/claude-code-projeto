/**
 * Visual composition modes for scene overlays.
 */
export enum CompositionMode {
  /** No overlay - show the original video cleanly */
  Clean = 'clean',
  /** Full-screen generated image behind captions */
  FullImage = 'full-image',
  /** Split-screen: video on one side, image on the other */
  SplitScreen = 'split-screen',
  /** Small picture-in-picture overlay */
  PictureInPicture = 'pip',
  /** Color gradient overlay on video */
  GradientOverlay = 'gradient-overlay',
  /** Text-only card (no video, just styled text) */
  TextCard = 'text-card',
  /** Video with a semi-transparent image overlay */
  BlendOverlay = 'blend-overlay',
}

export interface CompositionConfig {
  mode: CompositionMode;
  /** For image-based modes: the image URL or path */
  imagePath?: string;
  /** Opacity of the overlay (0-1) */
  opacity?: number;
  /** Position for PiP mode */
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Size ratio for PiP (0-1, relative to frame) */
  pipScale?: number;
  /** Split ratio for split-screen (0-1, how much space for video) */
  splitRatio?: number;
  /** Gradient colors for gradient overlay */
  gradientColors?: [string, string];
  /** Gradient direction in degrees */
  gradientAngle?: number;
  /** Background color for text card */
  cardBackground?: string;
}

/**
 * Default composition configs for each mode.
 */
export const DEFAULT_COMPOSITION_CONFIGS: Record<CompositionMode, Partial<CompositionConfig>> = {
  [CompositionMode.Clean]: {},
  [CompositionMode.FullImage]: {
    opacity: 1,
  },
  [CompositionMode.SplitScreen]: {
    splitRatio: 0.5,
  },
  [CompositionMode.PictureInPicture]: {
    pipPosition: 'bottom-right',
    pipScale: 0.3,
    opacity: 1,
  },
  [CompositionMode.GradientOverlay]: {
    opacity: 0.4,
    gradientColors: ['#000000', '#1a0033'],
    gradientAngle: 180,
  },
  [CompositionMode.TextCard]: {
    cardBackground: '#0A0F1A',
  },
  [CompositionMode.BlendOverlay]: {
    opacity: 0.3,
  },
};
