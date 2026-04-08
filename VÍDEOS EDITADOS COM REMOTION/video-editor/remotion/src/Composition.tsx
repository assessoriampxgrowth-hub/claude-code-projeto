import { AbsoluteFill, Sequence } from 'remotion';
import { HookScene } from './scenes/HookScene';
import { SolutionScene } from './scenes/SolutionScene';
import { CTAScene } from './scenes/CTAScene';
import { NarrationScene } from './scenes/NarrationScene';

interface SceneColor { bg: string; accent: string; text: string; }
interface Scene { id: string; type: string; title: string; subtitle?: string; body?: string; emoji?: string; color: SceneColor; startLeg: number; endLeg: number; }
interface SrtEntry { index: number; text: string; startSeconds: number; endSeconds: number; start: string; end: string; }
interface Props { scenes: Scene[]; legendas: SrtEntry[]; }

const FRAMES_PER_SCENE = 180;

function getSceneComponent(scene: Scene, from: number, durationInFrames: number) {
  const props = { scene, from, durationInFrames };
  switch (scene.type) {
    case 'hook': return <HookScene {...props} />;
    case 'cta': return <CTAScene {...props} />;
    case 'narration': return <NarrationScene {...props} />;
    default: return <SolutionScene {...props} />;
  }
}

export const MainComposition = ({ scenes, legendas }: Props) => {
  let currentFrame = 0;
  return (
    <AbsoluteFill style={{ background: '#050508' }}>
      {scenes.map((scene) => {
        let durationInFrames = FRAMES_PER_SCENE;
        if (legendas.length > 0 && scene.startLeg < legendas.length && scene.endLeg < legendas.length) {
          const s = legendas[scene.startLeg]; const e = legendas[scene.endLeg];
          if (s && e) durationInFrames = Math.max(60, Math.floor((e.endSeconds - s.startSeconds) * 30));
        }
        const from = currentFrame; currentFrame += durationInFrames;
        return <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>{getSceneComponent(scene, from, durationInFrames)}</Sequence>;
      })}
    </AbsoluteFill>
  );
};
