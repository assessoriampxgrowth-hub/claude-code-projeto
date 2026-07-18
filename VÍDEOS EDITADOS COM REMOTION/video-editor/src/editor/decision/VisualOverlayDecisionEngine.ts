import type { TranscriptionSegment, EditPlanScene } from '@/services/pipeline/types';

export type OverlayMode = 'overlay' | 'split';

export interface OverlaySuggestion {
  sceneId: string;
  start: number;
  end: number;
  mode: OverlayMode;
  /** Query de busca para Pexels/Pixabay */
  query: string;
  /** Categoria semântica detectada */
  topic: string;
  reason: string;
}

/**
 * Mapa semântico — termos da fala → tema de B-roll + query de busca.
 * Cada entrada tem palavras-gatilho (normalizadas) e a query de asset.
 */
const SEMANTIC_MAP: {
  topic: string;
  triggers: string[];
  query: string;
  mode: OverlayMode;
}[] = [
  {
    topic: 'venda',
    triggers: ['venda', 'vender', 'vendas', 'comprar', 'compra', 'checkout', 'cliente comprando'],
    query: 'customer payment checkout sale',
    mode: 'overlay',
  },
  {
    topic: 'whatsapp',
    triggers: ['whatsapp', 'whats', 'mensagem', 'chat', 'conversa'],
    query: 'whatsapp phone chat mockup',
    mode: 'overlay',
  },
  {
    topic: 'trafego',
    triggers: ['trafego', 'tráfego', 'anuncio', 'anúncio', 'anuncios', 'campanha', 'ads'],
    query: 'social media ads dashboard analytics',
    mode: 'overlay',
  },
  {
    topic: 'clientes',
    triggers: ['cliente', 'clientes', 'atendimento', 'loja', 'publico', 'público'],
    query: 'customers store shopping people',
    mode: 'overlay',
  },
  {
    topic: 'dinheiro',
    triggers: ['dinheiro', 'faturamento', 'faturar', 'lucro', 'pix', 'pagamento', 'receita'],
    query: 'money payment growth chart',
    mode: 'overlay',
  },
  {
    topic: 'processo',
    triggers: ['processo', 'metodo', 'método', 'passo', 'sistema', 'estrategia', 'estratégia'],
    query: 'workflow checklist process diagram',
    mode: 'overlay',
  },
  {
    topic: 'resultado',
    triggers: ['resultado', 'resultados', 'crescer', 'crescimento', 'escala', 'escalar'],
    query: 'business growth success graph rising',
    mode: 'overlay',
  },
  {
    topic: 'antes-depois',
    triggers: ['antes e depois', 'antes', 'depois', 'comparacao', 'comparação', 'transformacao', 'transformação'],
    query: 'before after comparison',
    mode: 'split',
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ');
}

/**
 * VisualOverlayDecisionEngine — sugere B-roll/overlay APENAS quando há
 * relação semântica clara com a fala. Sem relação → não sugere nada.
 *
 * Uma sugestão por cena no máximo, para não poluir o vídeo.
 */
export function decideOverlays(
  scenes: EditPlanScene[],
  segments: TranscriptionSegment[]
): OverlaySuggestion[] {
  const suggestions: OverlaySuggestion[] = [];

  for (const scene of scenes) {
    // Texto falado dentro da cena
    const sceneText = segments
      .filter((s) => s.start >= scene.startTime - 0.3 && s.start < scene.endTime)
      .map((s) => s.text)
      .join(' ');
    const norm = normalize(sceneText);
    if (norm.trim().length < 3) continue;

    // Encontra o tema com mais gatilhos
    let best: { entry: (typeof SEMANTIC_MAP)[0]; hits: number } | null = null;
    for (const entry of SEMANTIC_MAP) {
      let hits = 0;
      for (const t of entry.triggers) {
        if (norm.includes(normalize(t))) hits++;
      }
      if (hits > 0 && (!best || hits > best.hits)) {
        best = { entry, hits };
      }
    }

    if (!best) continue; // sem relação clara → não insere overlay

    const duration = scene.endTime - scene.startTime;
    // Overlay dura 1.5-3.5s, começa ~0.4s após o início da cena
    const start = scene.startTime + 0.4;
    const end = Math.min(scene.endTime - 0.2, start + Math.min(3.5, duration * 0.6));
    if (end - start < 1.2) continue; // cena curta demais

    suggestions.push({
      sceneId: scene.id,
      start,
      end,
      mode: best.entry.mode,
      query: best.entry.query,
      topic: best.entry.topic,
      reason: `fala menciona "${best.entry.topic}" (${best.hits} gatilho(s))`,
    });
  }

  return suggestions;
}
