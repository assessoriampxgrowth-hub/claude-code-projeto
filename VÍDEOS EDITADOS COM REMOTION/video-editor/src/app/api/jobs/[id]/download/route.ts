import { NextRequest, NextResponse } from 'next/server';
import { existsSync, statSync, createReadStream } from 'fs';
import path from 'path';
import { EXPORTS_DIR, UPLOADS_DIR } from '@/config/defaults';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const file = req.nextUrl.searchParams.get('file') ?? 'final.mp4';

    // Try exports dir first, then uploads dir
    let filePath = path.join(EXPORTS_DIR, id, file);
    if (!existsSync(filePath)) {
      filePath = path.join(UPLOADS_DIR, id, file);
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    // Handle range requests for video streaming
    const range = req.headers.get('range');
    if (range && contentType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });
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
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      });
    }

    // Full file download
    const stream = createReadStream(filePath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    const safeName = file.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(readable, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.srt': 'text/srt',
  '.vtt': 'text/vtt',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};
