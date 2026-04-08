import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SceneProps { scene: { title: string; subtitle?: string; body?: string; emoji?: string; color: { bg: string; accent: string; text: string } }; from: number; durationInFrames: number; }

export const SolutionScene = ({ scene, durationInFrames }: SceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 150 }, durationInFrames: 25 });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames - 5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: scene.color.bg, opacity: exitOpacity }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${scene.color.accent}11 0%, transparent 50%)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', gap: 24 }}>
        {scene.emoji && <span style={{ fontSize: 80, transform: `scale(${scale})`, display: 'block' }}>{scene.emoji}</span>}
        <div style={{ width: 60, height: 4, borderRadius: 2, background: scene.color.accent, opacity }} />
        <h2 style={{ fontSize: 64, fontWeight: 700, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.2, opacity, fontFamily: 'Sora, sans-serif' }}>{scene.title}</h2>
        {scene.subtitle && <p style={{ fontSize: 32, color: scene.color.accent, textAlign: 'center', opacity: opacity * 0.9, fontFamily: 'Sora, sans-serif' }}>{scene.subtitle}</p>}
        {scene.body && <p style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5, opacity: opacity * 0.7, fontFamily: 'Sora, sans-serif' }}>{scene.body}</p>}
      </div>
    </AbsoluteFill>
  );
};
