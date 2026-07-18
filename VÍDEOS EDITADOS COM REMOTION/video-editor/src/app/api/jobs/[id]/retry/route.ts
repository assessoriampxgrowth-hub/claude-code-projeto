import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/services/jobs/jobManager';
import { pipelineManager } from '@/services/pipeline/manager';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await jobManager.retryJob(params.id);

    // Re-run pipeline in background
    pipelineManager.run(job).catch((err) => {
      console.error(`Pipeline retry failed for job ${job.id}:`, err);
    });

    return NextResponse.json({ id: job.id, status: job.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
