'use client';
import { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import ProcessingPipeline from '@/components/ProcessingPipeline';
import VideoEditor from '@/components/VideoEditor';
import type { ProjectData } from '@/types';

type Stage = 'upload' | 'processing' | 'editor';

export default function Home() {
  const [stage, setStage] = useState<Stage>('upload');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  return (
    <main className="min-h-screen bg-[#050508]">
      <header className="border-b border-white/5 px-8 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
              <span className="text-black font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg font-bold">
              <span className="gold-text">Video</span> Editor
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className={`w-2 h-2 rounded-full ${stage === 'upload' ? 'bg-yellow-500' : 'bg-white/20'}`} />
            <span>Upload</span>
            <div className="w-8 h-px bg-white/10" />
            <div className={`w-2 h-2 rounded-full ${stage === 'processing' ? 'bg-yellow-500' : 'bg-white/20'}`} />
            <span>Processando</span>
            <div className="w-8 h-px bg-white/10" />
            <div className={`w-2 h-2 rounded-full ${stage === 'editor' ? 'bg-yellow-500' : 'bg-white/20'}`} />
            <span>Editor</span>
          </div>
        </div>
      </header>
      <div className="max-w-screen-2xl mx-auto px-8 py-8">
        {stage === 'upload' && (
          <UploadZone onUploadComplete={(data) => { setProjectData(data); setStage('processing'); }} />
        )}
        {stage === 'processing' && projectData && (
          <ProcessingPipeline projectData={projectData} onComplete={(data) => { setProjectData(data); setStage('editor'); }} />
        )}
        {stage === 'editor' && projectData && (
          <VideoEditor projectData={projectData} setProjectData={setProjectData} />
        )}
      </div>
    </main>
  );
}
