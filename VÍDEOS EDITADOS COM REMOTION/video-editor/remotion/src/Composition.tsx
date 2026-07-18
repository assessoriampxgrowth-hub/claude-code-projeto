import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { CaptionOverlay } from '../../src/shared/remotion/CaptionOverlay';
import { ZoomContainer } from '../../src/shared/remotion/ZoomContainer';
import { SceneOverlay } from '../../src/shared/remotion/SceneOverlay';
import { EffectsLayer } from '../../src/shared/remotion/EffectsLayer';
import { BRollOverlay } from '../../src/shared/remotion/BRollOverlay';
import type { MainCompositionProps } from '../../src/shared/remotion/types';

export const MainComposition: React.FC<MainCompositionProps> = ({
  videoSrc,
  captions,
  zooms,
  scenes,
  captionStyle,
  effects,
  bRollImages,
}) => {
  // Absolute URLs (http, file://, blob, data) and root paths are used as-is.
  // Only bare relative paths go through staticFile().
  const resolvedSrc = /^(https?:|file:|blob:|data:|\/)/.test(videoSrc)
    ? videoSrc
    : staticFile(videoSrc);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Layer 1: Video with effects + zoom */}
      <EffectsLayer effects={effects}>
        <ZoomContainer zooms={zooms}>
          <AbsoluteFill>
            <OffthreadVideo
              src={resolvedSrc}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AbsoluteFill>
        </ZoomContainer>
      </EffectsLayer>

      {/* Layer 2: B-roll / support images */}
      <BRollOverlay bRollImages={bRollImages} />

      {/* Layer 3: Scene overlays (transitions, vignettes) */}
      <SceneOverlay scenes={scenes} />

      {/* Layer 4: Caption overlays */}
      <CaptionOverlay captions={captions} style={captionStyle} />
    </AbsoluteFill>
  );
};
