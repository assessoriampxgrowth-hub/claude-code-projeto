'use client';
import { useMemo } from 'react';
import { Player } from '@remotion/player';
import { PlayerComposition } from './remotion/PlayerComposition';
import type { Job } from '@/types';
import type { MainCompositionProps } from '@/shared/remotion/types';
import { useEditor } from '@/store/EditorContext';
import { CAPTION_STYLES } from '@/services/captions/styles';

interface Props {
  jobId: string;
  job: Job | null;
}

export default function VideoPreview({ jobId, job }: Props) {
  const { state, selectedScene } = useEditor();

  const videoSrc = `/api/video?id=${jobId}`;
  const fps = 30;
  const duration = job?.videoDuration ?? 30;
  const durationInFrames = Math.max(1, Math.ceil(duration * fps));
  const width = job?.videoWidth ?? 1080;
  const height = job?.videoHeight ?? 1920;

  // The currently selected global caption style
  const captionStyle = useMemo(() => {
    return CAPTION_STYLES[state.captionStyleName] ?? CAPTION_STYLES.clean;
  }, [state.captionStyleName]);

  // Apply the selected style to every caption block
  const styledCaptions = useMemo(() => {
    return state.captions.map((c) => ({ ...c, style: captionStyle as any }));
  }, [state.captions, captionStyle]);

  const scenesForRemotion = useMemo(() => {
    return (state.editPlan?.scenes ?? []).map((s) => ({
      id: s.id,
      type: s.type,
      startTime: s.startTime,
      endTime: s.endTime,
      title: s.title,
      emphasis: s.emphasis,
      transitionIn: s.transitionIn as any,
      transitionOut: s.transitionOut as any,
    }));
  }, [state.editPlan]);

  const inputProps: MainCompositionProps = useMemo(
    () => ({
      videoSrc,
      captions: styledCaptions,
      zooms: state.zooms,
      scenes: scenesForRemotion,
      captionStyle: captionStyle as any,
      fps,
      effects: state.effects,
    }),
    [videoSrc, styledCaptions, state.zooms, scenesForRemotion, captionStyle, state.effects]
  );

  const initialFrame = selectedScene
    ? Math.floor(selectedScene.startTime * fps)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">
          Preview
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            {width} x {height} - {fps}fps
          </span>
          <span className="text-xs text-white/30">{duration.toFixed(1)}s</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl bg-black"
          style={{
            aspectRatio: `${width}/${height}`,
            height: '100%',
            maxHeight: '100%',
          }}
        >
          <Player
            key={`${state.captionStyleName}-${state.effects.colorGrading}`}
            component={PlayerComposition as any}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            compositionWidth={width}
            compositionHeight={height}
            fps={fps}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay={false}
            loop
            initialFrame={initialFrame}
          />
        </div>
      </div>
    </div>
  );
}
