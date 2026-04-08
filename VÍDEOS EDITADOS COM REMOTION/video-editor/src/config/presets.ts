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
}

export const PRESETS: Record<string, EditPreset> = {
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

export const DEFAULT_PRESET = 'premium';

export function getPreset(name: string): EditPreset {
  return PRESETS[name] ?? PRESETS[DEFAULT_PRESET];
}
