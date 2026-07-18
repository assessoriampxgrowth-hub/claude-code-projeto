'use client';
import { useEffect, useState } from 'react';
import type { Job, EditPlan } from '@/types';
import type { CaptionBlock, ZoomInstruction } from '@/shared/remotion/types';
import { EditorProvider, useEditor } from '@/store/EditorContext';
import SceneList from './SceneList';
import SceneEditor from './SceneEditor';
import VideoPreview from './VideoPreview';
import DownloadPanel from './DownloadPanel';
import Timeline from './timeline/Timeline';

interface Props {
  jobId: string;
  job: Job | null;
}

export default function VideoEditor({ jobId, job }: Props) {
  return (
    <EditorProvider jobId={jobId}>
      <EditorInner jobId={jobId} initialJob={job} />
    </EditorProvider>
  );
}

function EditorInner({
  jobId,
  initialJob,
}: {
  jobId: string;
  initialJob: Job | null;
}) {
  const { state, dispatch, undo, redo, canUndo, canRedo, selectedScene } = useEditor();
  const [job, setJob] = useState<Job | null>(initialJob);

  useEffect(() => {
    loadJobData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadJobData() {
    try {
      const jobRes = await fetch(`/api/jobs/${jobId}`);
      let freshJob = job;
      if (jobRes.ok) {
        freshJob = await jobRes.json();
        setJob(freshJob);
      }

      let editPlan: EditPlan | null = null;
      let captions: CaptionBlock[] = [];
      let zooms: ZoomInstruction[] = [];

      const filesRes = await fetch(`/api/jobs/${jobId}/files`);
      if (filesRes.ok) {
        const { files } = await filesRes.json();

        const editPlanFile = files.find((f: any) => f.name === 'edit-plan.json');
        if (editPlanFile) {
          const planRes = await fetch(editPlanFile.downloadUrl);
          if (planRes.ok) editPlan = await planRes.json();
        }

        const captionsFile = files.find((f: any) => f.name === 'captions.json');
        if (captionsFile) {
          const capRes = await fetch(captionsFile.downloadUrl);
          if (capRes.ok) captions = await capRes.json();
        }

        const zoomFile = files.find(
          (f: any) => f.name === 'zoom-instructions.json'
        );
        if (zoomFile) {
          const zoomRes = await fetch(zoomFile.downloadUrl);
          if (zoomRes.ok) zooms = await zoomRes.json();
        }
      }

      // Restore any previously saved editor state
      let savedState: any = null;
      try {
        const stateRes = await fetch(`/api/jobs/${jobId}/editor-state`);
        if (stateRes.ok) savedState = await stateRes.json();
      } catch {
        /* no saved state */
      }

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          jobId,
          editPlan: savedState?.editPlan ?? editPlan,
          captions,
          zooms,
          effects: savedState?.effects ?? undefined,
          captionStyleName:
            savedState?.captionStyleName ??
            captions[0]?.style?.name ??
            'clean',
          selectedSceneId: editPlan?.scenes[0]?.id ?? null,
        },
      });
    } catch (err) {
      console.error('Failed to load job data:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const scenes = state.editPlan?.scenes ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Top bar: undo/redo */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#0a0a0f]">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/70 disabled:opacity-30 hover:bg-white/10 transition"
        >
          ↶ Desfazer
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/70 disabled:opacity-30 hover:bg-white/10 transition"
        >
          ↷ Refazer
        </button>
        <div className="flex-1" />
        {state.isDirty && (
          <span className="text-xs text-yellow-400/60">Salvando...</span>
        )}
        {!state.isDirty && !state.isLoading && (
          <span className="text-xs text-green-400/50">Salvo</span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Scene List */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a0f]">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">
                Cenas
              </h3>
              <span className="text-xs text-white/30">{scenes.length} cenas</span>
            </div>
            {state.editPlan && (
              <p className="text-xs text-white/30 truncate">
                {state.editPlan.mainTheme} - {state.editPlan.mood}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <SceneList
              scenes={scenes}
              selectedId={state.selectedSceneId ?? ''}
              onSelect={(s) => dispatch({ type: 'SELECT_SCENE', payload: s.id })}
            />
          </div>

          <div className="border-t border-white/5 p-3">
            <DownloadPanel jobId={jobId} job={job} />
          </div>
        </div>

        {/* Center Panel: Video Preview + Timeline */}
        <div className="flex-1 flex flex-col bg-[#080810] min-w-0">
          <div className="flex-1 min-h-0">
            <VideoPreview jobId={jobId} job={job} />
          </div>
          <Timeline job={job} />
        </div>

        {/* Right Panel: Scene Editor */}
        <div className="w-80 flex-shrink-0 border-l border-white/5 bg-[#0a0a0f] overflow-y-auto">
          {selectedScene ? (
            <SceneEditor />
          ) : (
            <div className="h-full flex items-center justify-center text-white/30 text-sm text-center p-6">
              Selecione uma cena para editar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
