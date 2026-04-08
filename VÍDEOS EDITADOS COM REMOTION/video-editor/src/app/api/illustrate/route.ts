import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { sceneId, prompt, projectId } = await req.json();
  try {
    const response = await openai.images.generate({ model: 'dall-e-3', prompt: `${prompt}. Style: cinematic, dark background, vibrant colors, vertical 9:16`, size: '1024x1792', quality: 'standard', n: 1 });
    const imageUrl = response.data[0].url!;
    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const dir = path.join(process.cwd(), 'uploads', projectId, 'illustrations');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${sceneId}.png`), imageBuffer);
    return NextResponse.json({ url: `/api/illustration?projectId=${projectId}&sceneId=${sceneId}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
