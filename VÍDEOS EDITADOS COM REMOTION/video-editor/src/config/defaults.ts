import path from 'path';

/** Root directory for all uploads and job data */
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/** FFmpeg defaults */
export const FFMPEG_DEFAULTS = {
  videoCodec: 'libx264' as const,
  audioCodec: 'aac' as const,
  fps: 30,
  pixelFormat: 'yuv420p' as const,
  audioBitrate: '192k',
  audioSampleRate: 44100,
  preset: 'medium' as const,
  crf: 23,
};

/** Silence detection defaults */
export const SILENCE_DEFAULTS = {
  /** dB threshold for silence (e.g. "-30dB") */
  threshold: '-30dB',
  /** Minimum silence duration in seconds */
  minDuration: 0.5,
  /** Padding in milliseconds to keep around speech */
  paddingMs: 100,
};

/** Audio mixing defaults */
export const AUDIO_DEFAULTS = {
  /** Background music volume relative to voice (0-1) */
  musicVolume: 0.2,
  /** Whether to apply ducking (lower music when voice is present) */
  duckingEnabled: true,
  /** How much to duck the music in dB */
  duckAmount: 14,
  /** Loudness normalization target in LUFS */
  loudnessTarget: -16,
  /** Loudness range target */
  loudnessRange: 11,
  /** True peak limit */
  truePeak: -1.5,
};

/** Transcription defaults */
export const TRANSCRIPTION_DEFAULTS = {
  model: 'whisper-1',
  language: 'pt',
  responseFormat: 'verbose_json' as const,
};

/** Rendering defaults */
export const RENDER_DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 30,
  codec: 'h264' as const,
  pixelFormat: 'yuv420p' as const,
  crf: 18,
};

/** Caption defaults */
export const CAPTION_DEFAULTS = {
  maxWordsPerLine: 4,
  minWordDurationMs: 200,
  defaultHighlightKeywords: [
    'gratis',
    'gratuito',
    'agora',
    'urgente',
    'descubra',
    'segredo',
    'resultado',
    'lucro',
    'dinheiro',
    'garantia',
    'exclusivo',
    'limitado',
    'transformar',
    'incrivel',
  ],
};

/** Job limits */
export const JOB_LIMITS = {
  /** Max video file size in bytes (500MB) */
  maxFileSize: 500 * 1024 * 1024,
  /** Max video duration in seconds (30 min) */
  maxDuration: 1800,
  /** How many recent jobs to list */
  defaultListLimit: 50,
};
