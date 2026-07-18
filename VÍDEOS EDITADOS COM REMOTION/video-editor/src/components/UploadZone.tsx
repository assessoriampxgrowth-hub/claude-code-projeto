'use client';
import { useState, useCallback } from 'react';
import { PRESETS } from '@/config/presets';
import type { EditPreset } from '@/config/presets';

interface Props {
  onJobCreated: (jobId: string) => void;
}

const PRESET_ICONS: Record<string, string> = {
  'venda-agressiva': '🔥',
  educativo: '📚',
  premium: '💎',
  motivacional: '🚀',
};

export default function UploadZone({ onJobCreated }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('premium');
  const [customPrompt, setCustomPrompt] = useState('');

  // Toggles
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [silenceCutEnabled, setSilenceCutEnabled] = useState(true);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [scenesEnabled, setScenesEnabled] = useState(true);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('video')) return;
    setIsUploading(true);
    setProgress(10);

    try {
      // Step 1: Upload video
      const formData = new FormData();
      formData.append('video', file);
      setProgress(30);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { videoPath } = await uploadRes.json();
      setProgress(60);

      // Step 2: Create job with selected config
      const jobRes = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath,
          preset: selectedPreset,
          musicEnabled,
          scenesEnabled,
          aggressiveCuts: silenceCutEnabled,
          zoomEnabled,
          customPrompt: customPrompt || undefined,
        }),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json();
        throw new Error(err.error || 'Job creation failed');
      }
      const { id } = await jobRes.json();
      setProgress(100);

      onJobCreated(id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [selectedPreset, musicEnabled, scenesEnabled, silenceCutEnabled, zoomEnabled, customPrompt, onJobCreated]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-5xl font-bold mb-4">
          Edicao <span className="gold-text">Automatica</span> com IA
        </h2>
        <p className="text-white/50 text-lg">
          Suba seu video bruto e a IA cuida do resto
        </p>
      </div>

      {/* Preset Selector */}
      <div className="w-full max-w-3xl">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3 text-center">
          Estilo de Edicao
        </p>
        <div className="grid grid-cols-4 gap-3">
          {Object.values(PRESETS).map((preset: EditPreset) => (
            <button
              key={preset.name}
              onClick={() => setSelectedPreset(preset.name)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPreset === preset.name
                  ? 'border-yellow-500/50 bg-yellow-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-2xl mb-2">
                {PRESET_ICONS[preset.name] ?? '🎬'}
              </div>
              <p className="font-semibold text-sm text-white/90">
                {preset.label}
              </p>
              <p className="text-xs text-white/40 mt-1 line-clamp-2">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-yellow-500 bg-yellow-500/5'
            : 'border-white/10 hover:border-white/20'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/70">Enviando e criando job... {progress}%</p>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-yellow-500 h-1 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl font-semibold mb-2">Arraste seu video aqui</p>
            <p className="text-white/40 text-sm">MP4, MOV, WebM suportados (max 500MB)</p>
          </>
        )}
      </div>

      {/* Toggles */}
      <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-center">
        <Toggle label="Legendas" enabled={captionsEnabled} onChange={setCaptionsEnabled} />
        <Toggle label="Musica" enabled={musicEnabled} onChange={setMusicEnabled} />
        <Toggle label="Cortar Silencios" enabled={silenceCutEnabled} onChange={setSilenceCutEnabled} />
        <Toggle label="Zoom Dinamico" enabled={zoomEnabled} onChange={setZoomEnabled} />
        <Toggle label="Cenas de Apoio" enabled={scenesEnabled} onChange={setScenesEnabled} />
      </div>

      {/* Custom Prompt */}
      <div className="w-full max-w-2xl">
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Prompt opcional: descreva o estilo do video, publico-alvo, tom da narracao..."
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 resize-none h-20 focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
        enabled
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-white/5 text-white/30 border border-white/10'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full transition-colors ${
          enabled ? 'bg-yellow-500' : 'bg-white/20'
        }`}
      />
      {label}
    </button>
  );
}
