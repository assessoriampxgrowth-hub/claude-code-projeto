import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { jobStore } from './jobStore';
import type { Job, JobConfig } from '@/services/pipeline/types';
import { createInitialSteps } from '@/services/pipeline/types';
import { getPreset, DEFAULT_PRESET } from '@/config/presets';
import { JOB_LIMITS } from '@/config/defaults';

/**
 * Creates and manages the lifecycle of editing jobs.
 */
export class JobManager {
  /**
   * Create a new job from an uploaded video.
   */
  async createJob(
    videoPath: string,
    config?: Partial<JobConfig>
  ): Promise<Job> {
    const id = uuidv4();
    const preset = getPreset(config?.preset ?? DEFAULT_PRESET);

    const fullConfig: JobConfig = {
      preset: preset.name,
      captionStyle: config?.captionStyle ?? preset.captionStyle,
      musicEnabled: config?.musicEnabled ?? true,
      musicMood: config?.musicMood ?? preset.musicMood,
      scenesEnabled: config?.scenesEnabled ?? true,
      aggressiveCuts: config?.aggressiveCuts ?? preset.cutAggressiveness > 0.7,
      zoomEnabled: config?.zoomEnabled ?? preset.zoomIntensity > 0,
      customPrompt: config?.customPrompt,
    };

    const job: Job = {
      id,
      status: 'uploaded',
      config: fullConfig,
      steps: createInitialSteps(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalVideoPath: videoPath,
    };

    await jobStore.save(job);
    return job;
  }

  /**
   * Retrieve a job by ID.
   */
  async getJob(id: string): Promise<Job | null> {
    return jobStore.load(id);
  }

  /**
   * List recent jobs.
   */
  async listJobs(limit?: number): Promise<Job[]> {
    return jobStore.list(limit ?? JOB_LIMITS.defaultListLimit);
  }

  /**
   * Retry a failed job by resetting failed/pending steps and re-running.
   * Returns the updated job ready to be re-submitted to the pipeline.
   */
  async retryJob(id: string): Promise<Job> {
    const job = await jobStore.load(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job ${id} is not in failed state (current: ${job.status})`);
    }

    // Reset the failed step and all subsequent steps to pending
    let foundFailed = false;
    for (const step of job.steps) {
      if (step.status === 'failed') {
        foundFailed = true;
      }
      if (foundFailed) {
        step.status = 'pending';
        step.error = undefined;
        step.startedAt = undefined;
        step.completedAt = undefined;
        step.progress = undefined;
        step.details = undefined;
      }
    }

    job.status = 'uploaded';
    job.error = undefined;

    await jobStore.save(job);
    return job;
  }
}

export const jobManager = new JobManager();
