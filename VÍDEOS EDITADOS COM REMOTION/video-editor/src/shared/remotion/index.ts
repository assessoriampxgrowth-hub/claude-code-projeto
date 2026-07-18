// Shared Remotion components — single source of truth
// Used by BOTH @remotion/player (client) and @remotion/renderer (server)

export { CaptionOverlay } from './CaptionOverlay';
export { ZoomContainer } from './ZoomContainer';
export { SceneOverlay } from './SceneOverlay';
export { EffectsLayer } from './EffectsLayer';
export { BRollOverlay } from './BRollOverlay';

export type {
  CaptionWord,
  CaptionBlock,
  CaptionStyleProps,
  CaptionAnimation,
  CaptionRenderer,
  ZoomInstruction,
  SceneInfo,
  TransitionType,
  EffectsConfig,
  ColorGradingPreset,
  BRollImage,
  MainCompositionProps,
} from './types';

export { DEFAULT_EFFECTS } from './types';
