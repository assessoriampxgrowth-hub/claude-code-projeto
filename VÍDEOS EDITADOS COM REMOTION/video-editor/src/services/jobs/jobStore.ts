import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/config/defaults';
import type { Job, JobStep, JobStatus } from '@/services/pipeline/types';

/**
 * File-based job persistence.
 * Each job is stored as uploads/[id]/job.json.
 */
export class JobStore {
  private getJobDir(id: string): string {
    return path.join(UPLOADS_DIR, id);
  }

  private getJobFile(id: string): string {
    return path.join(this.getJobDir(id), 'job.json');
  }

  /**
   * Save a job to disk.
   */
  async save(job: Job): Promise<void> {
    const dir = this.getJobDir(job.id);
    await mkdir(dir, { recursive: true });
    job.updatedAt = new Date().toISOString();
    await writeFile(this.getJobFile(job.id), JSON.stringify(job, null, 2), 'utf-8');
  }

  /**
   * Load a job from disk by ID.
   */
  async load(id: string): Promise<Job | null> {
    const file = this.getJobFile(id);
    if (!existsSync(file)) {
      return null;
    }
    try {
      const raw = await readFile(file, 'utf-8');
      return JSON.parse(raw) as Job;
    } catch {
      return null;
    }
  }

  /**
   * List all jobs, sorted by creation date descending.
   */
  async list(limit?: number): Promise<Job[]> {
    if (!existsSync(UPLOADS_DIR)) {
      return [];
    }

    const entries = await readdir(UPLOADS_DIR);
    const jobs: Job[] = [];

    for (const entry of entries) {
      const jobFile = path.join(UPLOADS_DIR, entry, 'job.json');
      if (!existsSync(jobFile)) continue;
      try {
        const raw = await readFile(jobFile, 'utf-8');
        jobs.push(JSON.parse(raw) as Job);
      } catch {
        // Skip corrupted job files
      }
    }

    // Sort by creation date, newest first
    jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return limit ? jobs.slice(0, limit) : jobs;
  }

  /**
   * Update a specific step within a job.
   */
  async updateStep(
    jobId: string,
    stepName: string,
    update: Partial<JobStep>
  ): Promise<void> {
    const job = await this.load(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const stepIndex = job.steps.findIndex((s) => s.name === stepName);
    if (stepIndex === -1) {
      throw new Error(`Step "${stepName}" not found in job ${jobId}`);
    }

    job.steps[stepIndex] = { ...job.steps[stepIndex], ...update };
    await this.save(job);
  }

  /**
   * Update the top-level job status and optionally set an error.
   */
  async updateStatus(
    jobId: string,
    status: JobStatus,
    error?: string
  ): Promise<void> {
    const job = await this.load(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = status;
    if (error !== undefined) {
      job.error = error;
    }
    await this.save(job);
  }

  /**
   * Get the directory for a job's files.
   */
  getDir(id: string): string {
    return this.getJobDir(id);
  }
}

export const jobStore = new JobStore();
