import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  return NextResponse.json({ url: `/api/video?id=${id}`, message: 'Render simulado' });
}
