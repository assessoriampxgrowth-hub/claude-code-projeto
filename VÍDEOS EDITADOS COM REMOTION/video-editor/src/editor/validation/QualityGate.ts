import type { ZoomInstruction } from '@/services/editing/zoomEngine';
import type { EditDecision } from '../decision/SmartEditDecisionEngine';
import type { CaptionSettings } from '../captions/CaptionSettings';

export interface QualityCheck {
  name: string;
  pass: boolean;
  message: string;
  autoFixed?: boolean;
}

export interface QualityReport {
  pass: boolean;
  checks: QualityCheck[];
  warnings: string[];
}

interface GateInput {
  width: number;
  height: number;
  captionSettings: CaptionSettings;
  zooms: ZoomInstruction[];
  decisions: EditDecision[];
  sfxCount: number;
  videoDuration: number;
}

/**
 * QualityGate — valida o vídeo ANTES do render final.
 * Garante o padrão MPX: 9:16, legenda na safe area, rosto não cortado,
 * zoom sem repetição, transições lógicas, SFX não exagerado.
 */
export function runQualityGate(input: GateInput): QualityReport {
  const checks: QualityCheck[] = [];
  const warnings: string[] = [];

  // 1) Formato 1080x1920
  const isVertical = input.width === 1080 && input.height === 1920;
  checks.push({
    name: 'Formato 1080x1920 9:16',
    pass: isVertical,
    message: isVertical
      ? 'OK'
      : `Esperado 1080x1920, recebido ${input.width}x${input.height}`,
  });
  if (!isVertical) warnings.push('Vídeo não está em 9:16 — será forçado no render.');

  // 2-4) Legenda na safe area / posição
  const cs = input.captionSettings;
  const posOk = cs.positionY >= 0.66 && cs.positionY <= 0.8;
  checks.push({
    name: 'Legenda na parte inferior (safe area)',
    pass: posOk,
    message: posOk
      ? `positionY=${cs.positionY}`
      : `positionY=${cs.positionY} fora de 0.66-0.80`,
  });
  if (!posOk) warnings.push('Legenda fora da área segura — ajuste positionY para ~0.72.');

  // 5) Fonte correta
  const fontOk = ['Bebas Neue', 'Space Grotesk', 'Plus Jakarta Sans'].includes(
    cs.fontFamily
  );
  checks.push({
    name: 'Fonte permitida',
    pass: fontOk,
    message: fontOk ? cs.fontFamily : `Fonte "${cs.fontFamily}" fora do padrão MPX`,
  });

  // 6) Legibilidade — tamanho + stroke
  const sizeOk = cs.fontSize >= 60 && cs.fontSize <= 110;
  const strokeOk = cs.strokeWidth >= 3;
  checks.push({
    name: 'Legenda legível (tamanho + stroke)',
    pass: sizeOk && strokeOk,
    message: sizeOk && strokeOk ? 'OK' : 'Tamanho ou contorno fora do recomendado',
  });

  // 7) Rosto não cortado — nenhum zoom acima de 1.15
  const maxZoom = input.zooms.reduce((m, z) => Math.max(m, z.scale), 1);
  const zoomSafe = maxZoom <= 1.15;
  checks.push({
    name: 'Rosto não cortado (zoom <= 1.15)',
    pass: zoomSafe,
    message: zoomSafe ? `maxZoom=${maxZoom.toFixed(2)}` : `Zoom ${maxZoom.toFixed(2)} excede 1.15`,
  });
  if (!zoomSafe) warnings.push('Zoom acima de 1.15 pode cortar o rosto.');

  // 8) Zoom não repetitivo
  const zoomsPer15s = (input.zooms.length / Math.max(input.videoDuration, 1)) * 15;
  const zoomNotRepetitive = zoomsPer15s <= 5;
  checks.push({
    name: 'Zoom não repetitivo',
    pass: zoomNotRepetitive,
    message: `${zoomsPer15s.toFixed(1)} zooms / 15s`,
  });
  if (!zoomNotRepetitive) warnings.push('Zoom repetitivo — reduza o número de punch-ins.');

  // 9) Transições em momentos lógicos — todas precisam de score alto
  const transitions = input.decisions.filter((d) => d.action === 'transition');
  const badTransitions = transitions.filter((d) => d.score.total < 0.85);
  checks.push({
    name: 'Transições em momentos lógicos',
    pass: badTransitions.length === 0,
    message:
      badTransitions.length === 0
        ? `${transitions.length} transições, todas justificadas`
        : `${badTransitions.length} transições com score baixo`,
  });

  // 10) SFX não exagerado
  const maxSfx = input.videoDuration <= 15 ? 6 : input.videoDuration <= 30 ? 10 : 16;
  const sfxOk = input.sfxCount <= maxSfx;
  checks.push({
    name: 'SFX não exagerado',
    pass: sfxOk,
    message: `${input.sfxCount}/${maxSfx} SFX`,
  });
  if (!sfxOk) warnings.push('Excesso de SFX — o motor reduz automaticamente.');

  const pass = checks.every((c) => c.pass);
  return { pass, checks, warnings };
}

/** Formata o relatório para o log do job. */
export function formatQualityReport(report: QualityReport): string {
  const lines = report.checks.map(
    (c) => `${c.pass ? 'OK' : 'FALHA'} - ${c.name}: ${c.message}`
  );
  if (report.warnings.length > 0) {
    lines.push('Avisos: ' + report.warnings.join(' | '));
  }
  return lines.join('\n');
}
