// Palavras de impacto PT-BR — usadas para detectar momentos fortes da fala.

export const IMPACT_WORDS: string[] = [
  'atencao', 'atenção', 'cuidado', 'erro', 'problema', 'segredo', 'verdade',
  'olha', 'olha isso', 'resultado', 'resultados', 'venda', 'vendas', 'vender',
  'cliente', 'clientes', 'dinheiro', 'faturamento', 'faturar', 'prejuizo',
  'prejuízo', 'oportunidade', 'urgente', 'simples', 'rapido', 'rápido',
  'agora', 'nunca', 'sempre', 'funciona', 'escala', 'escalar', 'crescer',
  'multiplicar', 'whatsapp', 'anuncio', 'anúncio', 'anuncios', 'trafego',
  'tráfego', 'oferta', 'comercial', 'gratis', 'grátis', 'descubra',
  'descobri', 'novo', 'exclusivo', 'comprovado', 'garantido', 'lucro',
];

// CTA / fechamento
export const CTA_WORDS: string[] = [
  'chama', 'chame', 'comenta', 'comente', 'clica', 'clique', 'link',
  'bio', 'whatsapp', 'agenda', 'agende', 'manda', 'mande', 'mensagem',
  'segue', 'siga', 'salva', 'salve', 'compartilha', 'inscreva',
];

// Marcadores de mudança de assunto
export const TOPIC_SHIFT_MARKERS: string[] = [
  'mas', 'porem', 'porém', 'entao', 'então', 'agora', 'olha', 'veja',
  'primeiro', 'segundo', 'terceiro', 'outra coisa', 'alem disso',
  'além disso', 'por isso', 'resultado', 'ou seja', 'enfim',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

/**
 * Score 0-1 de quão "impactante" é um trecho de fala.
 */
export function scoreImpact(text: string): number {
  const norm = normalize(text);
  const words = norm.split(/\s+/);
  if (words.length === 0) return 0;

  let hits = 0;
  const impactSet = new Set(IMPACT_WORDS.map(normalize));
  for (const w of words) {
    if (impactSet.has(w)) hits++;
  }
  // 1 hit já é relevante; satura em ~3
  return Math.min(1, hits / 3);
}

/** Detecta se o trecho contém um CTA. */
export function isCTA(text: string): boolean {
  const norm = normalize(text);
  const ctaSet = new Set(CTA_WORDS.map(normalize));
  return norm.split(/\s+/).some((w) => ctaSet.has(w));
}

/** Detecta marcador de mudança de assunto no início do trecho. */
export function hasTopicShift(text: string): boolean {
  const norm = normalize(text);
  return TOPIC_SHIFT_MARKERS.some(
    (m) => norm.startsWith(normalize(m) + ' ') || norm === normalize(m)
  );
}
