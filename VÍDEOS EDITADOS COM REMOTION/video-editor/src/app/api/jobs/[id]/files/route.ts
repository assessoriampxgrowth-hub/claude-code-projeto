import { NextRequest, NextResponse } from 'next/server';
import { existsSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import { EXPORTS_DIR, UPLOADS_DIR } from '@/config/defaults';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const files: { name: string; size: number; type: string; downloadUrl: string }[] = [];

    // Check exports dir
    const exportsDir = path.join(EXPORTS_DIR, id);
    if (existsSync(exportsDir)) {
      const entries = await readdir(exportsDir);
      for (const entry of entries) {
        const filePath = path.join(exportsDir, entry);
        const stat = statSync(filePath);
        if (stat.isFile()) {
          files.push({
            name: entry,
            size: stat.size,
            type: getFileType(entry),
            downloadUrl: `/api/jobs/${id}/download?file=${encodeURIComponent(entry)}`,
          });
        }
      }
    }

    // Also check uploads dir for files not in exports
    const uploadsDir = path.join(UPLOADS_DIR, id);
    if (existsSync(uploadsDir)) {
      const entries = await readdir(uploadsDir);
      const exportNames = new Set(files.map((f) => f.name));
      const relevantFiles = ['captions.srt', 'captions.vtt', 'captions.json', 'thumbnail.jpg', 'edit-plan.json', 'metadata.json', 'final.mp4', 'zoom-instructions.json', 'composition.json'];

      for (const entry of entries) {
        if (exportNames.has(entry)) continue;
        if (!relevantFiles.includes(entry)) continue;

        const filePath = path.join(uploadsDir, entry);
        const stat = statSync(filePath);
        if (stat.isFile()) {
          files.push({
            name: entry,
            size: stat.size,
            type: getFileType(entry),
            downloadUrl: `/api/jobs/${id}/download?file=${encodeURIComponent(entry)}`,
          });
        }
      }
    }

    return NextResponse.json({ id, files });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.mp4': 'video',
    '.srt': 'subtitle',
    '.vtt': 'subtitle',
    '.json': 'data',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
  };
  return types[ext] ?? 'file';
}
