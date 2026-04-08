import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  const sceneId = req.nextUrl.searchParams.get('sceneId');
  if (!projectId || !sceneId) return new NextResponse('Bad request', { status: 400 });
  const filePath = path.join(process.cwd(), 'uploads', projectId, 'illustrations', `${sceneId}.png`);
  if (!existsSync(filePath)) return new NextResponse('Not found', { status: 404 });
  const buffer = await readFile(filePath);
  return new NextResponse(buffer, { headers: { 'Content-Type': 'image/png' } });
}
