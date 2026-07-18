import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { ZoomInstruction } from '../types';

interface Props {
  zooms: ZoomInstruction[];
  children: React.ReactNode;
}

export const ZoomContainer: React.FC<Props> = ({ zooms, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find the active zoom instruction
  const activeZoom = zooms.find(
    (z) => currentTime >= z.startTime && currentTime < z.endTime
  );

  if (!activeZoom) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const zoomDuration = activeZoom.endTime - activeZoom.startTime;
  const zoomProgress =
    (currentTime - activeZoom.startTime) / zoomDuration;

  const easingFn = getEasingFn(activeZoom.easing);

  // Interpolate scale
  const scale = interpolate(
    zoomProgress,
    [0, 1],
    [1, activeZoom.scale],
    { easing: easingFn, extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  // Calculate transform origin from focus point
  const originX = activeZoom.focusX * 100;
  const originY = activeZoom.focusY * 100;

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: `${originX}% ${originY}%`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

function getEasingFn(
  easing: ZoomInstruction['easing']
): (t: number) => number {
  switch (easing) {
    case 'easeIn':
      return Easing.in(Easing.cubic);
    case 'easeOut':
      return Easing.out(Easing.cubic);
    case 'easeInOut':
      return Easing.inOut(Easing.cubic);
    case 'linear':
    default:
      return Easing.linear;
  }
}
