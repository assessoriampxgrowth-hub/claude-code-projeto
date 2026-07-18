import path from 'path';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

import { jobStore } from '@/services/jobs/jobStore';
import type {
  Job,
  JobStep,
  TranscriptionSegment,
  EditPlan,
} from './types';

import {
  normalizeVideo,
  extractAudio,
  getVideoInfo,
  generateThumbnail,
  trimVideo,
} from '@/lib/ffmpeg';

import {
  detectAndRemoveSilences,
  clampSegments,
} from '@/services/editing/silenceDetector';

import { generateCutList } from '@/services/editing/cutEngine';
import { generateZoomInstructions, ZoomInstruction } from '@/services/editing/zoomEngine';
import { detectFacesForScenes, SceneFace } from '@/services/editing/faceDetector';
import { decideEdits, EditDecision } from '@/editor/decision/SmartEditDecisionEngine';
import { decideSfx } from '@/editor/decision/SfxDecisionEngine';
import { decideOverlays } from '@/editor/decision/VisualOverlayDecisionEngine';
import { searchBRoll } from '@/editor/assets/AssetSearchService';
import { buildCueSfx } from '@/services/audio/sfxMixer';
import { runQualityGate, formatQualityReport } from '@/editor/validation/QualityGate';
import { getCaptionPreset } from '@/editor/captions/CaptionSettings';
import type { BRollImage } from '@/shared/remotion/types';

import { getCaptionStyle } from '@/services/captions/styles';
import {
  generateCaptionBlocks,
  captionBlocksToSrt,
  captionBlocksToVtt,
  CaptionBlock,
} from '@/services/captions/captionEngine';

import { selectSceneCompositions, SceneDecision } from '@/services/assets/sceneSelector';

import { normalizeAudioLoudness } from '@/services/audio/normalizer';
import { mixWithFades } from '@/services/audio/mixer';
import { buildSceneSfx, mixSfx } from '@/services/audio/sfxMixer';
import { selectMusic, MusicTrack } from '@/services/audio/musicSelector';

import { getPreset } from '@/config/presets';
import { UPLOADS_DIR, EXPORTS_DIR, RENDER_DEFAULTS } from '@/config/defaults';
import { RemotionRenderProvider } from '@/providers/render/remotion';
import { copyFile } from 'fs/promises';

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * The main pipeline orchestrator.
 * Runs all processing steps for a video editing job.
 */
export class PipelineManager {
  private anthropic: Anthropic;
  private openai: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Run the full editing pipeline for a job.
   * Each step updates job state via the job store.
   * Critical failures stop the pipeline; non-critical failures are logged but processing continues.
   */
  async run(job: Job): Promise<void> {
    const jobDir = path.join(UPLOADS_DIR, job.id);
    await mkdir(jobDir, { recursive: true });

    const preset = getPreset(job.config.preset);
    let transcription: TranscriptionSegment[] = [];
    let editPlan: EditPlan | null = null;
    let silences: { start: number; end: number }[] = [];
    let captionBlocks: CaptionBlock[] = [];
    let sceneDecisions: SceneDecision[] = [];
    let zoomInstructions: ZoomInstruction[] = [];
    let musicTrack: MusicTrack | null = null;
    let videoDuration = 0;
    let editDecisions: EditDecision[] = [];
    let bRollImages: BRollImage[] = [];

    // ──────────────────────────────────────────────
    // Step 1: Normalize video
    // ──────────────────────────────────────────────
    const normalizedPath = path.join(jobDir, 'normalized.mp4');
    const normalizeOk = await this.runStep(job, 'normalize', async () => {
      if (!job.originalVideoPath || !existsSync(job.originalVideoPath)) {
        throw new Error('Original video file not found');
      }

      // Get video info first
      const info = await getVideoInfo(job.originalVideoPath);
      job.videoDuration = info.duration;
      job.videoWidth = info.width;
      job.videoHeight = info.height;
      videoDuration = info.duration;

      // Normalize the video
      await normalizeVideo(job.originalVideoPath, normalizedPath);
      job.normalizedVideoPath = normalizedPath;

      return `${info.width}x${info.height}, ${info.duration.toFixed(1)}s, ${info.fps}fps`;
    });

    if (!normalizeOk) {
      await jobStore.updateStatus(job.id, 'failed', job.error);
      return;
    }

    // ──────────────────────────────────────────────
    // Step 2: Extract audio
    // ──────────────────────────────────────────────
    const audioPath = path.join(jobDir, 'audio.wav');
    const audioOk = await this.runStep(job, 'extract-audio', async () => {
      await extractAudio(normalizedPath, audioPath);
      job.audioPath = audioPath;
      return 'Audio extracted to WAV';
    });

    if (!audioOk) {
      await jobStore.updateStatus(job.id, 'failed', job.error);
      return;
    }

    // ──────────────────────────────────────────────
    // Step 3: Transcribe
    // ──────────────────────────────────────────────
    const transcriptionPath = path.join(jobDir, 'transcription.json');
    const transcribeOk = await this.runStep(job, 'transcribe', async () => {
      await jobStore.updateStatus(job.id, 'transcribing');

      // Use native fetch instead of OpenAI SDK to avoid node-fetch ECONNRESET on Node v24
      const audioBuffer = await readFile(audioPath);
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('timestamp_granularities[]', 'segment');
      formData.append('language', 'pt');

      let rawResponse: Record<string, unknown> | null = null;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
          });
          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Whisper API error ${res.status}: ${errBody}`);
          }
          rawResponse = await res.json() as Record<string, unknown>;
          break;
        } catch (err: unknown) {
          const isConnectionError =
            err instanceof Error &&
            (err.message.includes('ECONNRESET') ||
              err.message.includes('ETIMEDOUT') ||
              err.message.includes('fetch failed'));
          if (isConnectionError && attempt < maxRetries) {
            const delay = attempt * 3000;
            console.log(`Transcription attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw err;
        }
      }

      if (!rawResponse) throw new Error('Transcription failed after all retries');
      const segments = (rawResponse.segments as Array<Record<string, unknown>>) ?? [];

      transcription = segments.map(
        (seg: Record<string, unknown>, idx: number) => ({
          index: idx,
          start: seg.start as number,
          end: seg.end as number,
          text: (seg.text as string).trim(),
          words: ((seg.words as Array<Record<string, unknown>>) ?? []).map(
            (w: Record<string, unknown>) => ({
              word: (w.word as string).trim(),
              start: w.start as number,
              end: w.end as number,
            })
          ),
        })
      );

      await writeFile(transcriptionPath, JSON.stringify(transcription, null, 2));
      job.transcriptionPath = transcriptionPath;

      return `${transcription.length} segments transcribed`;
    });

    if (!transcribeOk) {
      await jobStore.updateStatus(job.id, 'failed', job.error);
      return;
    }

    // ──────────────────────────────────────────────
    // Step 4: Analyze content / generate edit plan
    // ──────────────────────────────────────────────
    const editPlanPath = path.join(jobDir, 'edit-plan.json');
    const analyzeOk = await this.runStep(job, 'analyze', async () => {
      await jobStore.updateStatus(job.id, 'analyzing');

      const transcriptText = transcription
        .map((s) => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] ${s.text}`)
        .join('\n');

      editPlan = await this.generateEditPlan(
        transcriptText,
        videoDuration,
        preset.name,
        job.config.customPrompt
      );

      await writeFile(editPlanPath, JSON.stringify(editPlan, null, 2));
      job.editPlanPath = editPlanPath;

      return `${editPlan.scenes.length} scenes planned, mood: ${editPlan.mood}`;
    });

    if (!analyzeOk) {
      // Non-critical: create a minimal edit plan
      editPlan = this.createFallbackEditPlan(transcription, videoDuration);
      await writeFile(editPlanPath, JSON.stringify(editPlan, null, 2));
      job.editPlanPath = editPlanPath;
    }

    // ──────────────────────────────────────────────
    // Step 5: Detect and remove silences
    // ──────────────────────────────────────────────
    const trimmedPath = path.join(jobDir, 'trimmed.mp4');
    await this.runStep(job, 'detect-silences', async () => {
      const result = await detectAndRemoveSilences(audioPath, {
        threshold: '-30dB',
        minSilenceDuration: preset.cutAggressiveness > 0.7 ? 0.3 : 0.5,
        paddingMs: preset.cutAggressiveness > 0.7 ? 50 : 100,
      });

      silences = result.removed;

      if (result.keep.length > 0 && result.totalRemoved > 1) {
        // Generate cut list combining silences with edit plan
        const cutList = generateCutList(
          editPlan!,
          silences,
          videoDuration,
          preset.cutAggressiveness
        );

        // Trim the video
        const segments = cutList.segments.map((s) => ({
          start: s.start,
          end: s.end,
        }));
        const clamped = clampSegments(segments, videoDuration);

        if (clamped.length > 0) {
          await trimVideo(normalizedPath, trimmedPath, clamped);
          job.normalizedVideoPath = trimmedPath;
        }

        return `Removed ${result.totalRemoved.toFixed(1)}s of silence, ${cutList.segments.length} cuts`;
      }

      return 'No significant silences detected';
    });

    // ──────────────────────────────────────────────
    // Step 6: Generate caption data
    // ──────────────────────────────────────────────
    const captionsPath = path.join(jobDir, 'captions.json');
    await this.runStep(job, 'generate-captions', async () => {
      const style = getCaptionStyle(job.config.captionStyle);
      captionBlocks = generateCaptionBlocks(
        transcription,
        style,
        editPlan?.highlights
      );

      await writeFile(captionsPath, JSON.stringify(captionBlocks, null, 2));

      // Also generate SRT and VTT files
      const srtContent = captionBlocksToSrt(captionBlocks);
      const vttContent = captionBlocksToVtt(captionBlocks);
      await writeFile(path.join(jobDir, 'captions.srt'), srtContent);
      await writeFile(path.join(jobDir, 'captions.vtt'), vttContent);

      return `${captionBlocks.length} caption blocks generated`;
    });

    // ──────────────────────────────────────────────
    // Step 7: Generate/select scene assets
    // ──────────────────────────────────────────────
    await this.runStep(job, 'generate-scenes', async () => {
      if (!job.config.scenesEnabled || !editPlan) {
        return 'Scene generation disabled';
      }

      await jobStore.updateStatus(job.id, 'generating-assets');

      sceneDecisions = selectSceneCompositions(
        editPlan.scenes,
        preset.scenesFrequency,
        true
      );

      // Face detection (MPX strategic preset only) — keeps zoom off the face
      let sceneFaces: SceneFace[] | undefined;
      if (
        job.config.zoomEnabled &&
        preset.strategicZoom &&
        job.normalizedVideoPath
      ) {
        try {
          sceneFaces = await detectFacesForScenes(
            job.normalizedVideoPath,
            editPlan.scenes,
            jobDir
          );
        } catch {
          sceneFaces = undefined; // fall back to conservative center crop
        }
      }

      // Generate zoom instructions (strategic, face-aware — no seesaw)
      zoomInstructions = generateZoomInstructions(
        editPlan,
        job.config.zoomEnabled,
        job.videoDuration,
        sceneFaces
      );

      // Save scene and zoom data
      await writeFile(
        path.join(jobDir, 'scene-decisions.json'),
        JSON.stringify(sceneDecisions, null, 2)
      );
      await writeFile(
        path.join(jobDir, 'zoom-instructions.json'),
        JSON.stringify(zoomInstructions, null, 2)
      );

      const imageCount = sceneDecisions.filter(
        (d) => d.shouldGenerateImage
      ).length;

      // For scenes that need images, generate them using the image provider
      for (const decision of sceneDecisions) {
        if (decision.shouldGenerateImage && decision.imagePrompt) {
          try {
            // Store the image prompt for later generation
            // The actual image generation would use an image provider
            const promptFile = path.join(
              jobDir,
              `scene-${decision.scene.id}-prompt.txt`
            );
            await writeFile(promptFile, decision.imagePrompt);
          } catch (err) {
            console.error(
              `Failed to prepare scene image for ${decision.scene.id}:`,
              err
            );
          }
        }
      }

      // ─── Smart Edit Decision Engine ───
      // Pontua cada fronteira de frase e decide corte/transição.
      editDecisions = decideEdits(transcription, silences, editPlan, {
        videoDuration,
        pace: editPlan.pace,
      });
      await writeFile(
        path.join(jobDir, 'edit-decisions.json'),
        JSON.stringify(editDecisions, null, 2)
      );

      // ─── Visual Overlay Decision Engine ───
      // Sugere B-roll só quando há relação semântica com a fala.
      const overlaySuggestions = decideOverlays(editPlan.scenes, transcription);
      bRollImages = [];
      for (const sug of overlaySuggestions) {
        try {
          const asset = await searchBRoll(sug.query);
          if (asset) {
            bRollImages.push({
              sceneId: sug.sceneId,
              src: asset.url,
              assetType: asset.type,
              mode: sug.mode,
              start: sug.start,
              end: sug.end,
              opacity: 1,
            });
          }
        } catch {
          /* B-roll opcional — falha não quebra o pipeline */
        }
      }
      await writeFile(
        path.join(jobDir, 'overlays.json'),
        JSON.stringify({ suggestions: overlaySuggestions, resolved: bRollImages }, null, 2)
      );

      const transitionCount = editDecisions.filter(
        (d) => d.action === 'transition'
      ).length;

      return `${sceneDecisions.length} cenas, ${imageCount} imagens, ${zoomInstructions.length} zooms, ${transitionCount} transicoes, ${bRollImages.length} B-roll`;
    });

    // ──────────────────────────────────────────────
    // Step 8: Select music
    // ──────────────────────────────────────────────
    await this.runStep(job, 'select-music', async () => {
      if (!job.config.musicEnabled) {
        return 'Music disabled';
      }

      await jobStore.updateStatus(job.id, 'selecting-music');

      const mood =
        job.config.musicMood ?? editPlan?.musicMood ?? preset.musicMood;
      musicTrack = await selectMusic(mood);

      if (musicTrack) {
        await writeFile(
          path.join(jobDir, 'music-selection.json'),
          JSON.stringify(musicTrack, null, 2)
        );
        return `Selected "${musicTrack.name}" (${musicTrack.mood})`;
      }

      return 'No music tracks available in library';
    });

    // ──────────────────────────────────────────────
    // Step 9: Mix audio (voice + music with ducking)
    // ──────────────────────────────────────────────
    const mixedAudioPath = path.join(jobDir, 'mixed-audio.aac');
    await this.runStep(job, 'mix-audio', async () => {
      await jobStore.updateStatus(job.id, 'audio-mixing');

      // First, normalize the voice audio
      const normalizedAudioPath = path.join(jobDir, 'audio-normalized.wav');
      await normalizeAudioLoudness(audioPath, normalizedAudioPath);

      let baseAudio = normalizedAudioPath;
      let resultMsg = 'Audio normalized (no music)';

      if (musicTrack && job.config.musicEnabled) {
        // Mix voice with music
        await mixWithFades(
          normalizedAudioPath,
          musicTrack.path,
          mixedAudioPath,
          videoDuration,
          {
            musicVolume: preset.musicVolume,
            duckingEnabled: true,
            duckAmount: 14,
            fadeInDuration: 2,
            fadeOutDuration: 3,
          }
        );
        baseAudio = mixedAudioPath;
        resultMsg = 'Voice + music mixed with ducking';
      }

      // SFX layer (MPX preset) — overlays caption/cut/impact sounds.
      // Gracefully no-ops when no SFX files are present in public/sfx/.
      job.mixedAudioPath = baseAudio;
      if (preset.strategicZoom && editPlan) {
        try {
          // Context-aware SFX: the decision engine picks the right sound
          // for each edit moment (click/whoosh/snap/soft_hit...).
          const cues = decideSfx(editDecisions, videoDuration);
          let placements = buildCueSfx(cues);
          // Fallback: if named SFX files are missing, use scene-boundary SFX
          if (placements.length === 0) {
            const sceneStarts = editPlan.scenes
              .map((s) => s.startTime)
              .sort((a, b) => a - b);
            placements = buildSceneSfx(sceneStarts);
          }
          if (placements.length > 0) {
            const sfxAudioPath = path.join(jobDir, 'audio-with-sfx.aac');
            const applied = await mixSfx(baseAudio, sfxAudioPath, placements);
            if (applied) {
              job.mixedAudioPath = sfxAudioPath;
              resultMsg += ` + ${placements.length} SFX`;
            }
          }
        } catch {
          // SFX failure must not break the pipeline
        }
      }

      return resultMsg;
    });

    // ──────────────────────────────────────────────
    // Step 10: Render final video via Remotion
    // ──────────────────────────────────────────────
    const finalVideoPath = path.join(jobDir, 'final.mp4');
    await this.runStep(job, 'render', async () => {
      await jobStore.updateStatus(job.id, 'rendering');

      // Resolve output dimensions.
      // MPX preset (forceVertical) ALWAYS exports 1080x1920 9:16.
      const renderPreset = getPreset(job.config.preset);
      let width = job.videoWidth ?? RENDER_DEFAULTS.width;
      let height = job.videoHeight ?? RENDER_DEFAULTS.height;
      if (renderPreset.forceVertical) {
        width = 1080;
        height = 1920;
      }
      const fps = RENDER_DEFAULTS.fps;

      // Map caption style for Remotion
      const captionStyleForRemotion = captionBlocks.length > 0
        ? captionBlocks[0].style
        : {
            name: 'clean', fontFamily: 'Inter, sans-serif', fontWeight: 600,
            fontSize: 42, color: '#FFFFFF', highlightColor: '#00D4FF',
            position: 'bottom' as const, uppercase: false, maxWordsPerLine: 5,
            animation: 'fade' as const,
          };

      // Map scenes for Remotion
      const scenesForRemotion = (editPlan?.scenes ?? []).map((s) => ({
        id: s.id,
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        emphasis: s.emphasis,
        transitionIn: s.transitionIn,
        transitionOut: s.transitionOut,
      }));

      // Remotion's OffthreadVideo only accepts http(s) URLs (not file://).
      // Serve the local video over HTTP via the Next.js /api/video route.
      const { pathToFileURL } = await import('url');
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3333';
      const videoSource = `${baseUrl}/api/video?id=${job.id}`;

      // Resolve effects — from saved editor state if present, else job config
      let effects = job.config.effects ?? {
        colorGrading: 'none',
        vignette: false,
        vignetteIntensity: 0.3,
        letterbox: false,
        letterboxRatio: 2.35,
        blurBackground: false,
      };
      try {
        const editorStatePath = path.join(jobDir, 'editor-state.json');
        const savedRaw = await readFile(editorStatePath, 'utf-8');
        const saved = JSON.parse(savedRaw);
        if (saved.effects) effects = saved.effects;
      } catch {
        /* no saved editor state */
      }

      // Remotion render only accepts http(s) sources. Keep http B-roll
      // (Pexels/Pixabay); local B-roll files are skipped in render.
      void pathToFileURL;
      const bRollForRemotion = bRollImages.filter((b) => /^https?:/.test(b.src));

      const inputProps = {
        videoSrc: videoSource,
        captions: captionBlocks.map((b) => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
          words: b.words,
          text: b.text,
          style: b.style,
        })),
        zooms: zoomInstructions,
        scenes: scenesForRemotion,
        captionStyle: captionStyleForRemotion,
        fps,
        effects,
        bRollImages: bRollForRemotion,
      };

      // ─── Quality Gate ─── valida o padrão MPX antes de renderizar
      try {
        const sfxCount = decideSfx(editDecisions, videoDuration).length;
        const captionPresetName = renderPreset.forceVertical
          ? 'mpx-premium'
          : 'minimal-clean';
        const report = runQualityGate({
          width,
          height,
          captionSettings: getCaptionPreset(captionPresetName),
          zooms: zoomInstructions,
          decisions: editDecisions,
          sfxCount,
          videoDuration,
        });
        await writeFile(
          path.join(jobDir, 'quality-report.txt'),
          formatQualityReport(report)
        );
        if (!report.pass) {
          console.warn('[QualityGate] avisos:', report.warnings.join(' | '));
        }
      } catch {
        /* QualityGate é informativo — não bloqueia o render */
      }

      // Save composition data for reference
      await writeFile(
        path.join(jobDir, 'composition.json'),
        JSON.stringify(inputProps, null, 2)
      );

      // Render using Remotion
      const renderer = new RemotionRenderProvider();
      const availability = await renderer.validateAvailability();
      if (availability.status !== 'available') {
        throw new Error(`Remotion renderer unavailable: ${availability.error}`);
      }

      const result = await renderer.render(
        'MainComposition',
        inputProps,
        {
          width,
          height,
          fps,
          codec: RENDER_DEFAULTS.codec,
          outputPath: finalVideoPath,
        }
      );

      job.finalVideoPath = result.outputPath;

      // Copy to exports directory
      const exportsDir = path.join(EXPORTS_DIR, job.id);
      await mkdir(exportsDir, { recursive: true });
      await copyFile(result.outputPath, path.join(exportsDir, 'final.mp4'));

      // Also copy subtitles and edit plan to exports
      const srtPath = path.join(jobDir, 'captions.srt');
      const vttPath = path.join(jobDir, 'captions.vtt');
      if (existsSync(srtPath)) await copyFile(srtPath, path.join(exportsDir, 'transcription.srt'));
      if (existsSync(vttPath)) await copyFile(vttPath, path.join(exportsDir, 'transcription.vtt'));
      if (existsSync(editPlanPath)) await copyFile(editPlanPath, path.join(exportsDir, 'edit-plan.json'));

      const sizeMb = (result.fileSizeBytes / 1024 / 1024).toFixed(1);
      return `Rendered ${result.durationSeconds.toFixed(1)}s video (${sizeMb}MB)`;
    });

    // ──────────────────────────────────────────────
    // Step 11: Generate outputs (thumbnail, SRT, VTT, metadata)
    // ──────────────────────────────────────────────
    await this.runStep(job, 'generate-outputs', async () => {
      const outputs: { name: string; path: string; type: string }[] = [];

      // Generate thumbnail
      const thumbnailPath = path.join(jobDir, 'thumbnail.jpg');
      try {
        const videoForThumb = job.normalizedVideoPath ?? job.originalVideoPath;
        if (videoForThumb) {
          const hookScene = editPlan?.scenes.find(
            (s) => s.type === 'hook'
          );
          const thumbTime = hookScene
            ? hookScene.startTime + (hookScene.endTime - hookScene.startTime) / 2
            : 1;
          await generateThumbnail(videoForThumb, thumbnailPath, thumbTime);
          job.thumbnailPath = thumbnailPath;
          outputs.push({
            name: 'Thumbnail',
            path: thumbnailPath,
            type: 'image/jpeg',
          });
          // Copy to exports
          const exportsDir = path.join(EXPORTS_DIR, job.id);
          if (existsSync(exportsDir)) {
            await copyFile(thumbnailPath, path.join(exportsDir, 'thumbnail.jpg'));
          }
        }
      } catch (err) {
        console.error('Thumbnail generation failed:', err);
      }

      // Add subtitle files to outputs
      const srtPath = path.join(jobDir, 'captions.srt');
      const vttPath = path.join(jobDir, 'captions.vtt');
      if (existsSync(srtPath)) {
        outputs.push({ name: 'Subtitles (SRT)', path: srtPath, type: 'text/srt' });
      }
      if (existsSync(vttPath)) {
        outputs.push({ name: 'Subtitles (VTT)', path: vttPath, type: 'text/vtt' });
      }

      // Save metadata summary
      const metadata = {
        jobId: job.id,
        originalDuration: videoDuration,
        scenes: editPlan?.scenes.length ?? 0,
        captionBlocks: captionBlocks.length,
        musicTrack: musicTrack?.name ?? null,
        preset: preset.name,
        silencesRemoved: silences.length,
        zoomInstructions: zoomInstructions.length,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };
      const metadataPath = path.join(jobDir, 'metadata.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      outputs.push({
        name: 'Metadata',
        path: metadataPath,
        type: 'application/json',
      });

      if (job.finalVideoPath && existsSync(job.finalVideoPath)) {
        outputs.push({
          name: 'Final Video',
          path: job.finalVideoPath,
          type: 'video/mp4',
        });
      }

      job.outputFiles = outputs;
      return `${outputs.length} output files generated`;
    });

    // ──────────────────────────────────────────────
    // Mark job as completed
    // ──────────────────────────────────────────────
    const hasFailures = job.steps.some((s) => s.status === 'failed');
    if (hasFailures) {
      const failedSteps = job.steps
        .filter((s) => s.status === 'failed')
        .map((s) => s.name);
      job.status = 'completed'; // Completed with warnings
      job.error = `Completed with failures in: ${failedSteps.join(', ')}`;
    } else {
      job.status = 'completed';
    }

    await jobStore.save(job);
  }

  /**
   * Run a single pipeline step with error handling and state management.
   * Returns true if the step succeeded, false if it failed.
   */
  private async runStep(
    job: Job,
    stepName: string,
    fn: () => Promise<string>
  ): Promise<boolean> {
    const step = job.steps.find((s) => s.name === stepName);
    if (!step) return false;

    // Skip if already completed (for retry scenarios)
    if (step.status === 'completed') return true;

    step.status = 'running';
    step.startedAt = new Date().toISOString();
    await jobStore.save(job);

    try {
      const details = await fn();
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.progress = 100;
      step.details = details;
      await jobStore.save(job);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
      step.error = errorMessage;
      job.error = `Step "${stepName}" failed: ${errorMessage}`;
      await jobStore.save(job);
      console.error(`Pipeline step "${stepName}" failed:`, err);
      return false;
    }
  }

  /**
   * Generate an edit plan using Claude AI.
   */
  private async generateEditPlan(
    transcriptText: string,
    duration: number,
    presetName: string,
    customPrompt?: string
  ): Promise<EditPlan> {
    const prompt = `Voce e um editor de video profissional para redes sociais. Analise a transcricao e crie um plano de edicao detalhado.

DURACAO DO VIDEO: ${duration.toFixed(1)} segundos
PRESET: ${presetName}
${customPrompt ? `INSTRUCAO EXTRA: ${customPrompt}` : ''}

TRANSCRICAO (com timestamps):
${transcriptText}

Retorne JSON valido com EXATAMENTE este formato:
{
  "format": "short_form",
  "mainTheme": "tema principal do video",
  "targetDuration": ${Math.round(duration)},
  "mood": "energetic|calm|cinematic|inspiring|playful",
  "pace": "slow|medium|fast|aggressive",
  "musicMood": "energetic|calm|cinematic|inspiring",
  "highlights": ["palavra1", "palavra2"],
  "scenes": [
    {
      "id": "uuid-string",
      "type": "hook|problem|solution|benefit|proof|cta|narration|title|transition",
      "startTime": 0.0,
      "endTime": 5.0,
      "title": "Titulo da cena",
      "subtitle": "Subtitulo",
      "emphasis": 0.8,
      "illustrationPrompt": "prompt para gerar imagem se necessario",
      "zoomSuggestion": "in|out|none",
      "transitionIn": "cut|fade|slide",
      "transitionOut": "cut|fade|slide"
    }
  ]
}

Regras:
- Crie cenas que cobrem toda a duracao do video
- startTime/endTime devem ser em segundos, baseados nos timestamps da transcricao
- emphasis: 0-1, quao importante e esta cena (hook e cta devem ter emphasis alto)
- O primeiro scene deve ser tipo "hook"
- O ultimo scene deve ser tipo "cta"
- highlights: palavras-chave impactantes para destacar nas legendas
- illustrationPrompt: descreva uma imagem que ilustre o conteudo (em ingles)
- Retorne APENAS o JSON, sem markdown.`;

    const msg = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      msg.content[0].type === 'text' ? msg.content[0].text : '{}';

    // Try to extract JSON from the response
    let jsonStr = text.trim();
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as EditPlan;

    // Validate and assign IDs if missing
    const { v4: uuidv4 } = await import('uuid');
    for (const scene of parsed.scenes) {
      if (!scene.id) scene.id = uuidv4();
      if (scene.emphasis === undefined) scene.emphasis = 0.5;
    }

    return parsed;
  }

  /**
   * Create a minimal fallback edit plan when AI analysis fails.
   */
  private createFallbackEditPlan(
    transcription: TranscriptionSegment[],
    duration: number
  ): EditPlan {
    const { v4: uuidv4 } = require('uuid');

    const hookEnd = Math.min(duration * 0.15, 5);
    const ctaStart = Math.max(duration * 0.85, duration - 5);

    return {
      format: 'short_form',
      mainTheme: 'Conteudo',
      targetDuration: duration,
      mood: 'cinematic',
      pace: 'medium',
      musicMood: 'cinematic',
      highlights: [],
      scenes: [
        {
          id: uuidv4(),
          type: 'hook',
          startTime: 0,
          endTime: hookEnd,
          title: 'Abertura',
          emphasis: 0.9,
          zoomSuggestion: 'in',
          transitionIn: 'cut',
          transitionOut: 'fade',
        },
        {
          id: uuidv4(),
          type: 'narration',
          startTime: hookEnd,
          endTime: ctaStart,
          title: 'Conteudo Principal',
          emphasis: 0.5,
          zoomSuggestion: 'none',
          transitionIn: 'fade',
          transitionOut: 'fade',
        },
        {
          id: uuidv4(),
          type: 'cta',
          startTime: ctaStart,
          endTime: duration,
          title: 'Call to Action',
          emphasis: 0.9,
          zoomSuggestion: 'in',
          transitionIn: 'fade',
          transitionOut: 'cut',
        },
      ],
    };
  }
}

export const pipelineManager = new PipelineManager();
