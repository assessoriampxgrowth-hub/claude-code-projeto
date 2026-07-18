'use client';
import React from 'react';
import { AbsoluteFill, OffthreadVideo } from 'remotion';
import { CaptionOverlay } from '../../shared/remotion/CaptionOverlay';
import { ZoomContainer } from '../../shared/remotion/ZoomContainer';
import { SceneOverlay } from '../../shared/remotion/SceneOverlay';
import { EffectsLayer } from '../../shared/remotion/EffectsLayer';
import { BRollOverlay } from '../../shared/remotion/BRollOverlay';
import type { MainCompositionProps } from '../../shared/remotion/types';

// Re-export types for consumers
export type { MainCompositionProps as PlayerCompositionProps } from '../../shared/remotion/types';
export type {
  CaptionBlock,
  CaptionStyleProps,
  CaptionWord,
  ZoomInstruction,
  SceneInfo,
  EffectsConfig,
} from '../../shared/remotion/types';

export const PlayerComposition: React.FC<MainCompositionProps> = ({
  videoSrc,
  captions,
  zooms,
  scenes,
  captionStyle,
  effects,
  bRollImages,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Layer 1: Video with effects + zoom */}
      <EffectsLayer effects={effects}>
        <ZoomContainer zooms={zooms}>
          <AbsoluteFill>
            <OffthreadVideo
              src={videoSrc}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AbsoluteFill>
        </ZoomContainer>
      </EffectsLayer>

      {/* Layer 2: B-roll / support images */}
      <BRollOverlay bRollImages={bRollImages} />

      {/* Layer 3: Scene transitions */}
      <SceneOverlay scenes={scenes} />

      {/* Layer 4: Captions */}
      <CaptionOverlay captions={captions} style={captionStyle} />
    </AbsoluteFill>
  );
};
