'use client';
import type { ProjectData, Scene } from '@/types';

interface Props { projectData: ProjectData; selectedScene: Scene | null; }

export default function VideoPreview({ projectData, selectedScene }: Props) {
  return (
    <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">Preview</h3>
        <span className="text-xs text-white/30">1080 × 1920 · 30fps</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '9/16', height: '100%', maxHeight: '600px', background: selectedScene?.color.bg ?? '#050508' }}>
          {selectedScene && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              {selectedScene.emoji && <span className="text-6xl mb-4">{selectedScene.emoji}</span>}
              <h2 className="text-2xl font-bold mb-3" style={{ color: selectedScene.color.accent }}>{selectedScene.title}</h2>
              {selectedScene.subtitle && <p className="text-white/80 text-sm mb-2">{selectedScene.subtitle}</p>}
              {selectedScene.body && <p className="text-white/50 text-xs">{selectedScene.body}</p>}
              {selectedScene.illustrationUrl && <img src={selectedScene.illustrationUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: selectedScene.color.accent }} />
            </div>
          )}
          {!selectedScene && <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">Selecione uma cena</div>}
        </div>
      </div>
    </div>
  );
}
