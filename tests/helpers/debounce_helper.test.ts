import { debounce } from "../../src/helpers";
import { useJestFakeTimers } from "../test_helpers/helpers";

describe("Debounce Helper", () => {
  beforeAll(() => {
    useJestFakeTimers();
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
    expect(func).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(func).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  test("debounce with immediate=true calls function immediately and then after wait time", () => {
    const func = jest.fn();
    const debouncedFunc = debounce(func, 200, true);

    debouncedFunc();
    expect(func).toHaveBeenCalledTimes(1);
    debouncedFunc();
    debouncedFunc();
    expect(func).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    expect(func).toHaveBeenCalledTimes(2);
    debouncedFunc();
    expect(func).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(200);
    expect(func).toHaveBeenCalledTimes(3);
  });
});
