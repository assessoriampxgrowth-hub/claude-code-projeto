import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/services/jobs/jobManager';
import { pipelineManager } from '@/services/pipeline/manager';
import type { JobConfig } from '@/services/pipeline/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoPath, preset, captionStyle, musicEnabled, musicMood, scenesEnabled, aggressiveCuts, zoomEnabled, customPrompt } = body;

    if (!videoPath) {
      return NextResponse.json({ error: 'videoPath is required' }, { status: 400 });
    }

    const config: Partial<JobConfig> = {
      preset: preset ?? 'premium',
      captionStyle,
      musicEnabled: musicEnabled ?? true,
      musicMood,
      scenesEnabled: scenesEnabled ?? true,
      aggressiveCuts: aggressiveCuts ?? false,
      zoomEnabled: zoomEnabled ?? true,
      customPrompt,
    };

    const job = await jobManager.createJob(videoPath, config);

    // Start pipeline in background (don't await)
    pipelineManager.run(job).catch((err) => {
      console.error(`Pipeline failed for job ${job.id}:`, err);
    });

    return NextResponse.json({ id: job.id, status: job.status });
  } catch (err) {
    console.error('Job creation error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const jobs = await jobManager.listJobs(50);
    return NextResponse.json(jobs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
