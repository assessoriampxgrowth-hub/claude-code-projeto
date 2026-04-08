'use client';
import { useEffect, useState } from 'react';
import type { ProjectData } from '@/types';

interface Props { projectData: ProjectData; onComplete: (data: ProjectData) => void; }

const STEPS = [
  { key: 'normalizing', label: 'Normalizando vídeo', desc: 'Convertendo para H.264 CFR 30fps', emoji: '⚙️' },
  { key: 'transcribing', label: 'Transcrevendo áudio', desc: 'Whisper detectando fala e timestamps', emoji: '🎙️' },
  { key: 'analyzing', label: 'Analisando conteúdo', desc: 'Claude criando estrutura de cenas', emoji: '🤖' },
  { key: 'ready', label: 'Pronto para editar', desc: 'Projeto carregado com sucesso', emoji: '✅' },
];

export default function ProcessingPipeline({ projectData, onComplete }: Props) {
  const [currentData, setCurrentData] = useState(projectData);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/process?id=${currentData.id}`);
        const data: ProjectData = await res.json();
        setCurrentData(data);
        if (data.status === 'ready') { onComplete(data); }
        else if (data.status === 'error') { console.error(data.error); }
        else { setTimeout(poll, 2000); }
      } catch { setTimeout(poll, 3000); }
    };
    poll();
  }, []);

  const currentStepIdx = STEPS.findIndex(s => s.key === currentData.status);
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Processando seu vídeo</h2>
        <p className="text-white/40">Isso pode levar alguns minutos...</p>
      </div>
      <div className="w-full max-w-lg space-y-4">
        {STEPS.map((step, i) => {
          const isDone = i < currentStepIdx || currentData.status === 'ready';
          const isActive = step.key === currentData.status;
          return (
            <div key={step.key} className={`glass rounded-xl p-4 flex items-center gap-4 transition-all ${isActive ? 'border-yellow-500/30' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isDone ? 'bg-green-500/20 text-green-400' : isActive ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/20'}`}>
                {isDone ? '✓' : isActive ? <span className="animate-pulse">{step.emoji}</span> : step.emoji}
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isDone ? 'text-green-400' : isActive ? 'text-yellow-400' : 'text-white/30'}`}>{step.label}</p>
                <p className="text-white/30 text-xs">{step.desc}</p>
              </div>
              {isActive && <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
