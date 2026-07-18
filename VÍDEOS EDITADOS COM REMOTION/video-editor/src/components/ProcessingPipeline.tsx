'use client';
import { useEffect, useState, useRef } from 'react';
import type { Job, JobStep } from '@/types';

interface Props {
  jobId: string;
  onComplete: (job: Job) => void;
}

const STEP_META: Record<string, { label: string; desc: string; emoji: string }> = {
  normalize: { label: 'Normalizando video', desc: 'H.264, CFR 30fps, yuv420p', emoji: '⚙️' },
  'extract-audio': { label: 'Extraindo audio', desc: 'WAV PCM para transcricao', emoji: '🔊' },
  transcribe: { label: 'Transcrevendo', desc: 'Whisper com timestamps por palavra', emoji: '🎙️' },
  analyze: { label: 'Analisando conteudo', desc: 'Claude criando plano de edicao', emoji: '🤖' },
  'detect-silences': { label: 'Detectando silencios', desc: 'Corte automatico de pausas', emoji: '✂️' },
  'generate-captions': { label: 'Gerando legendas', desc: 'Legendas animadas por palavra', emoji: '💬' },
  'generate-scenes': { label: 'Configurando cenas', desc: 'Zoom, composicao, assets', emoji: '🎨' },
  'select-music': { label: 'Selecionando musica', desc: 'Trilha por mood do preset', emoji: '🎵' },
  'mix-audio': { label: 'Mixando audio', desc: 'Voz + musica com ducking', emoji: '🎛️' },
  render: { label: 'Renderizando', desc: 'Remotion render headless', emoji: '🎬' },
  'generate-outputs': { label: 'Gerando outputs', desc: 'Thumbnail, SRT, VTT, metadata', emoji: '📦' },
};

export default function ProcessingPipeline({ jobId, onComplete }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch job status');
        const data: Job = await res.json();
        setJob(data);

        if (data.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete(data);
        } else if (data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError(data.error ?? 'Pipeline failed');
        }
      } catch {
        // Retry on next interval
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete]);

  const handleRetry = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Retry failed');
      // Restart polling
      intervalRef.current = setInterval(async () => {
        const r = await fetch(`/api/jobs/${jobId}`);
        const data: Job = await r.json();
        setJob(data);
        if (data.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete(data);
        } else if (data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError(data.error ?? 'Pipeline failed');
        }
      }, 2000);
    } catch (err) {
      setError(String(err));
    }
  };

  const steps = job?.steps ?? [];
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalSteps = steps.length || 11;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Processando seu video</h2>
        <p className="text-white/40">
          {completedCount}/{totalSteps} etapas concluidas
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-xs text-white/40 mb-2">
          <span>Progresso geral</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="w-full max-w-lg space-y-2">
        {steps.map((step) => {
          const meta = STEP_META[step.name] ?? {
            label: step.name,
            desc: '',
            emoji: '⚪',
          };
          return (
            <StepRow key={step.name} step={step} meta={meta} />
          );
        })}
      </div>

      {/* Error + Retry */}
      {error && (
        <div className="w-full max-w-lg bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

function StepRow({
  step,
  meta,
}: {
  step: JobStep;
  meta: { label: string; desc: string; emoji: string };
}) {
  const isDone = step.status === 'completed';
  const isActive = step.status === 'running';
  const isFailed = step.status === 'failed';

  return (
    <div
      className={`rounded-xl p-3 flex items-center gap-3 transition-all border ${
        isActive
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : isFailed
            ? 'border-red-500/30 bg-red-500/5'
            : isDone
              ? 'border-green-500/10 bg-white/[0.02]'
              : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
          isDone
            ? 'bg-green-500/20 text-green-400'
            : isActive
              ? 'bg-yellow-500/20 text-yellow-400'
              : isFailed
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-white/20'
        }`}
      >
        {isDone ? '✓' : isFailed ? '✕' : isActive ? (
          <span className="animate-pulse">{meta.emoji}</span>
        ) : (
          meta.emoji
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm ${
            isDone
              ? 'text-green-400/80'
              : isActive
                ? 'text-yellow-400'
                : isFailed
                  ? 'text-red-400'
                  : 'text-white/30'
          }`}
        >
          {meta.label}
        </p>
        <p className="text-white/30 text-xs truncate">
          {step.details ?? (isFailed ? step.error : meta.desc)}
        </p>
      </div>
      {isActive && (
        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  );
}
