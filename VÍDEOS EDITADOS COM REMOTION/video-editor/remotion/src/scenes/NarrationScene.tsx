import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface SceneProps { scene: { title: string; subtitle?: string; color: { bg: string; accent: string; text: string } }; from: number; durationInFrames: number; }

export const NarrationScene = ({ scene, durationInFrames }: SceneProps) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames - 5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: scene.color.bg, opacity: exitOpacity }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 48px', gap: 24, opacity }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${scene.color.accent}22`, border: `2px solid ${scene.color.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎙️</div>
        <p style={{ fontSize: 40, fontWeight: 600, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.5, fontFamily: 'Sora, sans-serif' }}>{scene.title}</p>
        {scene.subtitle && <p style={{ fontSize: 28, color: scene.color.accent, textAlign: 'center', fontFamily: 'Sora, sans-serif' }}>{scene.subtitle}</p>}
      </div>
    </AbsoluteFill>
  );
};
