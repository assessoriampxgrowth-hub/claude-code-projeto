import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JOB_LIMITS, UPLOADS_DIR } from '@/config/defaults';

const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > JOB_LIMITS.maxFileSize) {
      const maxMb = Math.round(JOB_LIMITS.maxFileSize / 1024 / 1024);
      return NextResponse.json(
        { error: `File too large. Maximum: ${maxMb}MB` },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported format: .${ext}. Use MP4, MOV, or WebM.` },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const uploadDir = path.join(UPLOADS_DIR, id);
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const videoPath = path.join(uploadDir, `original.${ext}`);
    await writeFile(videoPath, buffer);

    return NextResponse.json({
      id,
      filename: file.name,
      size: file.size,
      videoPath,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
