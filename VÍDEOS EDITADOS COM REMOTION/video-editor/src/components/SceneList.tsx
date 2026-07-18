'use client';
import type { EditPlanScene } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  hook: 'bg-yellow-500/20 text-yellow-400',
  problem: 'bg-red-500/20 text-red-400',
  solution: 'bg-green-500/20 text-green-400',
  benefit: 'bg-blue-500/20 text-blue-400',
  proof: 'bg-purple-500/20 text-purple-400',
  cta: 'bg-orange-500/20 text-orange-400',
  narration: 'bg-white/10 text-white/60',
  title: 'bg-yellow-500/10 text-yellow-300',
  transition: 'bg-white/5 text-white/30',
};

interface Props {
  scenes: EditPlanScene[];
  selectedId: string;
  onSelect: (scene: EditPlanScene) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SceneList({ scenes, selectedId, onSelect }: Props) {
  return (
    <>
      {scenes.map((scene, i) => {
        const duration = scene.endTime - scene.startTime;
        return (
          <button
            key={scene.id}
            onClick={() => onSelect(scene)}
            className={`w-full text-left rounded-xl p-3 transition-all border hover:border-white/20 ${
              selectedId === scene.id
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-white/5 bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/30 text-xs w-4">{i + 1}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  TYPE_COLORS[scene.type] ?? 'bg-white/10 text-white/50'
                }`}
              >
                {scene.type}
              </span>
              <span className="text-xs text-white/20 ml-auto">
                {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
              </span>
            </div>
            <p className="text-sm font-semibold text-white/90 truncate">
              {scene.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500/40 rounded-full"
                  style={{ width: `${scene.emphasis * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-white/20">
                {duration.toFixed(1)}s
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}
