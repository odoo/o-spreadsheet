import { protectFunction, sanitizeArgs } from "../../src/functions/arguments_sanitizer";
import { args } from "../../src/functions/arguments";

describe("protectFunction", () => {
  test("function with no args is not modified", () => {
    function fn() {}
    expect(protectFunction(fn, [])).toBe(fn);
  });
});

describe("sanitizeArgs", () => {
  test("a single number argument", () => {
    const argList = args`n (number) some number`;

    expect(sanitizeArgs([1], argList)).toEqual([1]);
    expect(sanitizeArgs([false], argList)).toEqual([0]);
    expect(sanitizeArgs([true], argList)).toEqual([1]);
    expect(sanitizeArgs([undefined], argList)).toEqual([0]);
    expect(sanitizeArgs([""], argList)).toEqual([0]);
    expect(sanitizeArgs(["1"], argList)).toEqual([1]);
    expect(sanitizeArgs(["-1"], argList)).toEqual([-1]);
    expect(sanitizeArgs(["1.1"], argList)).toEqual([1.1]);
    expect(() => sanitizeArgs(["ab"], argList)).toThrow(
      'Argument "n" should be a number, but "ab" is a text, and cannot be coerced to a number.'
    );
    expect(() => sanitizeArgs([], argList)).toThrow(
      "Wrong number of arguments. Expected 1, but got 0 argument instead."
    );
    expect(() => sanitizeArgs([1, 2], argList)).toThrow(
      "Wrong number of arguments. Expected 1, but got 2 arguments instead."
    );
  });

  test("an optional number argument", () => {
    const argList = args`n (number,optional) some number`;

    expect(sanitizeArgs([1], argList)).toEqual([1]);
    expect(sanitizeArgs([false], argList)).toEqual([0]);
    expect(sanitizeArgs([true], argList)).toEqual([1]);
    expect(sanitizeArgs([undefined], argList)).toEqual([]);
    expect(sanitizeArgs([], argList)).toEqual([]);
  });

  test("repeating, non optional, number argument", () => {
    const argList = args`n (number,repeating) some number`;

    expect(() => sanitizeArgs([], argList)).toThrow(
      "Wrong number of arguments. Expected 1, but got 0 argument instead."
    );

    expect(sanitizeArgs([1], argList)).toEqual([1]);
    expect(sanitizeArgs([1, false], argList)).toEqual([1, 0]);
    expect(sanitizeArgs(["-1", 2, true], argList)).toEqual([-1, 2, 1]);
    expect(sanitizeArgs(["-1", 2, undefined, true], argList)).toEqual([-1, 2, 0, 1]);
    expect(sanitizeArgs(["-1", 2, true, undefined], argList)).toEqual([-1, 2, 1, 0]);
  });

  test("an optional number argument after another argument", () => {
    const argList = args`
      m (number) a number
      n (number,optional) another number`;

    expect(sanitizeArgs([1], argList)).toEqual([1]);
    expect(sanitizeArgs([1, false], argList)).toEqual([1, 0]);
    expect(sanitizeArgs([1, undefined], argList)).toEqual([1]);
  });

  test("a single boolean argument", () => {
    const argList = args`b (boolean) some boolean value`;

    expect(sanitizeArgs([1], argList)).toEqual([true]);
    expect(sanitizeArgs([0], argList)).toEqual([false]);
    expect(sanitizeArgs([true], argList)).toEqual([true]);
    expect(sanitizeArgs([false], argList)).toEqual([false]);
    expect(sanitizeArgs([undefined], argList)).toEqual([false]);
    expect(sanitizeArgs([""], argList)).toEqual([false]);
    expect(sanitizeArgs(["false"], argList)).toEqual([false]);
    expect(sanitizeArgs(["true"], argList)).toEqual([true]);
    expect(sanitizeArgs(["TRUE"], argList)).toEqual([true]);
    expect(() => sanitizeArgs(["abc"], argList)).toThrow(
      'Argument "b" should be a boolean, but "abc" is a text, and cannot be coerced to a boolean.'
    );
    expect(() => sanitizeArgs(["1"], argList)).toThrow(
      'Argument "b" should be a boolean, but "1" is a text, and cannot be coerced to a boolean.'
    );
  });
});
