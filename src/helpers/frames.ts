import { Maybe } from "../types";

interface LongRunningJob {
  batchSize: number;
  iterable: string | any[];
  executeCallback: (arg0: any) => void;
  renderEveryMs: number;
}

const queue: LongRunningJob[] = [];
let runningJob: Maybe<LongRunningJob> = undefined;

let scheduler = setInterval(check, 15);

export function longRunning<T>(
  iterable: T[],
  callback: (item: T) => void,
  batchSize: number = 100,
  renderEveryMs: number = 100
) {
  if (queue.length === 0) {
    scheduler = setInterval(check, 15);
  }
  queue.push({
    iterable: iterable,
    executeCallback: callback,
    batchSize: batchSize,
    renderEveryMs: renderEveryMs,
  });
  check();
}

function check() {
  if (!runningJob && queue.length > 0) {
    runningJob = queue.shift();
    if (runningJob) {
      longRunningInner(runningJob, () => (runningJob = undefined), 0);
    }
  }
  if (queue.length === 0) {
    clearInterval(scheduler);
  }
}

function longRunningInner<T>(job: LongRunningJob, doneCallback: () => void, offset: number = 0) {
  let timeout = Date.now() + job.renderEveryMs;

  while (Date.now() < timeout) {
    console.log(`executing live at offset ${offset}`);
    batchN(job, offset);
    offset += job.batchSize;
    if (offset > job.iterable.length) {
      doneCallback();
      return;
    }
  }
  console.log(`setting timout with offset ${offset}`);
  setTimeout(() => {
    console.log(`executing timeout with offset ${offset}`);
    longRunningInner(job, doneCallback, offset);
  }, 0);
}

function batchN<T>(job: LongRunningJob, offset: number): boolean {
  for (let i = 0; i < job.batchSize; i++) {
    if (offset + i >= job.iterable.length) {
      return false;
    }
    job.executeCallback(job.iterable[i + offset]);
  }
  return true;
}
