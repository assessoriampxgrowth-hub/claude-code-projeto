import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    const prompt = (formData.get('prompt') as string) ?? '';
    const id = (formData.get('id') as string) || uuidv4();
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    const uploadDir = path.join(process.cwd(), 'uploads', id);
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop() ?? 'mp4';
    const videoPath = path.join(uploadDir, `original.${ext}`);
    await writeFile(videoPath, buffer);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3333'}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, videoPath, prompt }),
    }).catch(console.error);
    return NextResponse.json({ id, status: 'normalizing', videoPath, prompt });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
