import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

export interface AssetResult {
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  source: 'pexels' | 'pixabay' | 'local';
}

const BROLL_LOCAL = path.join(process.cwd(), 'assets', 'broll');

/**
 * AssetSearchService — busca B-roll (imagem/vídeo) por query.
 * Modular: tenta Pexels → Pixabay → biblioteca local.
 * Se nada relevante for encontrado, retorna null (NUNCA insere aleatório).
 */
export async function searchBRoll(query: string): Promise<AssetResult | null> {
  // 1) Pexels (vídeo vertical preferido)
  const pexels = await searchPexels(query);
  if (pexels) return pexels;

  // 2) Pixabay
  const pixabay = await searchPixabay(query);
  if (pixabay) return pixabay;

  // 3) Fallback local
  return searchLocalBRoll(query);
}

async function searchPexels(query: string): Promise<AssetResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const video = data?.videos?.[0];
    if (!video) return null;
    // Pick a vertical-ish video file
    const file =
      (video.video_files ?? []).find((f: any) => f.height > f.width) ??
      video.video_files?.[0];
    if (!file) return null;
    return {
      url: file.link,
      type: 'video',
      width: file.width,
      height: file.height,
      source: 'pexels',
    };
  } catch {
    return null;
  }
}

async function searchPixabay(query: string): Promise<AssetResult | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=5`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const hit = data?.hits?.[0];
    if (!hit) return null;
    const v = hit.videos?.medium ?? hit.videos?.small;
    if (!v) return null;
    return {
      url: v.url,
      type: 'video',
      width: v.width,
      height: v.height,
      source: 'pixabay',
    };
  } catch {
    return null;
  }
}

async function searchLocalBRoll(query: string): Promise<AssetResult | null> {
  if (!existsSync(BROLL_LOCAL)) return null;
  try {
    const files = await readdir(BROLL_LOCAL);
    const terms = query.toLowerCase().split(/\s+/);
    // Match a local file whose name contains any query term
    const match =
      files.find((f) =>
        terms.some((t) => t.length > 2 && f.toLowerCase().includes(t))
      ) ?? null;
    if (!match) return null;
    const isVideo = /\.(mp4|mov|webm)$/i.test(match);
    return {
      url: path.join(BROLL_LOCAL, match),
      type: isVideo ? 'video' : 'image',
      width: 1080,
      height: 1920,
      source: 'local',
    };
  } catch {
    return null;
  }
}

// ─── SFX search (Freesound) ───

/**
 * Busca um SFX no Freesound por tipo (whoosh, click, pop...).
 * Retorna a URL de preview ou null. Fallback: arquivos locais resolvidos
 * pelo sfxMixer (resolveSfxFile).
 */
export async function searchFreesound(query: string): Promise<string | null> {
  const key = process.env.FREESOUND_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=duration:[0.1 TO 2.0]&fields=previews&page_size=3&token=${key}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const preview = data?.results?.[0]?.previews?.['preview-hq-mp3'];
    return preview ?? null;
  } catch {
    return null;
  }
}
