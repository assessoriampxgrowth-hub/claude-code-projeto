'use client';
import { useState, useEffect } from 'react';
import type { Job } from '@/types';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  downloadUrl: string;
}

interface Props {
  jobId: string;
  job: Job | null;
}

const FILE_ICONS: Record<string, string> = {
  video: '🎬',
  subtitle: '💬',
  image: '🖼️',
  data: '📄',
  file: '📎',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function DownloadPanel({ jobId, job }: Props) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [jobId, job?.status]);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading && files.length === 0) {
    return (
      <div className="text-center text-white/20 text-xs py-2">
        Carregando arquivos...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center text-white/20 text-xs py-2">
        Nenhum arquivo disponivel
      </div>
    );
  }

  // Separate final video from other files
  const videoFile = files.find((f) => f.name === 'final.mp4');
  const otherFiles = files.filter((f) => f.name !== 'final.mp4');

  return (
    <div className="space-y-2">
      {/* Main download button for final video */}
      {videoFile && (
        <a
          href={videoFile.downloadUrl}
          download="final.mp4"
          className="block w-full py-2.5 rounded-xl font-bold text-sm text-center gold-gradient text-black transition-opacity hover:opacity-90"
        >
          Baixar Video ({formatSize(videoFile.size)})
        </a>
      )}

      {/* Other files */}
      {otherFiles.length > 0 && (
        <div className="space-y-1">
          {otherFiles.map((file) => (
            <a
              key={file.name}
              href={file.downloadUrl}
              download={file.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs"
            >
              <span>{FILE_ICONS[file.type] ?? '📎'}</span>
              <span className="flex-1 text-white/70 truncate">{file.name}</span>
              <span className="text-white/30">{formatSize(file.size)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
