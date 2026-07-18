export interface EditPreset {
  name: string;
  label: string;
  description: string;
  cutAggressiveness: number; // 0-1
  captionStyle: string; // references CAPTION_STYLES key
  musicMood: string;
  musicVolume: number; // 0-1
  scenesFrequency: number; // 0-1 (0=never, 1=very frequent)
  zoomIntensity: number; // 0-1
  transitionStyle: 'minimal' | 'moderate' | 'dynamic';
  pace: 'slow' | 'medium' | 'fast' | 'aggressive';
  /** When true, the pipeline uses the strategic MPX zoom engine (no seesaw) */
  strategicZoom?: boolean;
  /** Force 9:16 1080x1920 output with smart crop for non-vertical sources */
  forceVertical?: boolean;
}

export const PRESETS: Record<string, EditPreset> = {
  'mpx-reels-premium': {
    name: 'mpx-reels-premium',
    label: 'MPX Reels Premium',
    description: 'Padrao oficial MPX: vertical 9:16, zoom estrategico, legendas Bebas Neue com verde neon, ritmo de alta retencao',
    cutAggressiveness: 0.75,
    captionStyle: 'mpx-reels',
    musicMood: 'energetic',
    musicVolume: 0.25,
    scenesFrequency: 0.5,
    zoomIntensity: 0.6,
    transitionStyle: 'moderate',
    pace: 'fast',
    strategicZoom: true,
    forceVertical: true,
  },
  'venda-agressiva': {
    name: 'venda-agressiva',
    label: 'Venda Agressiva',
    description: 'Cortes rapidos, captions impactantes, ritmo intenso para vendas diretas',
    cutAggressiveness: 0.9,
    captionStyle: 'aggressive',
    musicMood: 'energetic',
    musicVolume: 0.3,
    scenesFrequency: 0.7,
    zoomIntensity: 0.8,
    transitionStyle: 'dynamic',
    pace: 'aggressive',
  },
  educativo: {
    name: 'educativo',
    label: 'Educativo',
    description: 'Ritmo moderado, captions claras, ideal para conteudo educacional',
    cutAggressiveness: 0.4,
    captionStyle: 'clean',
    musicMood: 'calm',
    musicVolume: 0.15,
    scenesFrequency: 0.5,
    zoomIntensity: 0.3,
    transitionStyle: 'minimal',
    pace: 'medium',
  },
  premium: {
    name: 'premium',
    label: 'Premium',
    description: 'Visual sofisticado, transicoes suaves, para conteudo de alto valor',
    cutAggressiveness: 0.5,
    captionStyle: 'premium',
    musicMood: 'cinematic',
    musicVolume: 0.2,
    scenesFrequency: 0.6,
    zoomIntensity: 0.5,
    transitionStyle: 'moderate',
    pace: 'medium',
  },
  motivacional: {
    name: 'motivacional',
    label: 'Motivacional',
    description: 'Ritmo crescente, captions bold, musica intensa para inspirar acao',
    cutAggressiveness: 0.7,
    captionStyle: 'bold',
    musicMood: 'inspiring',
    musicVolume: 0.35,
    scenesFrequency: 0.8,
    zoomIntensity: 0.7,
    transitionStyle: 'dynamic',
    pace: 'fast',
  },
};

export const DEFAULT_PRESET = 'mpx-reels-premium';

export function getPreset(name: string): EditPreset {
  return PRESETS[name] ?? PRESETS[DEFAULT_PRESET];
}

// ════════════════════════════════════════════════════════
// MPX_REELS_PREMIUM — Configuracao detalhada do preset oficial
// Padrao de edicao premium da MPX Multiplica.
// Referencias de edicao (Instagram Reels):
//  - https://www.instagram.com/p/DVXfQ9iDVKn/
//  - https://www.instagram.com/p/DU29oKzkbXW/
//  - https://www.instagram.com/p/DYYNQH8DMIC/
//  - https://www.instagram.com/p/DYYMyykEyMK/
// ════════════════════════════════════════════════════════

export const MPX_REELS_PREMIUM = {
  resolution: { width: 1080, height: 1920 },
  aspectRatio: '9:16' as const,
  fps: 30,
  codec: 'h264' as const,
  audioCodec: 'aac' as const,

  // Area segura (px em 1080x1920)
  safeArea: {
    top: 160,
    bottom: 260,
    sides: 70,
  },

  captions: {
    primaryFont: 'Bebas Neue',
    fallbackFonts: ['Space Grotesk', 'Plus Jakarta Sans', 'Arial'],
    fontSize: 84,
    maxLines: 2,
    maxCharsPerLine: 28,
    positionYPercent: 0.72, // entre 68% e 78% da altura
    color: '#FFFFFF',
    accentColor: '#4DFF2E', // verde neon MPX
    strokeColor: '#0A0A0A',
    strokeWidth: 6,
    maxGreenWordsPerBlock: 3,
    animation: 'premium-pop',
  },

  zoom: {
    faceAware: true,
    avoidFaceCrop: true,
    hookZoom: true,
    hookZoomScale: 1.08, // primeiros 3s
    hookZoomRampSeconds: 0.38,
    talkingHeadMaxZoom: 1.08,
    mediumShotMaxZoom: 1.12,
    wideShotMaxZoom: 1.15,
    punchInRampSeconds: 0.4,
    // limite de zooms por faixa de duracao
    maxZoomsShort: 4, // <= 15s
    maxZoomsMedium: 7, // 15-30s
    maxZoomsLong: 10, // > 30s
    minEmphasisForZoom: 0.6,
    noSwingEffect: true,
    focusY: 0.38, // area do rosto
    facePadding: 0.12,
  },

  transitions: {
    default: 'cut' as const,
    allowPremium: true,
    maxFrequency: 'low' as const, // transicao so em mudanca de assunto
  },

  audio: {
    normalizeVoice: true,
    voicePriority: true,
    loudnessTarget: -16,
    musicVolumeDb: [-28, -20] as const,
    sfxVolumeDb: [-22, -16] as const,
  },

  // Identidade visual MPX
  brand: {
    white: '#FFFFFF',
    black: '#0A0A0A',
    darkGray: '#141414',
    darkGray2: '#1C1C1C',
    neonGreen: '#4DFF2E',
    midGray: '#888888',
  },
} as const;
