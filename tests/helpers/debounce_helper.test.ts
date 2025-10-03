import { debounce } from "../../src/helpers";

describe("Debounce Helper", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("debounce calls function after wait time", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 200);

    debouncedFunc();
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();
    expect(func).not.toBeCalled();
    jest.advanceTimersByTime(100);
    expect(func).not.toBeCalled();
    jest.advanceTimersByTime(100);
    expect(func).toBeCalledTimes(1);
  });

  test("debounce with immediate=true calls function immediately and then after wait time", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 200, true);

    debouncedFunc();
    expect(func).toBeCalledTimes(1);
    debouncedFunc();
    debouncedFunc();
    expect(func).toBeCalledTimes(1);
    jest.advanceTimersByTime(200);
    expect(func).toBeCalledTimes(2);
    debouncedFunc();
    expect(func).toBeCalledTimes(3);
    jest.advanceTimersByTime(200);
    expect(func).toBeCalledTimes(3);
  });
});
