import { LongRunner } from "../../src";

describe("Long Runner tests", () => {
  let longRunner: LongRunner;
  beforeEach(async () => {
    jest.useFakeTimers();
    longRunner = new LongRunner();
  });
  test.each([1, 2, 3, 4, 5, 6, 1000])("iterates over all elements by %s", (batchSize) => {
    const iterationCallback = jest.fn();
    longRunner.queueJob("a", new Array(5), iterationCallback, batchSize);
    expect(iterationCallback).toBeCalledTimes(5);
  });

  test("can iterate over empty collections", () => {
    const iterationCallback = jest.fn();
    longRunner.queueJob("a", [], iterationCallback, 5);
    expect(iterationCallback).toBeCalledTimes(0);
  });

  test("uses done callback correctly", () => {
    const doneCallback = jest.fn();
    const iterationCallback = jest.fn(() => {
      expect(doneCallback).toBeCalledTimes(0);
    });
    longRunner.queueJob("a", new Array(1), iterationCallback, 5, doneCallback);
    expect(iterationCallback).toBeCalledTimes(1);
    expect(doneCallback).toBeCalledTimes(1);
  });

  test("stops execution after N milliseconds and resumes afterwards", async () => {
    const doneCallback = jest.fn();
    const iterationCallback = jest.fn(() => {
      jest.advanceTimersByTime(3);
    });

    /*
     * Batch size : 2
     * Render every 5 MS
     * Each element of the batch takes 3 MS
     * First batch: 6MS, then immediately over time for second batch
     *
     * [ 0   ,   1   ,   2   ,   3   ,   4   ,]
     * |-1st batch --|
     *            setTimeout
     *               |--2nd batch----|
     *                               setTimeout
     *                               |--3rd batch with last element
     * */

    const donePromise = longRunner.queueJob(
      "a",
      new Array(5),
      iterationCallback,
      2,
      doneCallback,
      5
    );
    expect(iterationCallback).toBeCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
    jest.runAllTimers();
    expect(iterationCallback).toBeCalledTimes(5);
    expect(doneCallback).toBeCalledTimes(1);
    return expect(donePromise).resolves;
  });

  test("triggers events correctly", () => {
    const iterationCallback = jest.fn(() => {
      jest.advanceTimersByTime(3);
    });

    const jobQueueEvent = jest.fn();
    const jobStartedEvent = jest.fn();
    const jobContinuedEvent = jest.fn();
    const jobDoneEvent = jest.fn();

    longRunner.on("job-queued", this, jobQueueEvent);
    longRunner.on("job-started", this, jobStartedEvent);
    longRunner.on("job-continued", this, jobContinuedEvent);
    longRunner.on("job-done", this, jobDoneEvent);

    longRunner.queueJob("a", new Array(5), iterationCallback, 2, () => {}, 5);
    expect(jobQueueEvent).toBeCalledTimes(1);
    expect(jobStartedEvent).toBeCalledTimes(1);
    expect(jobContinuedEvent).toBeCalledTimes(0);
    expect(jobDoneEvent).toBeCalledTimes(0);

    jest.runAllTimers();

    expect(jobQueueEvent).toBeCalledTimes(1);
    expect(jobStartedEvent).toBeCalledTimes(1);
    expect(jobContinuedEvent).toBeCalledTimes(2);
    expect(jobDoneEvent).toBeCalledTimes(1);
  });

  test("queues jobs", async () => {
    const firstJobIterable = jest.fn(() => {
      jest.advanceTimersByTime(3);
    });
    const firstJobDone = jest.fn();
    const secondJobIterable = jest.fn();
    const doneA = longRunner.queueJob("a", new Array(3), firstJobIterable, 1, firstJobDone, 5);
    const doneB = longRunner.queueJob("b", new Array(3), secondJobIterable);

    expect(firstJobIterable).toBeCalledTimes(2);
    expect(firstJobDone).toBeCalledTimes(0);
    // even though the first job is in a setTimeout (stopped but not done), the second job didn't start
    expect(secondJobIterable).toBeCalledTimes(0);

    jest.runAllTimers();

    expect(firstJobIterable).toBeCalledTimes(3);
    expect(secondJobIterable).toBeCalledTimes(3);

    return expect(Promise.all([doneA, doneB])).resolves;
  });
});
