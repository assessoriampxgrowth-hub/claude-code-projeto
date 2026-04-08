'use client';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData } from '@/types';

interface Props { onUploadComplete: (data: ProjectData) => void; }

export default function UploadZone({ onUploadComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('video')) return;
    setIsUploading(true);
    setProgress(10);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('prompt', prompt);
    formData.append('id', uuidv4());
    try {
      setProgress(40);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      setProgress(90);
      const data = await res.json();
      setProgress(100);
      onUploadComplete(data);
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  }, [prompt, onUploadComplete]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <h2 className="text-5xl font-bold mb-4">Edição <span className="gold-text">Automática</span> com IA</h2>
        <p className="text-white/50 text-lg">Suba seu vídeo bruto e a IA cuida do resto</p>
      </div>
      <div
        className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${isDragging ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/10 hover:border-white/20'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input id="fileInput" type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/70">Enviando... {progress}%</p>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div className="bg-yellow-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl font-semibold mb-2">Arraste seu vídeo aqui</p>
            <p className="text-white/40 text-sm">MP4, MOV, HEVC suportados</p>
          </>
        )}
      </div>
      <div className="w-full max-w-2xl">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Prompt opcional: descreva o estilo do vídeo, público-alvo, tom da narração..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 resize-none h-24 focus:outline-none focus:border-yellow-500/50 transition-colors" />
      </div>
    </div>
  );
}
