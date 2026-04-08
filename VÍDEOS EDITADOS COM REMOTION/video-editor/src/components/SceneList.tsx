'use client';
import type { Scene } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  hook: 'bg-yellow-500/20 text-yellow-400', problem: 'bg-red-500/20 text-red-400',
  solution: 'bg-green-500/20 text-green-400', benefit: 'bg-blue-500/20 text-blue-400',
  proof: 'bg-purple-500/20 text-purple-400', cta: 'bg-orange-500/20 text-orange-400',
  narration: 'bg-white/10 text-white/60', title: 'bg-yellow-500/10 text-yellow-300',
  transition: 'bg-white/5 text-white/30',
};

interface Props { scenes: Scene[]; selectedId: string; onSelect: (scene: Scene) => void; }

export default function SceneList({ scenes, selectedId, onSelect }: Props) {
  return (
    <>
      {scenes.map((scene, i) => (
        <button key={scene.id} onClick={() => onSelect(scene)} className={`w-full text-left glass rounded-xl p-3 transition-all hover:border-white/20 ${selectedId === scene.id ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/30 text-xs w-4">{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[scene.type] ?? 'bg-white/10 text-white/50'}`}>{scene.type}</span>
            {scene.emoji && <span className="text-sm">{scene.emoji}</span>}
          </div>
          <p className="text-sm font-semibold text-white/90 truncate">{scene.title}</p>
          {scene.subtitle && <p className="text-xs text-white/40 truncate mt-0.5">{scene.subtitle}</p>}
        </button>
      ))}
    </>
  );
}
