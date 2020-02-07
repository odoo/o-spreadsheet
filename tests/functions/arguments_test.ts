import { args, sanitizeArguments } from "../../src/functions/arguments";

function sanitizeArg(argList, value) {
  let result;
  function fn(arg) {
    result = arg;
  }
  sanitizeArguments(fn, argList)(value);
  return result;
}

function sanitizeArgs(argList, values) {
  let result;
  function fn(...args) {
    result = args;
  }
  sanitizeArguments(fn, argList)(...values);
  return result;
}

describe("sanitizeArgs", () => {
  test("function with no args is not modified", () => {
    function fn() {}
    expect(sanitizeArguments(fn, [])).toBe(fn);
  });

  test("a single number argument", () => {
    const argList = args`n (number) some number`;

    expect(sanitizeArg(argList, 1)).toBe(1);
    expect(sanitizeArg(argList, false)).toBe(0);
    expect(sanitizeArg(argList, true)).toBe(1);
    expect(sanitizeArg(argList, undefined)).toBe(0);
    expect(sanitizeArg(argList, "")).toBe(0);
    expect(sanitizeArg(argList, "1")).toBe(1);
    expect(sanitizeArg(argList, "-1")).toBe(-1);
    expect(sanitizeArg(argList, "1.1")).toBe(1.1);
    expect(() => sanitizeArg(argList, "ab")).toThrow(
      'Argument "n" should be a number, but "ab" is a text, and cannot be coerced to a number.'
    );
  });

  test("an optional number argument", () => {
    const argList = args`n (number,optional) some number`;

    expect(sanitizeArgs(argList, [1])).toEqual([1]);
    expect(sanitizeArgs(argList, [false])).toEqual([0]);
    expect(sanitizeArgs(argList, [true])).toEqual([1]);
    expect(sanitizeArgs(argList, [undefined])).toEqual([]);
  });

  test("an optional number argument after another argument", () => {
    const argList = args`
      m (number) a number
      n (number,optional) another number`;

    expect(sanitizeArgs(argList, [1])).toEqual([1]);
    expect(sanitizeArgs(argList, [1, false])).toEqual([1, 0]);
    expect(sanitizeArgs(argList, [1, undefined])).toEqual([1]);
  });
});

describe("args", () => {
  test("various", () => {
    expect(args``).toEqual([]);
    expect(args`test (number) some number`).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      }
    ]);

    expect(args`
       test (number) some number
       test2 (number) some other number
      `).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      },
      {
        type: ["NUMBER"],
        description: "some other number",
        name: "test2"
      }
    ]);
  });

  test("empty description", () => {
    expect(args`test (number)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("does not care if lower or uppercase", () => {
    expect(args`test (NUMBER)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("accept all types", () => {
    expect(args`test (boolean)`[0].type).toEqual(["BOOLEAN"]);
    expect(args`test (any)`[0].type).toEqual(["ANY"]);
    expect(args`test (range)`[0].type).toEqual(["RANGE"]);
    expect(args`test (NumBer)`[0].type).toEqual(["NUMBER"]);
    expect(args`test (string)`[0].type).toEqual(["STRING"]);
  });

  test("accept multiple types", () => {
    expect(args`test (boolean,string)`[0].type).toEqual(["BOOLEAN", "STRING"]);
    expect(args`test (string,any)`[0].type).toEqual(["STRING", "ANY"]);
  });

  test("accept optional flag", () => {
    expect(args`test (boolean,optional)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        optional: true
      }
    ]);
    expect(args`test (boolean,optional,string)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "STRING"],
        optional: true
      }
    ]);
  });
  test("accept repeating flag", () => {
    expect(args`test (boolean,repeating)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        repeating: true
      }
    ]);
    expect(args`test (boolean,repeating,number)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "NUMBER"],
        repeating: true
      }
    ]);
  });
});
