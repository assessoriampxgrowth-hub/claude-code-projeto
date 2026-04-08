'use client';
import { useState } from 'react';
import type { Scene, ProjectData, SceneType } from '@/types';

interface Props { scene: Scene; projectData: ProjectData; onChange: (scene: Scene) => void; }
const SCENE_TYPES: SceneType[] = ['hook','problem','solution','benefit','proof','cta','narration','title','transition'];

export default function SceneEditor({ scene, projectData, onChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const update = (patch: Partial<Scene>) => onChange({ ...scene, ...patch });

  const generateIllustration = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/illustrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sceneId: scene.id, prompt: scene.illustrationPrompt ?? scene.title, projectId: projectData.id }) });
      const data = await res.json();
      update({ illustrationUrl: data.url });
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  return (
    <div className="glass rounded-2xl p-5 h-full overflow-y-auto space-y-4">
      <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">Editar Cena</h3>
      <div className="space-y-3">
        <div><label className="text-xs text-white/40 mb-1 block">Tipo</label>
          <select value={scene.type} onChange={(e) => update({ type: e.target.value as SceneType })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500/50">
            {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select></div>
        <div><label className="text-xs text-white/40 mb-1 block">Título</label>
          <input value={scene.title} onChange={(e) => update({ title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Subtítulo</label>
          <input value={scene.subtitle ?? ''} onChange={(e) => update({ subtitle: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Corpo</label>
          <textarea value={scene.body ?? ''} onChange={(e) => update({ body: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:border-yellow-500/50" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Emoji</label>
          <input value={scene.emoji ?? ''} onChange={(e) => update({ emoji: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Cor de Fundo</label>
          <input type="color" value={scene.color.bg} onChange={(e) => update({ color: { ...scene.color, bg: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border border-white/10" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Cor Accent</label>
          <input type="color" value={scene.color.accent} onChange={(e) => update({ color: { ...scene.color, accent: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border border-white/10" /></div>
        <div><label className="text-xs text-white/40 mb-1 block">Prompt de Ilustração</label>
          <div className="flex gap-2">
            <input value={scene.illustrationPrompt ?? ''} onChange={(e) => update({ illustrationPrompt: e.target.value })} placeholder="Descreva a ilustração..." className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-yellow-500/50" />
            <button onClick={generateIllustration} disabled={generating} className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors disabled:opacity-50">{generating ? '...' : '✨'}</button>
          </div></div>
        {scene.illustrationUrl && <img src={scene.illustrationUrl} alt="illustration" className="w-full rounded-lg" />}
      </div>
    </div>
  );
}
