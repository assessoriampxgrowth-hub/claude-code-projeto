import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { BRollImage } from './types';

interface Props {
  bRollImages?: BRollImage[];
}

/**
 * BRollOverlay — renderiza imagens/vídeos de apoio sobre a fala.
 *  - mode 'overlay': card flutuante no terço superior (não cobre rosto/legenda)
 *  - mode 'split':   metade superior do quadro (split screen)
 * Entrada animada, cantos arredondados, sombra.
 */
export const BRollOverlay: React.FC<Props> = ({ bRollImages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (!bRollImages || bRollImages.length === 0) return null;

  const active = bRollImages.filter((b) => t >= b.start && t < b.end);
  if (active.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {active.map((b, i) => (
        <BRollItem key={`${b.sceneId}-${i}`} item={b} t={t} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};

const BRollItem: React.FC<{ item: BRollImage; t: number; fps: number }> = ({
  item,
  t,
}) => {
  const dur = item.end - item.start;
  const elapsed = t - item.start;
  const ramp = Math.min(0.35, dur / 2);

  // Entrada/saída suave
  const appear = interpolate(
    elapsed,
    [0, ramp, dur - ramp, dur],
    [0, 1, 1, 0],
    { easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const slide = interpolate(elapsed, [0, ramp], [24, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const media =
    item.assetType === 'video' ? (
      <OffthreadVideo
        src={item.src}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : (
      <Img
        src={item.src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );

  if (item.mode === 'split') {
    // Metade superior do quadro
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          opacity: appear,
          overflow: 'hidden',
        }}
      >
        {media}
      </div>
    );
  }

  // mode 'overlay' / default — card flutuante no terço superior
  return (
    <div
      style={{
        position: 'absolute',
        top: '14%',
        left: '8%',
        right: '8%',
        height: '32%',
        opacity: appear,
        transform: `translateY(${slide}px)`,
        borderRadius: 24,
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.12)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
      }}
    >
      {media}
    </div>
  );
};
