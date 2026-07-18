# MPX Video Editor — Documentacao Completa do Projeto

> Documento gerado automaticamente com todo o historico de desenvolvimento realizado via Claude Code.

---

## 1. Visao Geral

**Nome:** MPX Video Editor
**Tipo:** Editor automatico de videos curtos com IA
**Stack:** Next.js 14.2.21 + Remotion 4.0.434 + FFmpeg + OpenAI Whisper + Claude Sonnet + Tailwind CSS + TypeScript
**URL:** http://localhost:3333 (unica URL, sem Remotion Studio separado)
**Diretorio:** `C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\VIDEOS EDITADOS COM REMOTION\video-editor`

### O que faz

Pipeline completo de edicao automatica de videos:

```
Upload → Normalizar → Extrair Audio → Transcrever (Whisper) → Analisar (Claude AI)
→ Detectar Silencios → Gerar Legendas → Gerar Cenas → Selecionar Musica
→ Mixar Audio → Renderizar (Remotion) → Gerar Outputs → Download
```

### Presets disponiveis

| Preset | Descricao | Cortes | Captions | Zoom | Ritmo |
|--------|-----------|--------|----------|------|-------|
| Venda Agressiva | Vendas diretas, ritmo intenso | 0.9 | aggressive (60px, vermelho) | 0.8 | aggressive |
| Educativo | Conteudo educacional, calmo | 0.4 | clean (42px, azul) | 0.3 | medium |
| Premium | Alto valor, sofisticado | 0.5 | premium (46px, roxo) | 0.5 | medium |
| Motivacional | Inspirar acao, energetico | 0.7 | bold (52px, dourado) | 0.7 | fast |

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Diretorios

```
video-editor/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Pagina principal (3 estagios)
│   │   ├── layout.tsx                  # Layout com fonte Sora
│   │   ├── globals.css                 # CSS customizado + Tailwind
│   │   └── api/
│   │       ├── upload/route.ts         # POST upload de video
│   │       ├── video/route.ts          # GET streaming de video
│   │       ├── illustrate/route.ts     # POST gerar imagens DALL-E
│   │       └── jobs/
│   │           ├── route.ts            # POST criar job, GET listar
│   │           └── [id]/
│   │               ├── route.ts        # GET status do job
│   │               ├── retry/route.ts  # POST retry job falho
│   │               ├── download/route.ts # GET download de arquivo
│   │               └── files/route.ts  # GET listar arquivos gerados
│   ├── components/
│   │   ├── UploadZone.tsx              # Upload + seletor de preset + toggles
│   │   ├── ProcessingPipeline.tsx      # Progresso dos 11 steps
│   │   ├── VideoEditor.tsx             # Layout tripartido do editor
│   │   ├── SceneList.tsx               # Painel esquerdo: lista de cenas
│   │   ├── SceneEditor.tsx             # Painel direito: editor de cena
│   │   ├── VideoPreview.tsx            # Painel central: @remotion/player
│   │   ├── DownloadPanel.tsx           # Botoes de download
│   │   └── remotion/
│   │       └── PlayerComposition.tsx   # Bridge para @remotion/player
│   ├── services/
│   │   ├── pipeline/
│   │   │   ├── manager.ts             # Orquestrador dos 11 steps
│   │   │   └── types.ts               # Job, EditPlan, TranscriptionSegment
│   │   ├── jobs/
│   │   │   ├── jobStore.ts            # Persistencia JSON em disco
│   │   │   └── jobManager.ts          # CRUD de jobs
│   │   ├── captions/
│   │   │   ├── captionEngine.ts       # Geracao de legendas word-level
│   │   │   └── styles.ts             # 5 estilos de caption
│   │   ├── editing/
│   │   │   ├── silenceDetector.ts     # Deteccao de silencios via FFmpeg
│   │   │   ├── cutEngine.ts          # Motor de cortes inteligentes
│   │   │   └── zoomEngine.ts         # Gerador de instrucoes de zoom
│   │   ├── audio/
│   │   │   ├── mixer.ts              # Mixagem voz + musica com ducking
│   │   │   └── musicSelector.ts      # Selecao de musica por mood
│   │   └── assets/
│   │       ├── sceneSelector.ts      # Selecao de composicoes
│   │       └── compositionTypes.ts   # Tipos de composicao visual
│   ├── providers/
│   │   ├── render/
│   │   │   ├── remotion.ts           # RemotionRenderProvider (headless)
│   │   │   └── interface.ts          # Interface do provider
│   │   ├── transcription/
│   │   │   ├── whisper.ts            # WhisperTranscriptionProvider
│   │   │   └── interface.ts
│   │   ├── image/
│   │   │   ├── dalle.ts              # DalleImageProvider
│   │   │   └── interface.ts
│   │   └── music/
│   │       └── local.ts              # Biblioteca local de musica
│   ├── config/
│   │   ├── presets.ts                # 4 presets de edicao
│   │   └── defaults.ts              # Defaults de FFmpeg, audio, render
│   ├── lib/
│   │   └── ffmpeg.ts                 # Funcoes FFmpeg utilitarias
│   └── types/
│       └── index.ts                  # Re-exports centralizados
├── remotion/
│   └── src/
│       ├── index.ts                  # registerRoot
│       ├── Root.tsx                  # Registro de composicoes
│       ├── Composition.tsx           # Composicao principal (render server)
│       ├── types.ts                  # Tipos compartilhados Remotion
│       └── components/
│           ├── CaptionOverlay.tsx    # Legendas com animacao word-level
│           ├── ZoomContainer.tsx     # Ken Burns zoom com easing
│           └── SceneOverlay.tsx      # Transicoes entre cenas
├── uploads/                          # Videos e dados de jobs
├── exports/                          # Videos finais renderizados
├── music/                            # Trilhas de fundo
├── next.config.js                    # Config com externals para binarios
├── tailwind.config.ts                # Tema com cores gold/dark
├── tsconfig.json                     # Exclui pasta remotion/
└── .env.local                        # API keys (OpenAI, Anthropic, Gemini)
```

### 2.2 Pipeline de 11 Steps

| # | Step | Descricao | Tecnologia |
|---|------|-----------|------------|
| 1 | normalize | Converte para H.264, 30fps CFR, yuv420p | FFmpeg |
| 2 | extract-audio | Extrai audio para WAV PCM | FFmpeg |
| 3 | transcribe | Transcricao com timestamps word-level | OpenAI Whisper |
| 4 | analyze | Gera plano de edicao (cenas, mood, pace) | Claude Sonnet |
| 5 | detect-silences | Identifica silencios (-30dB threshold) | FFmpeg |
| 6 | generate-captions | Cria blocos de legenda com highlight | CaptionEngine |
| 7 | generate-scenes | Seleciona composicoes + gera zoom | SceneSelector + ZoomEngine |
| 8 | select-music | Escolhe musica por mood do preset | MusicSelector |
| 9 | mix-audio | Normaliza voz + mixa musica com ducking | FFmpeg (-16 LUFS) |
| 10 | render | Renderiza video final com Remotion | @remotion/renderer |
| 11 | generate-outputs | Thumbnail, SRT, VTT, metadata | FFmpeg + Node.js |

### 2.3 Arquitetura Remotion (Dual Composition)

```
@remotion/renderer (server-side headless)
  └── remotion/src/Composition.tsx
      ├── ZoomContainer (remotion/src/components/ZoomContainer.tsx)
      ├── OffthreadVideo
      ├── SceneOverlay (remotion/src/components/SceneOverlay.tsx)
      └── CaptionOverlay (remotion/src/components/CaptionOverlay.tsx)

@remotion/player (client-side preview)
  └── src/components/remotion/PlayerComposition.tsx
      ├── ZoomContainer (inline)
      ├── OffthreadVideo
      └── CaptionOverlay (inline)
```

**Nota:** PlayerComposition duplica logica inline porque `tsconfig.json` exclui `remotion/` do escopo de compilacao do Next.js.

---

## 3. O que foi Implementado (Sessao Anterior)

### FASE 1 — Pipeline Render Real

**Arquivo:** `src/services/pipeline/manager.ts` (Step 10)

O step de render foi reescrito de um TODO para uma integracao real com Remotion:

```typescript
// Antes: TODO placeholder
// Depois: Render real via Remotion
const renderer = new RemotionRenderProvider();
await renderer.validateAvailability();
const result = await renderer.render('MainComposition', inputProps, {
  width, height, fps, codec: 'h264', outputPath: finalVideoPath,
});
```

- Mapeia captions, zooms, scenes para inputProps do Remotion
- Copia output para `exports/[id]/final.mp4`
- Step 11 copia thumbnail para `exports/` tambem

**Arquivo:** `src/config/defaults.ts`
- Adicionado `EXPORTS_DIR` constant

### FASE 2 — Remotion Compositions com OffthreadVideo

**Arquivos criados:**

1. **`remotion/src/types.ts`** — Tipos compartilhados:
   - `CaptionWord`, `CaptionBlock`, `CaptionStyleProps`
   - `ZoomInstruction`, `SceneInfo`, `MainCompositionProps`

2. **`remotion/src/Composition.tsx`** — Reescrito completamente:
   - Usa `OffthreadVideo` para video real
   - Layers: ZoomContainer → OffthreadVideo → SceneOverlay → CaptionOverlay

3. **`remotion/src/Root.tsx`** — Reescrito:
   - Registra MainComposition com defaultProps correto
   - `calculateMetadata` para duracao dinamica

4. **`remotion/src/components/CaptionOverlay.tsx`** — NOVO:
   - Legendas word-level com 4 animacoes (fade, pop, slide, typewriter)
   - Highlight de keywords com cor diferente
   - Posicoes: top, center, bottom
   - Text shadow + outline support

5. **`remotion/src/components/ZoomContainer.tsx`** — NOVO:
   - Ken Burns zoom via CSS transform scale()
   - 4 funcoes de easing (linear, easeIn, easeOut, easeInOut)
   - Focus point X/Y configuravel

6. **`remotion/src/components/SceneOverlay.tsx`** — NOVO:
   - Transicoes entre cenas (vignette fade)
   - Baseado em tipo de cena e emphasis

### FASE 3 — API Routes Novas

**Arquivos criados:**

1. **`src/app/api/upload/route.ts`** — Reescrito:
   - Valida formato (mp4/mov/webm/avi/mkv) e tamanho (500MB max)
   - Retorna `{id, filename, size, videoPath}`
   - NAO inicia pipeline automaticamente

2. **`src/app/api/jobs/route.ts`** — NOVO:
   - POST: cria job + inicia pipeline em background
   - GET: lista jobs recentes

3. **`src/app/api/jobs/[id]/route.ts`** — NOVO:
   - GET: retorna job com status de todos os steps

4. **`src/app/api/jobs/[id]/retry/route.ts`** — NOVO:
   - POST: re-tenta job falho

5. **`src/app/api/jobs/[id]/download/route.ts`** — NOVO:
   - GET: streaming de arquivo com suporte a Range requests
   - Suporta `?file=` para arquivos especificos

6. **`src/app/api/jobs/[id]/files/route.ts`** — NOVO:
   - GET: lista arquivos gerados (exports/ e uploads/)
   - Retorna downloadUrl para cada arquivo

7. **`src/app/api/video/route.ts`** — Reescrito:
   - Suporta `?file=normalized` e `?file=final`
   - Fallback chain: normalized → original

### FASE 4 — UI Premium

**Arquivos reescritos:**

1. **`src/app/page.tsx`** — 3 estagios: upload → processing → editor
2. **`src/components/UploadZone.tsx`** — Seletor de preset (4 cards) + 5 toggles + drop zone + prompt
3. **`src/components/ProcessingPipeline.tsx`** — Polling a cada 2s, 11 steps com status real
4. **`src/components/VideoEditor.tsx`** — Layout tripartido (scene list | preview | editor)
5. **`src/components/SceneList.tsx`** — Timestamps, badges coloridos, barra de emphasis
6. **`src/components/SceneEditor.tsx`** — Campos: type, title, emphasis, zoom, transitions, prompt
7. **`src/components/VideoPreview.tsx`** — @remotion/player com PlayerComposition

**Arquivos criados:**

8. **`src/components/remotion/PlayerComposition.tsx`** — Bridge para @remotion/player
9. **`src/components/DownloadPanel.tsx`** — Download do video final + arquivos secundarios

### FASE 5-8 — Completadas

- **Fase 5** (@remotion/player): Integrado no VideoPreview
- **Fase 6** (Musica): Pipeline ja trata musicTrack null graciosamente
- **Fase 7** (Download): Endpoints + DownloadPanel criados
- **Fase 8** (Cleanup): Deletados process/route.ts, render/route.ts, srtParser.ts

---

## 4. Bugs Corrigidos

### 4.1 Cache de tipos antigos (.next/types)

**Problema:** Apos deletar `process/route.ts` e `render/route.ts`, TypeScript reclamava de modulos missing.
**Solucao:** Deletar `.next/types/app/api/process/` e `.next/types/app/api/render/`

### 4.2 Player component type mismatch

**Problema:** `Type 'FC<PlayerCompositionProps>' is not assignable to type 'LooseComponentType<Record<string, unknown>>'`
**Solucao:** Cast `component={PlayerComposition as any}` no Player

### 4.3 Binary module parse error (ffmpeg-static)

**Problema:** Webpack tentava fazer bundle do binario ffmpeg-static, causando `Module parse failed: Unexpected character`
**Solucao:** Adicionado ffmpeg-static, ffprobe-static e pacotes Remotion a `serverComponentsExternalPackages` e `webpack externals` em `next.config.js`

### 4.4 tsconfig exclui remotion/ folder

**Problema:** VideoPreview.tsx nao conseguia importar de `../../remotion/src/Composition.tsx`
**Solucao:** Criado bridge component `src/components/remotion/PlayerComposition.tsx` dentro do escopo `src/`

### 4.5 srtParser.ts referencia tipo deletado

**Problema:** Apos reescrever `types/index.ts`, srtParser.ts quebrou por referencia a SrtEntry
**Solucao:** Confirmado que nada importa srtParser — arquivo deletado

### 4.6 Transcricao falhando com ECONNRESET

**Problema:** OpenAI SDK usando `node-fetch` incompativel com Node v24, causando `APIConnectionError: Connection error` com `ECONNRESET`
**Solucao:** Substituido `this.openai.audio.transcriptions.create()` por chamada direta com `fetch` nativo + `FormData`:

```typescript
// Antes (falhava):
const response = await this.openai.audio.transcriptions.create({
  file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
  model: 'whisper-1', ...
});

// Depois (funciona):
const formData = new FormData();
formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
formData.append('model', 'whisper-1');
const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
  body: formData,
});
```

Adicionado retry automatico (3 tentativas, backoff 3s/6s).

### 4.7 Quota insuficiente OpenAI

**Problema:** Apos resolver ECONNRESET, API retornava 429 `insufficient_quota`
**Solucao:** Usuario adicionou creditos na conta OpenAI

---

## 5. Sessao Atual — Melhorias Planejadas

### Auditoria Completa Realizada

Comparacao com ferramentas profissionais (CapCut, Opus Clip, Descript):

| Feature | MPX Editor | CapCut | Opus Clip | Descript |
|---------|------------|--------|-----------|----------|
| Auto-edit AI | Claude | Basico | Multi-clip | Nao |
| Caption styles | 5 | 20+ | 10+ | 5+ |
| Efeitos/filtros | Nenhum | Muitos | Alguns | Nenhum |
| Face tracking | Nao | Sim | Sim | Nao |
| Transicoes | Planejadas, nao renderizadas | Sim | Sim | Nao |
| Timeline editor | Nao | Sim | Sim | Sim |
| Inteligencia estrutural | Excelente | Boa | Boa | Excelente |

### Plano de Melhorias em 5 Fases

#### Fase 0 — Fundacao (pre-requisito para tudo)

| Item | Descricao | Arquivos |
|------|-----------|----------|
| Composicao unificada | Eliminar duplicacao entre PlayerComposition e MainComposition | `src/shared/remotion/` (novo diretorio) |
| Estado do editor | Context + Reducer com undo/redo e persistencia | `src/store/editorStore.ts`, `editorReducer.ts`, `EditorContext.tsx` |
| Tipos estendidos | Novos campos: effects, colorGrading, aspectRatio, bRollImages | `src/services/pipeline/types.ts` |

#### Fase 1 — Impacto Visual

| Feature | Descricao |
|---------|-----------|
| Transicoes entre cenas | Fade, slide, zoom, wipe reais na composicao Remotion |
| +15 estilos de caption | Karaoke, neon glow, 3D shadow, gradient, bounce, wave, glass, spotlight |
| Timeline visual | Scrubber + waveform + marcadores de cena/caption/zoom |
| Efeitos visuais | Color grading (warm/cool/vintage/cinematic), vignette, letterbox, blur |
| B-Roll DALL-E | Gerar imagens de apoio automaticamente via DALL-E |

#### Fase 2 — Diferencial Competitivo

| Feature | Descricao |
|---------|-----------|
| Face tracking zoom | Detectar rostos e usar como foco do zoom |
| Multi-idioma | Auto-detectar idioma, suportar qualquer lingua |
| Multi-formato | Exportar 9:16, 16:9, 1:1 com crop inteligente |
| Musica via API/URL | Input de URL para musica + biblioteca expandida |
| Templates customizados | Salvar/carregar presets personalizados |

#### Fase 3 — Superpoderes IA

| Feature | Descricao |
|---------|-----------|
| Multi-clip AI | De 1 video longo, gerar 5-10 shorts (estilo Opus Clip) |
| A/B testing hooks | Gerar 2-3 variacoes de abertura |
| Auto color grading | Analisar video e aplicar correcao de cor automatica |
| Stickers/emojis animados | Inserir emojis baseado em sentimento |
| Speaker detection | Detectar troca de falante e adaptar cortes |

#### Fase 4 — Polish

| Item | Descricao |
|------|-----------|
| Performance | Binary search para cenas/captions ativas, virtualizacao do timeline |
| Atalhos de teclado | Space, Ctrl+Z, Ctrl+Y, setas, Home/End, Ctrl+S |
| Error handling | Retry para DALL-E, timeout para Claude, validacao de tempos |

#### Fase 5 — Futuro

| Item | Descricao |
|------|-----------|
| Galeria de projetos | Listar projetos recentes com thumbnails |
| Fila de exportacao | Queue de multiplos renders sequenciais |
| Preview em tempo real | Mudancas no editor refletem instantaneamente no player |

---

## 6. Configuracoes Tecnicas

### 6.1 next.config.js

```javascript
// Externals criticos para binarios e Remotion
serverComponentsExternalPackages: [
  'ffmpeg-static', 'ffprobe-static',
  '@remotion/bundler', '@remotion/renderer',
  '@remotion/compositor-win32-x64-msvc',
  '@anthropic-ai/sdk', 'openai'
]
// + webpack externals equivalentes para server builds
```

### 6.2 .env.local

```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3333
```

### 6.3 Tailwind Theme

```typescript
colors: {
  gold: { 400: '#FFD700', 500: '#FFB800', 600: '#E6A600' },
  dark: { 900: '#050508', 800: '#0A0A0F', 700: '#0F0F1A', 600: '#1A1A2E' }
}
```

### 6.4 Node.js

- Versao: v24.14.1 via NVM for Windows
- Path: `C:\Users\Matheus\AppData\Local\nvm\v24.14.1`

---

## 7. Como Rodar

```bash
cd "C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\VIDEOS EDITADOS COM REMOTION\video-editor"

# Instalar dependencias
npm install

# Rodar (porta 3333)
npm run dev

# Abrir no browser
# http://localhost:3333
```

### Fluxo de uso:

1. Abrir http://localhost:3333
2. Selecionar preset (ex: "Educativo")
3. Ativar/desativar toggles (Legendas, Musica, Cortar Silencios, Zoom, Cenas)
4. Arrastar video MP4 para a drop zone
5. Acompanhar os 11 steps de processamento
6. Usar o editor tripartido para ajustar cenas
7. Baixar video final + SRT/VTT/thumbnail

---

## 8. Limitacoes Conhecidas

1. FFmpeg via `ffmpeg-static` e lento para videos longos (>5min)
2. Render Remotion local e single-threaded (2-5x o tempo do video)
3. Persistencia em JSON files (sem banco de dados)
4. Trilhas musicais precisam ser adicionadas manualmente em `music/`
5. DALL-E image generation depende de creditos na conta OpenAI
6. Legendas usam fonte Inter (nao carregada) — fallback para sans-serif do sistema
7. PlayerComposition falta SceneOverlay (transicoes nao aparecem no preview)
8. Transicoes (fade/slide/zoom) planejadas no editPlan mas nao renderizadas
9. Sem undo/redo no editor
10. Sem persistencia de edicoes (mudancas perdem-se ao recarregar)

---

## 9. Dependencias Principais

| Pacote | Versao | Funcao |
|--------|--------|--------|
| next | 14.2.21 | Framework web (App Router) |
| react | 18.3.1 | UI library |
| remotion | 4.0.434 | Core Remotion |
| @remotion/player | 4.0.434 | Preview client-side |
| @remotion/renderer | 4.0.434 | Render server-side headless |
| @remotion/bundler | 4.0.434 | Bundle de composicoes |
| tailwindcss | 3.4.1 | Estilizacao |
| framer-motion | 11.1.7 | Animacoes (pouco usado) |
| fluent-ffmpeg | 2.1.3 | Processamento audio/video |
| ffmpeg-static | 5.3.0 | Binario FFmpeg |
| ffprobe-static | 3.1.0 | Extracao de metadata |
| @anthropic-ai/sdk | 0.39.0 | Claude API (analise de conteudo) |
| openai | - | Whisper API (transcricao) |
| lucide-react | 0.378.0 | Icones |

---

## 10. Historico de Commits / Alteracoes

### Sessao 1 (Implementacao Base)

1. Criado `src/config/defaults.ts` com EXPORTS_DIR
2. Reescrito `src/services/pipeline/manager.ts` Step 10 (render real)
3. Criados tipos Remotion em `remotion/src/types.ts`
4. Reescrito `remotion/src/Composition.tsx` com OffthreadVideo
5. Reescrito `remotion/src/Root.tsx` com props schema
6. Criado `remotion/src/components/CaptionOverlay.tsx`
7. Criado `remotion/src/components/ZoomContainer.tsx`
8. Criado `remotion/src/components/SceneOverlay.tsx`
9. Reescrito `src/app/api/upload/route.ts`
10. Criado `src/app/api/jobs/route.ts`
11. Criado `src/app/api/jobs/[id]/route.ts`
12. Criado `src/app/api/jobs/[id]/retry/route.ts`
13. Criado `src/app/api/jobs/[id]/download/route.ts`
14. Criado `src/app/api/jobs/[id]/files/route.ts`
15. Reescrito `src/types/index.ts`
16. Reescrito `src/app/page.tsx` (3 estagios)
17. Reescrito `src/components/UploadZone.tsx`
18. Reescrito `src/components/ProcessingPipeline.tsx`
19. Reescrito `src/components/VideoEditor.tsx`
20. Reescrito `src/components/SceneList.tsx`
21. Reescrito `src/components/SceneEditor.tsx`
22. Reescrito `src/components/VideoPreview.tsx`
23. Criado `src/components/remotion/PlayerComposition.tsx`
24. Criado `src/components/DownloadPanel.tsx`
25. Reescrito `next.config.js` com externals
26. Deletado `src/app/api/process/route.ts`
27. Deletado `src/app/api/render/route.ts`
28. Deletado `src/lib/srtParser.ts`

### Sessao 2 (Bug Fixes + Melhorias Planejadas)

29. Corrigido transcricao: trocado SDK OpenAI por `fetch` nativo (fix ECONNRESET)
30. Adicionado retry automatico (3 tentativas) na transcricao
31. Atualizado `.claude/launch.json` para preview tool
32. Auditoria completa do projeto realizada
33. Plano de melhorias Level 1-3 criado e aprovado
34. Criado `DOCUMENTACAO-PROJETO.md` (este arquivo)

---

*Documento gerado em 2026-04-18 via Claude Code*
*Projeto: MPX Video Editor — Editor Automatico de Videos com IA*
