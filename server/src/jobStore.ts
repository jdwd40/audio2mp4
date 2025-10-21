import { JobData } from './types.js';

/**
 * In-memory job store
 * In production, this could be Redis or a database
 */
class JobStore {
  private jobs = new Map<string, JobData>();
  private activeJobId: string | null = null;

  set(jobId: string, job: JobData): void {
    this.jobs.set(jobId, job);
  }

  get(jobId: string): JobData | undefined {
    return this.jobs.get(jobId);
  }

  delete(jobId: string): void {
    this.jobs.delete(jobId);
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
    }
  }

  isJobActive(): boolean {
    return this.activeJobId !== null;
  }

  getActiveJobId(): string | null {
    return this.activeJobId;
  }

  setActiveJob(jobId: string): void {
    this.activeJobId = jobId;
  }

  clearActiveJob(): void {
    this.activeJobId = null;
  }

  updateStatus(jobId: string, status: JobData['status'], error?: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (status === 'done' || status === 'error') {
        job.completedAt = new Date();
      }
      if (error) {
        job.error = error;
      }
    }
  }
}

export const jobStore = new JobStore();

