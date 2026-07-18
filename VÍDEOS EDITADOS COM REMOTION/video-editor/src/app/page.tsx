'use client';
import { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import ProcessingPipeline from '@/components/ProcessingPipeline';
import VideoEditor from '@/components/VideoEditor';
import type { Job } from '@/types';

type Stage = 'upload' | 'processing' | 'editor';

export default function Home() {
  const [stage, setStage] = useState<Stage>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  return (
    <main className="min-h-screen bg-[#050508]">
      <header className="border-b border-white/5 px-8 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
              <span className="text-black font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg font-bold">
              <span className="gold-text">MPX</span> Video Editor
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className={`w-2 h-2 rounded-full ${stage === 'upload' ? 'bg-yellow-500' : stage === 'processing' || stage === 'editor' ? 'bg-green-500' : 'bg-white/20'}`} />
            <span>Upload</span>
            <div className="w-8 h-px bg-white/10" />
            <div className={`w-2 h-2 rounded-full ${stage === 'processing' ? 'bg-yellow-500' : stage === 'editor' ? 'bg-green-500' : 'bg-white/20'}`} />
            <span>Processando</span>
            <div className="w-8 h-px bg-white/10" />
            <div className={`w-2 h-2 rounded-full ${stage === 'editor' ? 'bg-yellow-500' : 'bg-white/20'}`} />
            <span>Editor</span>
          </div>
          {stage !== 'upload' && (
            <button
              onClick={() => { setStage('upload'); setJobId(null); setJob(null); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Novo Projeto
            </button>
          )}
        </div>
      </header>

      <div className={stage === 'editor' ? '' : 'max-w-screen-2xl mx-auto px-8 py-8'}>
        {stage === 'upload' && (
          <UploadZone
            onJobCreated={(id) => {
              setJobId(id);
              setStage('processing');
            }}
          />
        )}
        {stage === 'processing' && jobId && (
          <ProcessingPipeline
            jobId={jobId}
            onComplete={(completedJob) => {
              setJob(completedJob);
              setStage('editor');
            }}
          />
        )}
        {stage === 'editor' && jobId && (
          <VideoEditor jobId={jobId} job={job} />
        )}
      </div>
    </main>
  );
}
