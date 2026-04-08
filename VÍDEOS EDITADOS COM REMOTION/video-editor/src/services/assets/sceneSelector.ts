import type { EditPlanScene } from '@/services/pipeline/types';
import {
  CompositionMode,
  CompositionConfig,
  DEFAULT_COMPOSITION_CONFIGS,
} from './compositionTypes';

export interface SceneDecision {
  scene: EditPlanScene;
  composition: CompositionConfig;
  shouldGenerateImage: boolean;
  imagePrompt?: string;
}

/**
 * For each scene in the edit plan, decide what composition mode to use.
 * Decides whether to generate an image, use an overlay, or keep the video clean.
 *
 * @param scenes - Edit plan scenes
 * @param scenesFrequency - How often to use image scenes (0-1)
 * @param videoHasVisual - Whether the source video has meaningful visual content
 */
export function selectSceneCompositions(
  scenes: EditPlanScene[],
  scenesFrequency: number,
  videoHasVisual: boolean = true
): SceneDecision[] {
  const decisions: SceneDecision[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const decision = decideForScene(
      scene,
      i,
      scenes.length,
      scenesFrequency,
      videoHasVisual
    );
    decisions.push(decision);
  }

  return decisions;
}

/**
 * Decide composition for a single scene based on its properties.
 */
function decideForScene(
  scene: EditPlanScene,
  index: number,
  totalScenes: number,
  frequency: number,
  videoHasVisual: boolean
): SceneDecision {
  // Scenes where we should generally keep video clean
  const keepCleanTypes = new Set(['narration', 'transition']);

  // Scenes that benefit from visual augmentation
  const augmentTypes = new Set(['hook', 'cta', 'title', 'benefit']);

  // Determine if this scene should get an image
  const shouldAugment =
    augmentTypes.has(scene.type) && scene.emphasis > 0.5;
  const frequencyThreshold = 1 - frequency; // Higher frequency = lower threshold

  // Base decision: keep clean for narration, augment for key scenes
  if (keepCleanTypes.has(scene.type) || scene.emphasis < frequencyThreshold) {
    // Clean video or subtle gradient overlay
    if (scene.emphasis > 0.3 && !videoHasVisual) {
      return {
        scene,
        composition: {
          mode: CompositionMode.GradientOverlay,
          ...DEFAULT_COMPOSITION_CONFIGS[CompositionMode.GradientOverlay],
        },
        shouldGenerateImage: false,
      };
    }

    return {
      scene,
      composition: { mode: CompositionMode.Clean },
      shouldGenerateImage: false,
    };
  }

  // For high-emphasis scenes, decide composition mode
  if (shouldAugment && scene.illustrationPrompt) {
    const mode = selectImageMode(scene, videoHasVisual);
    return {
      scene,
      composition: {
        mode,
        ...DEFAULT_COMPOSITION_CONFIGS[mode],
      },
      shouldGenerateImage: true,
      imagePrompt: scene.illustrationPrompt,
    };
  }

  // For medium scenes, use text card or gradient
  if (scene.type === 'title' || (scene.type === 'hook' && index === 0)) {
    return {
      scene,
      composition: {
        mode: CompositionMode.TextCard,
        ...DEFAULT_COMPOSITION_CONFIGS[CompositionMode.TextCard],
      },
      shouldGenerateImage: false,
    };
  }

  // Default: keep clean
  return {
    scene,
    composition: { mode: CompositionMode.Clean },
    shouldGenerateImage: false,
  };
}

/**
 * Select the best image composition mode for a scene.
 */
function selectImageMode(
  scene: EditPlanScene,
  videoHasVisual: boolean
): CompositionMode {
  if (!videoHasVisual) {
    // No meaningful video - use full image
    return CompositionMode.FullImage;
  }

  // For high-emphasis CTA, use split screen to show both
  if (scene.type === 'cta') {
    return CompositionMode.SplitScreen;
  }

  // For hooks, use a dramatic blend overlay
  if (scene.type === 'hook') {
    return CompositionMode.BlendOverlay;
  }

  // For benefits/proof, use PiP to keep video visible
  if (scene.type === 'benefit' || scene.type === 'proof') {
    return CompositionMode.PictureInPicture;
  }

  // Default for scenes with images
  return CompositionMode.BlendOverlay;
}
