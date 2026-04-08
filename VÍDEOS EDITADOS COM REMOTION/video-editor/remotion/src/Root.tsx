import { Composition } from 'remotion';
import { MainComposition } from './Composition';

export const RemotionRoot = () => (
  <>
    <Composition
      id="MainComposition"
      component={MainComposition}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        scenes: [
          { id: '1', type: 'hook', title: 'Hook de Impacto', subtitle: 'Subtítulo aqui', emoji: '🎯', color: { bg: '#050508', accent: '#FFB800', text: '#FFFFFF' }, startLeg: 0, endLeg: 5 },
          { id: '2', type: 'solution', title: 'A Solução', subtitle: 'Descrição', emoji: '💡', color: { bg: '#0A0F1A', accent: '#00D4FF', text: '#FFFFFF' }, startLeg: 5, endLeg: 15 },
          { id: '3', type: 'cta', title: 'Clique Agora', subtitle: 'Não perca', emoji: '🚀', color: { bg: '#1A0A0A', accent: '#FF4444', text: '#FFFFFF' }, startLeg: 15, endLeg: 20 },
        ],
        legendas: [],
      }}
    />
  </>
);
