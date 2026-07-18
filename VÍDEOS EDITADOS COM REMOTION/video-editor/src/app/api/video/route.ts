import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const file = req.nextUrl.searchParams.get('file'); // optional: 'normalized', 'final', 'original'

  if (!id) return new NextResponse('No id', { status: 400 });

  const uploadDir = path.join(process.cwd(), 'uploads', id);
  let videoPath = '';

  if (file === 'normalized') {
    const p = path.join(uploadDir, 'normalized.mp4');
    if (existsSync(p)) videoPath = p;
  } else if (file === 'final') {
    // Try exports first, then uploads
    const exportsPath = path.join(process.cwd(), 'exports', id, 'final.mp4');
    const uploadsPath = path.join(uploadDir, 'final.mp4');
    if (existsSync(exportsPath)) videoPath = exportsPath;
    else if (existsSync(uploadsPath)) videoPath = uploadsPath;
  }

  // Fallback: trimmed (post silence-cut) → normalized → original
  if (!videoPath) {
    for (const name of [
      'trimmed.mp4',
      'normalized.mp4',
      'original.mp4',
      'original.mov',
      'original.webm',
    ]) {
      const p = path.join(uploadDir, name);
      if (existsSync(p)) { videoPath = p; break; }
    }
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
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });
    return new Response(readable, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
      },
    });
  }

  const stream = createReadStream(videoPath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });
  return new Response(readable, {
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    },
  });
}
