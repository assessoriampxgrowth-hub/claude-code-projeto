import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { ZoomInstruction } from './types';

interface Props {
  zooms: ZoomInstruction[];
  children: React.ReactNode;
}

export const ZoomContainer: React.FC<Props> = ({ zooms, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Binary search for active zoom (perf optimization)
  const activeZoom = findActive(zooms, currentTime);

  if (!activeZoom) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const zoomDuration = activeZoom.endTime - activeZoom.startTime;
  const elapsed = currentTime - activeZoom.startTime;
  const ramp = Math.min(activeZoom.rampSeconds ?? 0.4, zoomDuration / 2);

  // Punch-in model: ramp 1.0 -> scale, HOLD, ramp back to 1.0.
  // Between zoom instructions the scale is exactly 1.0, so there is no
  // seesaw and the return to normal is always smooth.
  const scale = interpolate(
    elapsed,
    [0, ramp, zoomDuration - ramp, zoomDuration],
    [1, activeZoom.scale, activeZoom.scale, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

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

function findActive<T extends { startTime: number; endTime: number }>(
  items: T[],
  time: number
): T | undefined {
  // For small arrays, linear search is fine
  if (items.length < 20) {
    return items.find((i) => time >= i.startTime && time < i.endTime);
  }
  // Binary search for sorted arrays
  let lo = 0;
  let hi = items.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (time < items[mid].startTime) hi = mid - 1;
    else if (time >= items[mid].endTime) lo = mid + 1;
    else return items[mid];
  }
  return undefined;
}

