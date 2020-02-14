import { protectFunction, makeSanitizer } from "../../src/functions/arguments_sanitizer";
import { args, Range } from "../../src/functions/arguments";

describe("protectFunction", () => {
  test("function with no args is not wrapped", () => {
    function fn() {}
    expect(protectFunction(fn, [])).toBe(fn);
  });
});

describe("makeSanitizer", () => {
  test("a single number argument", () => {
    const argList = args`n (number) some number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();
    // const sanitizeArgs = transformSanitizer(sanitizer);
    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([false])).toEqual([0]);
    expect(sanitizer([true])).toEqual([1]);
    expect(sanitizer([undefined])).toEqual([0]);
    expect(sanitizer([""])).toEqual([0]);
    expect(sanitizer(["1"])).toEqual([1]);
    expect(sanitizer(["-1"])).toEqual([-1]);
    expect(sanitizer(["1.1"])).toEqual([1.1]);

    expect(() => sanitizer(["ab"])).toThrow(
      'Argument "n" should be a number, but "ab" is a text, and cannot be coerced to a number.'
    );
    expect(() => sanitizer([])).toThrow(
      "Wrong number of arguments. Expected 1, but got 0 argument(s) instead."
    );
    expect(() => sanitizer([1, 2])).toThrow(
      "Wrong number of arguments. Expected 1, but got 2 argument(s) instead."
    );
  });

  test("an optional number argument", () => {
    const argList = args`n (number,optional) some number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([false])).toEqual([0]);
    expect(sanitizer([true])).toEqual([1]);
    expect(sanitizer([undefined])).toEqual([undefined]);
    expect(sanitizer([])).toEqual([]);
  });

  test("an optional number argument with a default value", () => {
    const argList = args`n (number,optional,default=42) some number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([false])).toEqual([0]);
    expect(sanitizer([true])).toEqual([1]);
    expect(sanitizer([undefined])).toEqual([42]);
    expect(sanitizer([])).toEqual([42]);
  });

  test("repeating, non optional, number argument", () => {
    const argList = args`n (number,repeating) some number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(() => sanitizer([])).toThrow(
      "Wrong number of arguments. Expected 1, but got 0 argument(s) instead."
    );

    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([1, false])).toEqual([1, 0]);
    expect(sanitizer(["-1", 2, true])).toEqual([-1, 2, 1]);
    expect(sanitizer(["-1", 2, undefined, true])).toEqual([-1, 2, 0, 1]);
    expect(sanitizer(["-1", 2, true, undefined])).toEqual([-1, 2, 1, 0]);
  });

  test("repeating, optional, number argument", () => {
    const argList = args`n (number,repeating,optional) some number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([])).toEqual([]);
    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([1, false])).toEqual([1, 0]);
    expect(sanitizer(["-1", 2, true])).toEqual([-1, 2, 1]);
    expect(sanitizer(["-1", 2, undefined, true])).toEqual([-1, 2, 0, 1]);
    expect(sanitizer(["-1", 2, true, undefined])).toEqual([-1, 2, 1, 0]);
  });

  test("an optional number argument after another argument", () => {
    const argList = args`
      m (number) a number
      n (number,optional) another number`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([1, false])).toEqual([1, 0]);
    expect(sanitizer([false, true])).toEqual([0, 1]);
    expect(sanitizer([1, undefined])).toEqual([1, undefined]);
  });

  test("a single boolean argument", () => {
    const argList = args`b (boolean) some boolean value`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([1])).toEqual([true]);
    expect(sanitizer([0])).toEqual([false]);
    expect(sanitizer([true])).toEqual([true]);
    expect(sanitizer([false])).toEqual([false]);
    expect(sanitizer([undefined])).toEqual([false]);
    expect(sanitizer([""])).toEqual([false]);
    expect(sanitizer(["false"])).toEqual([false]);
    expect(sanitizer(["true"])).toEqual([true]);
    expect(sanitizer(["TRUE"])).toEqual([true]);
    expect(() => sanitizer(["abc"])).toThrow(
      'Argument "b" should be a boolean, but "abc" is a text, and cannot be coerced to a boolean.'
    );
    expect(() => sanitizer(["1"])).toThrow(
      'Argument "b" should be a boolean, but "1" is a text, and cannot be coerced to a boolean.'
    );
  });

  test("a single string argument", () => {
    const argList = args`s (string) some string`;

    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer(["abc"])).toEqual(["abc"]);
    expect(sanitizer([1])).toEqual(["1"]);
    expect(sanitizer([false])).toEqual(["FALSE"]);
    expect(sanitizer([true])).toEqual(["TRUE"]);
    expect(sanitizer([undefined])).toEqual([""]);
  });

  test("a simple untyped range argument", () => {
    const argList = args`r (range) some values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    const m1: Range<number> = [[1, 2]]; // one column with 1 2
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, undefined],
      ["abc", true]
    ];
    expect(sanitizer([m2])).toEqual([m2]);

    expect(() => sanitizer([1])).toThrow('Argument "r" has the wrong type');
  });

  test("a simple range of numbers", () => {
    const argList = args`r (range<number>) some numeric values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    const m1 = [[1, 2]]; // one column with 1 2
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, 3],
      ["abc", 1]
    ];
    const m2_number = [
      [undefined, 3],
      [undefined, 1]
    ];
    expect(sanitizer([m2])).toEqual([m2_number]);

    expect(() => sanitizer([1])).toThrow('Argument "r" has the wrong type');
  });

  test("a simple range of booleans", () => {
    const argList = args`r (range<boolean>) some boolean values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    const m1: Range<boolean> = [[true, false]];
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, 3],
      [true, "true"]
    ];
    const m2_number = [
      [undefined, undefined],
      [true, undefined]
    ];
    expect(sanitizer([m2])).toEqual([m2_number]);

    expect(() => sanitizer([1])).toThrow('Argument "r" has the wrong type');
  });

  test("a simple range of strings", () => {
    const argList = args`r (range<string>) some string values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    const m1 = [["a", "b"]]; // one column with 1 2
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, 3],
      ["abc", 1]
    ];
    const m2_number = [
      [undefined, undefined],
      ["abc", undefined]
    ];
    expect(sanitizer([m2])).toEqual([m2_number]);

    expect(() => sanitizer([1])).toThrow('Argument "r" has the wrong type');
  });

  test("number or range of numbers", () => {
    const argList = args`n (number,range<number>) some numeric values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer([1])).toEqual([1]);
    expect(sanitizer([false])).toEqual([0]);
    expect(sanitizer([true])).toEqual([1]);
    expect(sanitizer([undefined])).toEqual([0]);
    expect(sanitizer([""])).toEqual([0]);
    expect(sanitizer(["1"])).toEqual([1]);
    expect(sanitizer(["-1"])).toEqual([-1]);
    expect(sanitizer(["1.1"])).toEqual([1.1]);

    expect(() => sanitizer(["ab"])).toThrow(
      'Argument "n" should be a number, but "ab" is a text, and cannot be coerced to a number.'
    );
    expect(() => sanitizer([])).toThrow(
      "Wrong number of arguments. Expected 1, but got 0 argument(s) instead."
    );
    expect(() => sanitizer([1, 2])).toThrow(
      "Wrong number of arguments. Expected 1, but got 2 argument(s) instead."
    );

    const m1 = [[1, 2]]; // one column with 1 2
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, 3],
      ["abc", 1]
    ];
    const m2_number = [
      [undefined, 3],
      [undefined, 1]
    ];
    expect(sanitizer([m2])).toEqual([m2_number]);
  });

  test("string or range of strings", () => {
    const argList = args`s (string,range<string>) some string values`;
    const sanitizer = makeSanitizer(argList);
    expect(sanitizer.toString()).toMatchSnapshot();

    expect(sanitizer(["abc"])).toEqual(["abc"]);
    expect(sanitizer([1])).toEqual(["1"]);
    expect(sanitizer([false])).toEqual(["FALSE"]);
    expect(sanitizer([true])).toEqual(["TRUE"]);
    expect(sanitizer([undefined])).toEqual([""]);

    const m1 = [["a", "b"]]; // one column with 1 2
    expect(sanitizer([m1])).toEqual([m1]);

    const m2 = [
      [undefined, 3],
      ["abc", 1]
    ];
    const m2_number = [
      [undefined, undefined],
      ["abc", undefined]
    ];
    expect(sanitizer([m2])).toEqual([m2_number]);
  });
});
