// ─── Single source of truth for all Remotion composition types ───
// Used by BOTH @remotion/player (client) and @remotion/renderer (server)

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  isHighlight: boolean;
}

export interface CaptionBlock {
  id: string;
  startTime: number;
  endTime: number;
  words: CaptionWord[];
  text: string;
  style: CaptionStyleProps;
}

export interface CaptionStyleProps {
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
  animation: CaptionAnimation;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  // Extended fields for advanced renderers
  renderer?: CaptionRenderer;
  glowColor?: string;
  glowIntensity?: number;
  gradientColors?: string[];
  letterSpacing?: number;
  /** Vertical position as fraction of frame height (0-1). Overrides `position`. */
  positionYPercent?: number;
  /** Max words highlighted with accent color per block */
  maxHighlightWords?: number;
}

export type CaptionAnimation =
  | 'none'
  | 'fade'
  | 'pop'
  | 'slide'
  | 'typewriter'
  | 'bounce'
  | 'wave'
  | 'karaoke'
  | 'neon'
  | 'spotlight';

export type CaptionRenderer =
  | 'default'
  | 'karaoke'
  | 'neon'
  | 'shadow3d'
  | 'gradient'
  | 'bounce'
  | 'wave'
  | 'glass'
  | 'spotlight'
  | 'outline-bold'
  | 'typewriter-pro';

export interface ZoomInstruction {
  startTime: number;
  endTime: number;
  scale: number;
  focusX: number;
  focusY: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  /** Punch-in mode: 'in' ramps quickly then holds; 'out' holds then ramps back. */
  mode?: 'in' | 'out';
  /** Duration of the ramp in seconds (default 0.4). Keeps zoom snappy, not gradual. */
  rampSeconds?: number;
}

export interface SceneInfo {
  id: string;
  type: string;
  startTime: number;
  endTime: number;
  title: string;
  emphasis: number;
  transitionIn?: TransitionType;
  transitionOut?: TransitionType;
}

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-down'
  | 'blur';

export interface EffectsConfig {
  colorGrading: ColorGradingPreset;
  vignette: boolean;
  vignetteIntensity: number;
  letterbox: boolean;
  letterboxRatio: number; // e.g. 2.35 for cinematic
  blurBackground: boolean;
}

export type ColorGradingPreset =
  | 'none'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'cinematic'
  | 'dramatic'
  | 'desaturated'
  | 'vivid';

export interface BRollImage {
  sceneId: string;
  /** Local path or URL to the asset */
  src: string;
  /** image or video */
  assetType: 'image' | 'video';
  /** overlay = floating card; split = top half of frame */
  mode: 'overlay' | 'split' | 'fullscreen' | 'pip';
  start: number; // seconds
  end: number; // seconds
  opacity: number;
}

export interface MainCompositionProps {
  videoSrc: string;
  captions: CaptionBlock[];
  zooms: ZoomInstruction[];
  scenes: SceneInfo[];
  captionStyle: CaptionStyleProps;
  fps: number;
  effects?: EffectsConfig;
  bRollImages?: BRollImage[];
}

// Default effects config
export const DEFAULT_EFFECTS: EffectsConfig = {
  colorGrading: 'none',
  vignette: false,
  vignetteIntensity: 0.3,
  letterbox: false,
  letterboxRatio: 2.35,
  blurBackground: false,
};
