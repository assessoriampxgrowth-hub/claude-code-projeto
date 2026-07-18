import type { TranscriptionSegment, EditPlan } from '@/services/pipeline/types';
import { scoreImpact, isCTA, hasTopicShift } from '../impactWords';

export interface SilenceRegion {
  start: number;
  end: number;
}

export interface EditMomentScore {
  silenceScore: number;
  semanticChangeScore: number;
  keywordImpactScore: number;
  hookScore: number;
  ctaScore: number;
  emotionalIntensityScore: number;
  recentTransitionPenalty: number;
  total: number;
}

export type EditAction = 'none' | 'hard-cut' | 'cut+sfx' | 'transition';

export interface EditDecision {
  time: number;
  action: EditAction;
  transitionType?: string;
  score: EditMomentScore;
  reason: string;
}

interface DecisionOptions {
  videoDuration: number;
  pace?: string;
}

// Thresholds
const TH_HARD_CUT = 0.35;
const TH_CUT_SFX = 0.6;
const TH_TRANSITION = 0.85;
const MIN_GAP_BETWEEN_TRANSITIONS = 3.5; // seconds

/**
 * SmartEditDecisionEngine — o "cérebro" do editor.
 *
 * Em vez de jogar transição a cada X segundos, analisa a transcrição, os
 * silêncios e o edit plan para PONTUAR cada fronteira de frase e decidir
 * a ação certa: nada, corte seco, corte+SFX ou transição visual.
 *
 * Regra de ouro: NUNCA cortar/transicionar no meio de uma frase.
 */
export function decideEdits(
  segments: TranscriptionSegment[],
  silences: SilenceRegion[],
  editPlan: EditPlan | null,
  opts: DecisionOptions
): EditDecision[] {
  const decisions: EditDecision[] = [];
  let lastTransitionTime = -999;

  // Scene boundaries (for semantic change detection)
  const sceneBoundaries = new Set<number>(
    (editPlan?.scenes ?? []).map((s) => Math.round(s.startTime * 10) / 10)
  );

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];

    // We evaluate the boundary at the END of this segment (= start of next).
    const boundaryTime = seg.end;
    if (!nextSeg) continue; // last segment, nothing after

    // --- Score components ---

    // 1) Silence — gap between this segment and the next
    const gap = nextSeg.start - seg.end;
    let silenceScore = 0;
    if (gap >= 0.4) silenceScore = 1;
    else if (gap >= 0.3) silenceScore = 0.7;
    else if (gap >= 0.25) silenceScore = 0.45;
    else if (gap >= 0.15) silenceScore = 0.2;
    // gap < 150ms = fala contínua → score 0

    // Is this the end of a sentence? (punctuation or meaningful gap)
    const endsWithSentence = /[.!?]\s*$/.test(seg.text.trim()) || gap >= 0.25;

    // 2) Semantic change — topic shift in next segment or scene boundary
    let semanticChangeScore = 0;
    if (hasTopicShift(nextSeg.text)) semanticChangeScore += 0.5;
    if (sceneBoundaries.has(Math.round(nextSeg.start * 10) / 10)) {
      semanticChangeScore += 0.6;
    }
    semanticChangeScore = Math.min(1, semanticChangeScore);

    // 3) Keyword impact — impact words in the upcoming segment
    const keywordImpactScore = scoreImpact(nextSeg.text);

    // 4) Hook — first 3s of the video
    const hookScore = boundaryTime <= 3 ? 0.8 : 0;

    // 5) CTA — last 20% of the video or CTA words
    const ctaScore =
      boundaryTime >= opts.videoDuration * 0.8 || isCTA(nextSeg.text)
        ? 0.7
        : 0;

    // 6) Emotional intensity — proxy: short punchy segment + impact words
    const segWords = seg.text.trim().split(/\s+/).length;
    const emotionalIntensityScore =
      segWords <= 5 && keywordImpactScore > 0 ? 0.5 : 0;

    // Penalty — transition too recent
    const sinceLastTransition = boundaryTime - lastTransitionTime;
    const recentTransitionPenalty =
      sinceLastTransition < MIN_GAP_BETWEEN_TRANSITIONS ? 0.5 : 0;

    // --- Aggregate ---
    let total =
      silenceScore * 0.28 +
      semanticChangeScore * 0.26 +
      keywordImpactScore * 0.16 +
      hookScore * 0.14 +
      ctaScore * 0.12 +
      emotionalIntensityScore * 0.08;

    // HARD RULE: never cut/transition mid-sentence
    if (!endsWithSentence) {
      total *= 0.15; // crush the score — fala contínua
    }

    total = Math.max(0, total - recentTransitionPenalty * 0.5);

    const score: EditMomentScore = {
      silenceScore,
      semanticChangeScore,
      keywordImpactScore,
      hookScore,
      ctaScore,
      emotionalIntensityScore,
      recentTransitionPenalty,
      total,
    };

    // --- Decide action ---
    let action: EditAction = 'none';
    let transitionType: string | undefined;
    let reason = 'fala contínua / sem pausa';

    if (total >= TH_TRANSITION && endsWithSentence) {
      action = 'transition';
      // Choose transition by context
      if (hookScore > 0) transitionType = 'zoom-in';
      else if (ctaScore > 0) transitionType = 'fade';
      else if (semanticChangeScore >= 0.6) transitionType = 'slide-left';
      else transitionType = 'wipe-left';
      reason = 'mudança forte de bloco/assunto';
      lastTransitionTime = boundaryTime;
    } else if (total >= TH_CUT_SFX && endsWithSentence) {
      action = 'cut+sfx';
      reason = 'fim de frase com ênfase';
    } else if (total >= TH_HARD_CUT && endsWithSentence) {
      action = 'hard-cut';
      reason = 'pausa natural entre frases';
    }

    decisions.push({ time: boundaryTime, action, transitionType, score, reason });
  }

  return decisions;
}

/** Filtra apenas as decisões que resultam em ação visível. */
export function activeDecisions(decisions: EditDecision[]): EditDecision[] {
  return decisions.filter((d) => d.action !== 'none');
}
