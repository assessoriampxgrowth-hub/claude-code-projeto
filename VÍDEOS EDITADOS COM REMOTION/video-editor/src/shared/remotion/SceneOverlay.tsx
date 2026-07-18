import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { SceneInfo, TransitionType } from './types';

interface Props {
  scenes: SceneInfo[];
}

const TRANSITION_DURATION_PERCENT = 0.12; // 12% of scene = transition
const MAX_TRANSITION_FRAMES = 15; // max 0.5s at 30fps

export const SceneOverlay: React.FC<Props> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find current and adjacent scenes
  const sceneIndex = scenes.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );
  if (sceneIndex === -1) return null;

  const currentScene = scenes[sceneIndex];
  const sceneDuration = currentScene.endTime - currentScene.startTime;
  const sceneFrames = sceneDuration * fps;
  const transitionFrames = Math.min(
    Math.floor(sceneFrames * TRANSITION_DURATION_PERCENT),
    MAX_TRANSITION_FRAMES
  );
  const framesIntoScene = (currentTime - currentScene.startTime) * fps;
  const framesUntilEnd = (currentScene.endTime - currentTime) * fps;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Transition IN overlay */}
      {currentScene.transitionIn &&
        currentScene.transitionIn !== 'cut' &&
        framesIntoScene < transitionFrames && (
          <TransitionOverlay
            type={currentScene.transitionIn as TransitionType}
            progress={framesIntoScene / transitionFrames}
            direction="in"
          />
        )}

      {/* Transition OUT overlay */}
      {currentScene.transitionOut &&
        currentScene.transitionOut !== 'cut' &&
        framesUntilEnd < transitionFrames && (
          <TransitionOverlay
            type={currentScene.transitionOut as TransitionType}
            progress={1 - framesUntilEnd / transitionFrames}
            direction="out"
          />
        )}

      {/* Vignette for high-emphasis scenes */}
      {currentScene.emphasis >= 0.7 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.25) 100%)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── Transition Renderer ───

interface TransitionOverlayProps {
  type: TransitionType;
  progress: number; // 0 = start of transition, 1 = end of transition
  direction: 'in' | 'out';
}

const TransitionOverlay: React.FC<TransitionOverlayProps> = ({
  type,
  progress,
  direction,
}) => {
  // For "in" transitions: overlay starts visible and disappears
  // For "out" transitions: overlay starts invisible and appears
  const p = direction === 'in' ? 1 - progress : progress;
  const easedP = Easing.inOut(Easing.cubic)(p);

  switch (type) {
    case 'fade':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            opacity: easedP,
          }}
        />
      );

    case 'slide-left':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `translateX(${-100 + easedP * 100}%)`,
          }}
        />
      );

    case 'slide-right':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `translateX(${100 - easedP * 100}%)`,
          }}
        />
      );

    case 'slide-up':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `translateY(${-100 + easedP * 100}%)`,
          }}
        />
      );

    case 'slide-down':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `translateY(${100 - easedP * 100}%)`,
          }}
        />
      );

    case 'zoom-in': {
      const scale = interpolate(easedP, [0, 1], [3, 0], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
      });
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `scale(${scale})`,
            opacity: easedP,
            borderRadius: '50%',
          }}
        />
      );
    }

    case 'zoom-out': {
      const scale = interpolate(easedP, [0, 1], [0, 3], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
      });
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            transform: `scale(${scale})`,
            opacity: easedP,
          }}
        />
      );
    }

    case 'wipe-left':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            clipPath: `inset(0 ${(1 - easedP) * 100}% 0 0)`,
          }}
        />
      );

    case 'wipe-right':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            clipPath: `inset(0 0 0 ${(1 - easedP) * 100}%)`,
          }}
        />
      );

    case 'wipe-down':
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#000',
            clipPath: `inset(0 0 ${(1 - easedP) * 100}% 0)`,
          }}
        />
      );

    case 'blur': {
      const blur = interpolate(easedP, [0, 1], [0, 20], {
        extrapolateRight: 'clamp',
      });
      return (
        <AbsoluteFill
          style={{
            backdropFilter: `blur(${blur}px)`,
            backgroundColor: `rgba(0,0,0,${easedP * 0.3})`,
          }}
        />
      );
    }

    default:
      return null;
  }
};
