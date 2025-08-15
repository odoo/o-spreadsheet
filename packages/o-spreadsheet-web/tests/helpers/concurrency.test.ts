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
    expect(resolveFn).toBeCalledWith(1);
    expect(catchFn).not.toBeCalled();
  });

  test("rejected promise", async () => {
    const catchFn = jest.fn();
    const resolveFn = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(Promise.reject(1)).then(resolveFn).catch(catchFn);
    await nextTick();
    expect(catchFn).toBeCalledWith(1);
    expect(resolveFn).not.toBeCalled();
  });

  test("two promise resolved in order", async () => {
    const resolveFn1 = jest.fn();
    const resolveFn2 = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(new Promise((resolve) => setTimeout(resolve, 10))).then(resolveFn1);
    keepLast.add(new Promise((resolve) => setTimeout(resolve, 20))).then(resolveFn2);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toBeCalled();
    expect(resolveFn2).not.toBeCalled();
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toBeCalled();
    expect(resolveFn2).toBeCalled();
  });

  test("two promise resolved in reverse order", async () => {
    const resolveFn1 = jest.fn();
    const resolveFn2 = jest.fn();
    const keepLast = new KeepLast();

    keepLast.add(new Promise((resolve) => setTimeout(resolve, 20))).then(resolveFn1);
    keepLast.add(new Promise((resolve) => setTimeout(resolve, 10))).then(resolveFn2);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toBeCalled();
    expect(resolveFn2).toBeCalledTimes(1);
    jest.advanceTimersByTime(15);
    await nextTick();
    expect(resolveFn1).not.toBeCalled();
    expect(resolveFn2).toBeCalledTimes(1);
  });
});
