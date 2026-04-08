import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { parseSrt } from '@/lib/srtParser';
import type { ProjectData, VideoAnalysis } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { defaultColors } from '@/lib/colorUtils';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const store = new Map<string, ProjectData>();

async function saveState(data: ProjectData) {
  store.set(data.id, data);
  const dir = path.join(process.cwd(), 'uploads', data.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'state.json'), JSON.stringify(data, null, 2));
}

async function loadState(id: string): Promise<ProjectData | null> {
  if (store.has(id)) return store.get(id)!;
  const file = path.join(process.cwd(), 'uploads', id, 'state.json');
  if (!existsSync(file)) return null;
  const raw = await readFile(file, 'utf-8');
  const data = JSON.parse(raw) as ProjectData;
  store.set(id, data);
  return data;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
  const data = await loadState(id);
  if (!data) return NextResponse.json({ error: 'Not found', status: 'error' }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { id, videoPath, prompt } = await req.json();
  const state: ProjectData = { id, videoPath, status: 'normalizing', prompt };
  await saveState(state);
  runPipeline(state, videoPath, prompt).catch(async (err) => {
    await saveState({ ...state, status: 'error', error: String(err) });
  });
  return NextResponse.json({ id, status: 'normalizing' });
}

async function runPipeline(state: ProjectData, videoPath: string, prompt: string) {
  const uploadDir = path.join(process.cwd(), 'uploads', state.id);
  let s = { ...state, status: 'transcribing' as const, normalizedPath: videoPath };
  await saveState(s);

  let srtText = '';
  try {
    const audioFile = await readFile(videoPath);
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile], 'audio.mp4', { type: 'audio/mp4' }),
      model: 'whisper-1',
      response_format: 'srt',
    });
    srtText = transcription as unknown as string;
    await writeFile(path.join(uploadDir, 'transcription.srt'), srtText);
  } catch (err) {
    console.error('Transcription error:', err);
    srtText = '1\n00:00:00,000 --> 00:00:03,000\nConteúdo do vídeo\n\n';
  }

  const legendas = parseSrt(srtText);
  s = { ...s, transcription: legendas, status: 'analyzing' as const };
  await saveState(s);

  const transcriptText = legendas.map(l => `[${l.index}] ${l.text}`).join('\n');
  const analysis = await analyzeWithClaude(transcriptText, legendas.length, prompt);
  s = { ...s, status: 'ready' as const, analysis, videoUrl: `/api/video?id=${state.id}` };
  await saveState(s);
}

async function analyzeWithClaude(transcript: string, totalLegendas: number, userPrompt: string): Promise<VideoAnalysis> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Você é especialista em edição de vídeo para redes sociais. Analise a transcrição e crie um plano de cenas visuais.\n\nTOTAL DE LEGENDAS: ${totalLegendas}\nPROMPT: ${userPrompt || 'Criar vídeo impactante'}\n\nTRANSCRIÇÃO:\n${transcript}\n\nRetorne JSON válido:\n{\n  "format": "short_ad",\n  "mainTheme": "tema",\n  "palette": [{"bg": "#050508", "accent": "#FFB800", "text": "#FFFFFF"}],\n  "totalLegendas": ${totalLegendas},\n  "scenes": [{"id": "uuid", "type": "hook", "startLeg": 0, "endLeg": 5, "title": "Título", "subtitle": "Sub", "emoji": "🎯", "color": {"bg": "#050508", "accent": "#FFB800", "text": "#FFFFFF"}, "illustrationPrompt": "prompt"}]\n}\nRetorne APENAS JSON.`
      }]
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(text) as VideoAnalysis;
    parsed.scenes = parsed.scenes.map(s => ({ ...s, id: s.id || uuidv4() }));
    return parsed;
  } catch {
    return {
      format: 'short_ad', mainTheme: 'Conteúdo', palette: defaultColors, totalLegendas,
      scenes: [
        { id: uuidv4(), type: 'hook', startLeg: 0, endLeg: Math.floor(totalLegendas * 0.25), title: 'Hook', subtitle: 'Início', color: defaultColors[0], emoji: '🎯' },
        { id: uuidv4(), type: 'solution', startLeg: Math.floor(totalLegendas * 0.25), endLeg: Math.floor(totalLegendas * 0.75), title: 'Conteúdo', subtitle: 'Desenvolvimento', color: defaultColors[1], emoji: '💡' },
        { id: uuidv4(), type: 'cta', startLeg: Math.floor(totalLegendas * 0.75), endLeg: totalLegendas - 1, title: 'Call to Action', subtitle: 'Ação', color: defaultColors[2], emoji: '🚀' },
      ],
    };
  }
}
