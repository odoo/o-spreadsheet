import { Maybe, UID } from "../types";
import { EventBus } from "./event_bus";
import { UuidGenerator } from "./uuid";

export interface LongRunningJob {
  jobUID: UID;
  jobName: string;
  batchSize: number;
  iterable: string | any[];
  executeCallback: (arg0: any) => void;
  doneCallback: () => void;
  renderEveryMs: number;
}

export interface ILongRunner extends EventBus<any> {
  queueJob<T>(
    jobName: string,
    iterable: any[],
    executeCallback: (item: T) => void,
    batchSize: number,
    doneCallback?: () => void,
    renderEveryMs?: number
  ): void | Promise<void>;
}

export class LongRunner extends EventBus<any> implements ILongRunner {
  private queue: LongRunningJob[];
  private runningJob: Maybe<LongRunningJob>;
  private uuidGenerator: UuidGenerator;

  constructor() {
    super();
    this.queue = [];
    this.runningJob = undefined;
    this.uuidGenerator = new UuidGenerator();
  }

  queueJob<T>(
    jobName: string,
    iterable: T[],
    executeCallback: (item: T) => void,
    batchSize: number = 100,
    doneCallback: () => void = () => {},
    renderEveryMs: number = 100
  ): Promise<void> {
    const newId = this.uuidGenerator.uuidv4();
    this.trigger("job-queued", { id: newId, name: jobName });
    return new Promise((resolve) => {
      this.queue.push({
        jobUID: newId,
        jobName,
        iterable,
        executeCallback,
        doneCallback: () => {
          resolve();
          doneCallback();
        },
        batchSize,
        renderEveryMs,
      });
      this.check();
    });
  }

  private check() {
    if (!this.runningJob && this.queue.length > 0) {
      this.runningJob = this.queue.shift();
      if (this.runningJob) {
        this.trigger("job-started", { id: this.runningJob.jobUID, name: this.runningJob.jobName });
        this.run(this.runningJob, () => {
          if (this.runningJob) {
            this.runningJob.doneCallback();
            this.trigger("job-done", { id: this.runningJob.jobUID });
          }
          this.runningJob = undefined;
          this.check();
        });
      }
    }
  }

  private run(job: LongRunningJob, doneCallback: () => void, offset: number = 0) {
    let timeout = Date.now() + job.renderEveryMs;
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
      this.trigger("job-continued", { id: job.jobUID, name: job.jobName, progress: progress });
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

export class SynchronousLongRunner extends EventBus<any> implements ILongRunner {
  uuidGenerator = new UuidGenerator();

  queueJob<T>(
    jobName: string,
    iterable: T[],
    callback: (item: T) => void,
    batchSize: number,
    doneCallback: () => void = () => {},
    renderEveryMs: number
  ): void {
    const newId = this.uuidGenerator.uuidv4();
    this.trigger("job-queued", { id: newId, name: jobName });
    this.trigger("job-started", { id: newId, name: jobName });
    iterable.forEach(callback);
    doneCallback();
    this.trigger("job-done", { id: newId });
  }
}
