import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';

interface SceneProps { scene: { title: string; subtitle?: string; emoji?: string; color: { bg: string; accent: string; text: string } }; from: number; durationInFrames: number; }

export const CTAScene = ({ scene }: SceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const buttonScale = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 8, stiffness: 300 }, durationInFrames: 20 });
  const titleScale = spring({ frame, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 20 });
  const pulse = Math.sin(frame * 0.15) * 0.05 + 1;
  return (
    <AbsoluteFill style={{ background: scene.color.bg }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${scene.color.accent}33 0%, transparent 70%)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', gap: 40 }}>
        {scene.emoji && <span style={{ fontSize: 100, transform: `scale(${titleScale})`, display: 'block' }}>{scene.emoji}</span>}
        <h2 style={{ fontSize: 72, fontWeight: 800, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.1, transform: `scale(${titleScale})`, fontFamily: 'Sora, sans-serif' }}>{scene.title}</h2>
        {scene.subtitle && <p style={{ fontSize: 32, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'Sora, sans-serif' }}>{scene.subtitle}</p>}
        <div style={{ background: scene.color.accent, color: '#000000', fontSize: 36, fontWeight: 800, padding: '24px 64px', borderRadius: 100, transform: `scale(${buttonScale * pulse})`, fontFamily: 'Sora, sans-serif', boxShadow: `0 0 60px ${scene.color.accent}88` }}>CLIQUE AQUI</div>
      </div>
    </AbsoluteFill>
  );
};
