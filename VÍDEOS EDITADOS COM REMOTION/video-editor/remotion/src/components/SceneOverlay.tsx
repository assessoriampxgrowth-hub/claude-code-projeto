import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import type { SceneInfo } from '../types';

interface Props {
  scenes: SceneInfo[];
}

export const SceneOverlay: React.FC<Props> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find active scene
  const activeScene = scenes.find(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );

  if (!activeScene) return null;

  const sceneDuration = activeScene.endTime - activeScene.startTime;
  const sceneProgress =
    (currentTime - activeScene.startTime) / sceneDuration;

  // Transition in
  const enterOpacity = getTransitionOpacity(
    activeScene.transitionIn,
    sceneProgress,
    'in'
  );

  // Transition out
  const exitOpacity = getTransitionOpacity(
    activeScene.transitionOut,
    sceneProgress,
    'out'
  );

  const opacity = Math.min(enterOpacity, exitOpacity);

  // Only render overlay for non-narration scenes with high emphasis
  if (activeScene.type === 'narration' && activeScene.emphasis < 0.7) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      {/* Subtle vignette for scene transitions */}
      {activeScene.transitionIn === 'fade' && sceneProgress < 0.1 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

function getTransitionOpacity(
  transition: string | undefined,
  progress: number,
  direction: 'in' | 'out'
): number {
  if (!transition || transition === 'cut') return 1;

  if (transition === 'fade') {
    if (direction === 'in') {
      return interpolate(progress, [0, 0.1], [0, 1], {
        extrapolateRight: 'clamp',
      });
    }
    return interpolate(progress, [0.9, 1], [1, 0], {
      extrapolateLeft: 'clamp',
    });
  }

  return 1;
}
