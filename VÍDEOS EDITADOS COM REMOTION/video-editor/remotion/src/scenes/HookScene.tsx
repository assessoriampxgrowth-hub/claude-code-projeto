import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SceneProps { scene: { title: string; subtitle?: string; emoji?: string; color: { bg: string; accent: string; text: string } }; from: number; durationInFrames: number; }

export const HookScene = ({ scene, durationInFrames }: SceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const emojiScale = spring({ frame, fps, config: { damping: 8, stiffness: 200 }, durationInFrames: 20 });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [10, 30], [40, 0], { extrapolateRight: 'clamp' });
  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames - 5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: scene.color.bg, opacity: exitOpacity }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${scene.color.accent}22 0%, transparent 70%)` }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${scene.color.accent}, transparent)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', gap: 32 }}>
        {scene.emoji && <span style={{ fontSize: 96, transform: `scale(${emojiScale})`, display: 'block' }}>{scene.emoji}</span>}
        <h1 style={{ fontSize: 72, fontWeight: 800, color: scene.color.accent, textAlign: 'center', lineHeight: 1.1, opacity: titleOpacity, transform: `translateY(${titleY}px)`, fontFamily: 'Sora, sans-serif', textShadow: `0 0 40px ${scene.color.accent}66` }}>{scene.title}</h1>
        {scene.subtitle && <p style={{ fontSize: 36, color: scene.color.text, textAlign: 'center', opacity: subtitleOpacity * 0.8, fontFamily: 'Sora, sans-serif', lineHeight: 1.4 }}>{scene.subtitle}</p>}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${scene.color.accent}, transparent)` }} />
    </AbsoluteFill>
  );
};
