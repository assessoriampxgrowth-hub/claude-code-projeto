export type JobStatus =
  | 'uploaded'
  | 'normalizing'
  | 'transcribing'
  | 'analyzing'
  | 'generating-assets'
  | 'selecting-music'
  | 'audio-mixing'
  | 'editing'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface JobStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number; // 0-100
  details?: string;
}

export interface JobConfig {
  preset: string;
  captionStyle: string;
  musicEnabled: boolean;
  musicMood?: string;
  scenesEnabled: boolean;
  aggressiveCuts: boolean;
  zoomEnabled: boolean;
  customPrompt?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  config: JobConfig;
  steps: JobStep[];
  createdAt: string;
  updatedAt: string;

  // Paths
  originalVideoPath?: string;
  normalizedVideoPath?: string;
  audioPath?: string;
  mixedAudioPath?: string;
  finalVideoPath?: string;
  thumbnailPath?: string;

  // Data
  transcriptionPath?: string;
  editPlanPath?: string;

  // Results
  outputFiles?: { name: string; path: string; type: string }[];

  // Metadata
  videoDuration?: number;
  videoWidth?: number;
  videoHeight?: number;
  error?: string;
}

export interface TranscriptionSegment {
  index: number;
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number }[];
}

export interface EditPlanScene {
  id: string;
  type: string;
  startTime: number;
  endTime: number;
  title: string;
  subtitle?: string;
  body?: string;
  emoji?: string;
  emphasis: number; // 0-1, how important this scene is
  illustrationPrompt?: string;
  zoomSuggestion?: 'in' | 'out' | 'none';
  transitionIn?: string;
  transitionOut?: string;
}

export interface EditPlan {
  format: string;
  mainTheme: string;
  targetDuration?: number;
  scenes: EditPlanScene[];
  highlights: string[]; // keywords to highlight in captions
  mood: string;
  pace: 'slow' | 'medium' | 'fast' | 'aggressive';
  musicMood?: string;
}

export const PIPELINE_STEPS = [
  'normalize',
  'extract-audio',
  'transcribe',
  'analyze',
  'detect-silences',
  'generate-captions',
  'generate-scenes',
  'select-music',
  'mix-audio',
  'render',
  'generate-outputs',
] as const;

export type PipelineStepName = (typeof PIPELINE_STEPS)[number];

export function createInitialSteps(): JobStep[] {
  return PIPELINE_STEPS.map((name) => ({
    name,
    status: 'pending' as const,
  }));
}
