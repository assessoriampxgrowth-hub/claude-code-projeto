import type { EditDecision } from './SmartEditDecisionEngine';

export type SfxType =
  | 'caption_click'
  | 'mouse_click'
  | 'pop'
  | 'snap'
  | 'whoosh'
  | 'soft_hit'
  | 'glitch_tick'
  | 'glitter'
  | 'transition_swoosh'
  | 'riser_short';

export interface SfxCue {
  time: number;
  type: SfxType;
  /** Volume alvo em dB (negativo). Voz sempre domina. */
  volumeDb: number;
  reason: string;
}

/** Limite de SFX por duração do vídeo (regra MPX). */
function maxSfx(duration: number): number {
  if (duration <= 15) return 6;
  if (duration <= 30) return 10;
  return 16;
}

/**
 * SfxDecisionEngine — escolhe o efeito sonoro CERTO para cada momento de
 * edição, respeitando limites de frequência. Não coloca SFX em toda frase.
 *
 * Recebe as decisões do SmartEditDecisionEngine e devolve cues de SFX.
 */
export function decideSfx(
  decisions: EditDecision[],
  videoDuration: number
): SfxCue[] {
  const cues: SfxCue[] = [];

  for (const d of decisions) {
    if (d.action === 'none' || d.action === 'hard-cut') {
      // Corte seco comum não precisa de SFX.
      continue;
    }

    let type: SfxType;
    let volumeDb = -19;
    let reason: string;

    if (d.action === 'transition') {
      if (d.score.hookScore > 0) {
        type = 'soft_hit';
        volumeDb = -17;
        reason = 'impacto do hook';
      } else if (d.score.ctaScore > 0) {
        type = 'soft_hit';
        volumeDb = -18;
        reason = 'fechamento / CTA';
      } else if (d.score.semanticChangeScore >= 0.6) {
        type = 'whoosh';
        volumeDb = -18;
        reason = 'mudança de bloco';
      } else {
        type = 'transition_swoosh';
        volumeDb = -19;
        reason = 'transição visual';
      }
    } else {
      // cut+sfx — ênfase
      if (d.score.keywordImpactScore >= 0.66) {
        type = 'snap';
        volumeDb = -18;
        reason = 'palavra de impacto';
      } else if (d.score.emotionalIntensityScore > 0) {
        type = 'pop';
        volumeDb = -20;
        reason = 'frase curta de ênfase';
      } else {
        type = 'caption_click';
        volumeDb = -21;
        reason = 'entrada de legenda importante';
      }
    }

    cues.push({ time: d.time, type, volumeDb, reason });
  }

  // Aplica limite de frequência — mantém os de maior score
  const limit = maxSfx(videoDuration);
  if (cues.length > limit) {
    // Ordena por "prioridade": transições e impactos primeiro
    const priority = (c: SfxCue) =>
      c.type === 'soft_hit' || c.type === 'whoosh' ? 3
      : c.type === 'snap' || c.type === 'transition_swoosh' ? 2
      : 1;
    return cues
      .map((c, i) => ({ c, i }))
      .sort((a, b) => priority(b.c) - priority(a.c))
      .slice(0, limit)
      .sort((a, b) => a.c.time - b.c.time)
      .map(({ c }) => c);
  }

  return cues;
}
