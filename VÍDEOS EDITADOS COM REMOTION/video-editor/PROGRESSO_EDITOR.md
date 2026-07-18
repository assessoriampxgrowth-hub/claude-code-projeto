# MPX Video Editor — Progresso da Implementação

> Editor automático de vídeos curtos profissional. Next.js 14 + Remotion 4 + FFmpeg + Whisper + Claude.
> URL única: http://localhost:3333

---

## Correções de bugs nesta sessão

1. **Erro de transcrição (`ECONNRESET`)** — SDK da OpenAI usava `node-fetch` incompatível com Node v24.
   - Fix: `fetch` nativo + `FormData` + retry (3x, backoff 3s/6s). Erro real era falta de créditos OpenAI.
2. **Erro de render (`registerRoot`)** — `bundle()` apontava para `Root.tsx`.
   - Fix: entry point corrigido para `remotion/src/index.ts`.

---

## FASE 0 — Fundação (COMPLETA)

### 0A. Composição Unificada (`src/shared/remotion/`)
- `types.ts` — fonte única de tipos (TransitionType, EffectsConfig, ColorGradingPreset, CaptionRenderer, BRollImage)
- `CaptionOverlay.tsx` — 10 renderers de legenda
- `ZoomContainer.tsx` — zoom Ken Burns + binary search
- `SceneOverlay.tsx` — 11 transições reais
- `EffectsLayer.tsx` — color grading, vinheta, letterbox
- `index.ts` — re-exports

Modificados: `remotion/src/Composition.tsx`, `PlayerComposition.tsx` (agora com SceneOverlay),
`remotion/src/types.ts`, `remotion/src/Root.tsx`.

### 0B. Estado do Editor (Undo/Redo)
- `src/store/EditorContext.tsx` — Context + Reducer, undo/redo (50 níveis), auto-save 2s
- `src/app/api/jobs/[id]/editor-state/route.ts` — GET/PUT persistência

---

## FASE 1A — Transições de Cena (COMPLETA)

11 tipos no `SceneOverlay.tsx`: cut, fade, slide (4 direções), zoom-in/out, wipe (3 direções), blur.

## FASE 1B — 15 Estilos de Caption (COMPLETA)

5 originais + 10 novos: karaoke, neon, neon-pink, shadow3d, gradient, gradient-cool,
bounce, wave, glass, spotlight, outline-bold.

## FASE 1C — Timeline Visual (COMPLETA)

`src/components/timeline/Timeline.tsx` — régua de tempo, faixa de cenas (clicável),
faixa de legendas, faixa de zoom, legendas.

## FASE 1D — Painel de Efeitos na UI (COMPLETA)

`SceneEditor.tsx` reescrito com 3 abas:
- **Cena** — tipo, título, timing, ênfase, zoom, 11 transições, prompt
- **Legendas** — grid de 15 estilos com preview
- **Efeitos** — color grading (8 presets), vinheta, letterbox

## Integração da UI (COMPLETA)

- `VideoEditor.tsx` — `EditorProvider`, barra undo/redo, indicador de salvamento, timeline
- `VideoPreview.tsx` — usa `useEditor()`, aplica estilo + efeitos ao Player em tempo real
- `globals.css` — classe `.input`
- `pipeline/types.ts` — `JobConfig.effects` e `.language`
- `pipeline/manager.ts` — render lê `editor-state.json` e passa `effects` ao Remotion

---

## PRÓXIMAS FASES (pendentes)

- **1E** — B-Roll automático via DALL-E
- **2A** — Face tracking para zoom inteligente
- **2B** — Multi-idioma (detecção automática)
- **2C** — Export multi-formato (9:16, 16:9, 1:1)
- **2D** — Integração de música via API/URL
- **2E** — Templates customizados
- **3A** — Multi-clip AI (1 vídeo longo → 5-10 shorts)
- **3B** — A/B testing de hooks
- **3C** — Auto color grading
- **3D** — Stickers/emojis animados
- **3E** — Detecção de locutor

## Como testar

1. http://localhost:3333 → upload de vídeo → escolher preset → processar
2. Editor, aba **Legendas** → trocar estilo → preview atualiza
3. Aba **Efeitos** → vinheta/letterbox/color grading → preview atualiza
4. Aba **Cena** → mudar transição → preview atualiza
5. Undo/Redo na barra superior
6. Timeline embaixo → clicar numa cena seleciona
