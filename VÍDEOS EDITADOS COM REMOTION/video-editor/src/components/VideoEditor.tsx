'use client';
import { useState, Dispatch, SetStateAction } from 'react';
import type { ProjectData, Scene } from '@/types';
import SceneList from './SceneList';
import SceneEditor from './SceneEditor';
import VideoPreview from './VideoPreview';

interface Props { projectData: ProjectData; setProjectData: Dispatch<SetStateAction<ProjectData | null>>; }

export default function VideoEditor({ projectData, setProjectData }: Props) {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(projectData.analysis?.scenes[0] ?? null);
  const [isRendering, setIsRendering] = useState(false);

  const handleRender = async () => {
    setIsRendering(true);
    try {
      const res = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: projectData.id }) });
      const data = await res.json();
      setProjectData((prev) => prev ? { ...prev, renderUrl: data.url, status: 'done' } : prev);
    } catch (err) { console.error(err); }
    finally { setIsRendering(false); }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">Cenas</h3>
          <span className="text-xs text-white/30">{projectData.analysis?.scenes.length ?? 0} cenas</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <SceneList scenes={projectData.analysis?.scenes ?? []} selectedId={selectedScene?.id ?? ''} onSelect={setSelectedScene} />
        </div>
        <button onClick={handleRender} disabled={isRendering} className="w-full py-3 rounded-xl font-bold text-sm gold-gradient text-black disabled:opacity-50 transition-opacity">
          {isRendering ? '⏳ Renderizando...' : '🎬 Renderizar Vídeo'}
        </button>
        {projectData.renderUrl && <a href={projectData.renderUrl} download className="block text-center text-xs text-yellow-500 hover:underline">⬇️ Baixar vídeo renderizado</a>}
      </div>
      <div className="flex-1 flex flex-col gap-4"><VideoPreview projectData={projectData} selectedScene={selectedScene} /></div>
      <div className="w-80 flex-shrink-0">
        {selectedScene ? (
          <SceneEditor scene={selectedScene} projectData={projectData} onChange={(updated) => {
            setSelectedScene(updated);
            setProjectData((prev) => {
              if (!prev?.analysis) return prev;
              return { ...prev, analysis: { ...prev.analysis, scenes: prev.analysis.scenes.map((s) => s.id === updated.id ? updated : s) } };
            });
          }} />
        ) : (
          <div className="glass rounded-2xl p-6 h-full flex items-center justify-center text-white/30 text-sm text-center">Selecione uma cena para editar</div>
        )}
      </div>
    </div>
  );
}
