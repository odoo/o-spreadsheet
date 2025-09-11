import { KeepLast } from "../../src/helpers/concurrency";
import { nextTick } from "../test_helpers/helpers";

describe("KeepLast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test("basic use", async () => {
    const catchFn = jest.fn();
    const resolveFn = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(Promise.resolve(1)).then(resolveFn).catch(catchFn);
    await nextTick();
    expect(resolveFn).toHaveBeenCalledWith(1);
    expect(catchFn).not.toHaveBeenCalled();
  });

  test("rejected promise", async () => {
    const catchFn = jest.fn();
    const resolveFn = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(Promise.reject(1)).then(resolveFn).catch(catchFn);
    await nextTick();
    expect(catchFn).toHaveBeenCalledWith(1);
    expect(resolveFn).not.toHaveBeenCalled();
  });

  test("two promise resolved in order", async () => {
    const resolveFn1 = jest.fn();
    const resolveFn2 = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(new Promise((resolve) => setTimeout(resolve, 10))).then(resolveFn1);
    keepLast.add(new Promise((resolve) => setTimeout(resolve, 20))).then(resolveFn2);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toHaveBeenCalled();
    expect(resolveFn2).not.toHaveBeenCalled();
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toHaveBeenCalled();
    expect(resolveFn2).toHaveBeenCalled();
  });

  test("two promise resolved in reverse order", async () => {
    const resolveFn1 = jest.fn();
    const resolveFn2 = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(new Promise((resolve) => setTimeout(resolve, 20))).then(resolveFn1);
    keepLast.add(new Promise((resolve) => setTimeout(resolve, 10))).then(resolveFn2);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toHaveBeenCalled();
    expect(resolveFn2).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toHaveBeenCalled();
    expect(resolveFn2).toHaveBeenCalledTimes(1);
  });
});
