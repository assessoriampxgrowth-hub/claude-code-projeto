'use client';
import { useMemo } from 'react';
import type { Job } from '@/types';
import { useEditor } from '@/store/EditorContext';

interface Props {
  job: Job | null;
}

const TYPE_COLORS: Record<string, string> = {
  hook: '#EAB308',
  problem: '#EF4444',
  solution: '#22C55E',
  benefit: '#3B82F6',
  proof: '#A855F7',
  cta: '#F97316',
  narration: '#6B7280',
  title: '#FACC15',
  transition: '#374151',
};

export default function Timeline({ job }: Props) {
  const { state, dispatch, selectedScene } = useEditor();
  const duration = job?.videoDuration ?? 30;
  const scenes = state.editPlan?.scenes ?? [];

  // Time ruler ticks every 5 seconds
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let t = 0; t <= duration; t += 5) out.push(t);
    return out;
  }, [duration]);

  const pct = (t: number) => `${(t / duration) * 100}%`;

  return (
    <div className="border-t border-white/5 bg-[#0a0a0f] p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
          Timeline
        </h3>
        <span className="text-[10px] text-white/30">{duration.toFixed(1)}s</span>
      </div>

      {/* Ruler */}
      <div className="relative h-4 mb-1">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: pct(t) }}
          >
            <div className="w-px h-2 bg-white/15" />
            <span className="text-[9px] text-white/25 mt-0.5">{t}s</span>
          </div>
        ))}
      </div>

      {/* Scenes track */}
      <div className="relative h-9 bg-white/[0.02] rounded-md overflow-hidden mb-1">
        {scenes.map((s) => {
          const left = (s.startTime / duration) * 100;
          const width = ((s.endTime - s.startTime) / duration) * 100;
          const active = selectedScene?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => dispatch({ type: 'SELECT_SCENE', payload: s.id })}
              className="absolute top-0 h-full border-r border-black/40 transition-all hover:brightness-125"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: (TYPE_COLORS[s.type] ?? '#6B7280') + (active ? 'FF' : '66'),
                outline: active ? '2px solid #FACC15' : 'none',
                outlineOffset: '-2px',
              }}
              title={`${s.type}: ${s.title}`}
            >
              <span className="text-[8px] text-white/90 px-1 truncate block leading-9">
                {s.type}
              </span>
            </button>
          );
        })}
      </div>

      {/* Captions track */}
      <div className="relative h-3 bg-white/[0.02] rounded-md overflow-hidden mb-1">
        {state.captions.map((c, i) => {
          const left = (c.startTime / duration) * 100;
          const width = ((c.endTime - c.startTime) / duration) * 100;
          return (
            <div
              key={c.id || i}
              className="absolute top-0 h-full bg-cyan-500/40 border-r border-black/30"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
            />
          );
        })}
      </div>

      {/* Zoom track */}
      <div className="relative h-3 bg-white/[0.02] rounded-md overflow-hidden">
        {state.zooms.map((z, i) => {
          const left = (z.startTime / duration) * 100;
          const width = ((z.endTime - z.startTime) / duration) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-purple-500/40 border-r border-black/30"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
              title={`Zoom ${z.scale.toFixed(2)}x`}
            />
          );
        })}
      </div>

      {/* Track labels */}
      <div className="flex gap-3 mt-1.5">
        <Legend color="#6B7280" label="Cenas" />
        <Legend color="#06B6D4" label="Legendas" />
        <Legend color="#A855F7" label="Zoom" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[9px] text-white/30">{label}</span>
    </div>
  );
}
