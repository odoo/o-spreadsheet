import { Maybe } from "../types";
import { EventBus } from "./event_bus";

export interface LongRunningJob {
  jobName: string;
  batchSize: number;
  iterable: string | any[];
  executeCallback: (arg0: any) => void;
  renderEveryMs: number;
}

export interface ILongRunner {
  queueJob<T>(
    jobName: string,
    iterable: any[],
    callback: (item: T) => void,
    batchSize: number,
    renderEveryMs?: number
  ): void;
}

export class LongRunner extends EventBus<any> implements ILongRunner {
  private queue: LongRunningJob[];
  private runningJob: Maybe<LongRunningJob>;
  private readonly updateFrameCallback: (jobName: string, percentage: number) => void;

  constructor(updateFrameCallback: (jobName: string, percentage: number) => void) {
    super();
    this.queue = [];
    this.runningJob = undefined;
    this.updateFrameCallback =
      updateFrameCallback ||
      ((job, percentage) => {
        console.log(`${job} at ${percentage}%`);
      });
  }

  queueJob<T>(
    jobName: string,
    iterable: T[],
    callback: (item: T) => void,
    batchSize: number = 100,
    renderEveryMs: number = 500
  ) {
    this.trigger("job-queued", { name: jobName });
    this.queue.push({
      jobName: jobName,
      iterable: iterable,
      executeCallback: callback,
      batchSize: batchSize,
      renderEveryMs: renderEveryMs,
    });
    this.check();
  }

  private check() {
    if (!this.runningJob && this.queue.length > 0) {
      this.runningJob = this.queue.shift();
      if (this.runningJob) {
        this.run(
          this.runningJob,
          () => {
            if (this.runningJob) {
              this.trigger("job-done", { name: this.runningJob.jobName });
            }
            this.runningJob = undefined;
            this.check();
          },
          0
        );
      }
    }
  }

  private run(job: LongRunningJob, doneCallback: () => void, offset: number = 0) {
    let timeout = Date.now() + job.renderEveryMs;
    this.trigger("job-started", { name: job.jobName });

    while (Date.now() < timeout) {
      this.batchN(job, offset);
      offset += job.batchSize;
      if (offset > job.iterable.length) {
        doneCallback();
        return;
      }
    }
    setTimeout(() => {
      const progress = Math.floor((offset / job.iterable.length) * 100);
      this.trigger("job-continued", { name: job.jobName, progress: progress });
      this.updateFrameCallback(job.jobName, progress);
      this.run(job, doneCallback, offset);
    }, 0);
  }

  private batchN(job: LongRunningJob, offset: number) {
    const limit = Math.min(job.iterable.length, offset + job.batchSize);
    for (let i = offset; i < limit; i++) {
      job.executeCallback(job.iterable[i]);
    }
  }
}

export class SynchronousLongRunner implements ILongRunner {
  queueJob<T>(
    jobName: string,
    iterable: T[],
    callback: (item: T) => void,
    batchSize: number,
    renderEveryMs: number
  ): void {
    iterable.forEach(callback);
  }
}
