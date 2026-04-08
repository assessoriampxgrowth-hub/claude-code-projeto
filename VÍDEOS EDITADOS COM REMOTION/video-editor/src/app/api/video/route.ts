import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return new NextResponse('No id', { status: 400 });
  const uploadDir = path.join(process.cwd(), 'uploads', id);
  let videoPath = '';
  for (const name of ['original.mp4', 'original.mov', 'original.hevc', 'original.webm']) {
    const p = path.join(uploadDir, name);
    if (existsSync(p)) { videoPath = p; break; }
  }
  if (!videoPath) return new NextResponse('Not found', { status: 404 });
  const fileStat = await stat(videoPath);
  const fileSize = fileStat.size;
  const range = req.headers.get('range');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = createReadStream(videoPath, { start, end });
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': String(chunkSize), 'Content-Type': 'video/mp4' },
    });
  }
  const stream = createReadStream(videoPath);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: { 'Content-Length': String(fileSize), 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' },
  });
}
