export interface SrtEntry {
  index: number;
  start: string;
  end: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface SceneColor {
  bg: string;
  accent: string;
  text: string;
}

export type SceneType = 'hook' | 'problem' | 'solution' | 'benefit' | 'proof' | 'cta' | 'narration' | 'title' | 'transition';

export interface Scene {
  id: string;
  type: SceneType;
  startLeg: number;
  endLeg: number;
  title: string;
  subtitle?: string;
  body?: string;
  emoji?: string;
  color: SceneColor;
  illustrationUrl?: string;
  illustrationPrompt?: string;
}

export interface VideoAnalysis {
  format: string;
  palette: SceneColor[];
  scenes: Scene[];
  totalLegendas: number;
  mainTheme: string;
}

export interface ProjectData {
  id: string;
  videoPath?: string;
  videoUrl?: string;
  normalizedPath?: string;
  transcription?: SrtEntry[];
  analysis?: VideoAnalysis;
  status: 'uploading' | 'normalizing' | 'transcribing' | 'analyzing' | 'ready' | 'rendering' | 'done' | 'error';
  error?: string;
  prompt?: string;
  renderUrl?: string;
}
