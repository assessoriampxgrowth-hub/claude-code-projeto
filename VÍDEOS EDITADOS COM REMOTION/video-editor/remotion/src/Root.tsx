import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import type { MainCompositionProps } from '../../src/shared/remotion/types';
import { DEFAULT_EFFECTS } from '../../src/shared/remotion/types';

const defaultCaptionStyle = {
  name: 'clean',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 600,
  fontSize: 42,
  color: '#FFFFFF',
  highlightColor: '#00D4FF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.6,
  position: 'bottom' as const,
  uppercase: false,
  maxWordsPerLine: 5,
  animation: 'fade' as const,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 4,
};

export const RemotionRoot = () => (
  <>
    <Composition<MainCompositionProps>
      id="MainComposition"
      component={MainComposition}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        videoSrc: '',
        captions: [],
        zooms: [],
        scenes: [],
        captionStyle: defaultCaptionStyle,
        fps: 30,
        effects: DEFAULT_EFFECTS,
      }}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: props.fps
          ? Math.ceil(30 * props.fps)
          : 900,
      })}
    />
  </>
);
