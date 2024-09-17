import { addMetaInfoFromArg, arg, validateArguments } from "../../src/functions/arguments";
import { AddFunctionDescription } from "../../src/types";

describe("args", () => {
  test("various", () => {
    expect(arg("test (number)", "some number")).toEqual({
      type: ["NUMBER"],
      description: "some number",
      name: "test",
    });

    expect([
      arg("test (number)", "some number"),
      arg("test2 (number)", "some other number"),
    ]).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test",
      },
      {
        type: ["NUMBER"],
        description: "some other number",
        name: "test2",
      },
    ]);
  });

  test("empty description", () => {
    expect(arg("test (number)")).toEqual({
      type: ["NUMBER"],
      name: "test",
      description: "",
    });
  });

  test("default number value", () => {
    expect(arg("test (number,default=10)", "descr")).toEqual({
      type: ["NUMBER"],
      name: "test",
      description: "descr",
      default: true,
      defaultValue: "10",
    });
  });

  test("default string value", () => {
    expect(arg(`test (number,default="asdf")`, "descr")).toEqual({
      type: ["NUMBER"],
      name: "test",
      description: "descr",
      default: true,
      defaultValue: '"asdf"',
    });
  });

  test("with parenthesis in the description", () => {
    expect(arg("test (number)", "descr( hahaha )")).toEqual({
      type: ["NUMBER"],
      name: "test",
      description: "descr( hahaha )",
    });
  });

  test("does not care if lower or uppercase", () => {
    expect(arg("test (NUMBER)")).toEqual({
      type: ["NUMBER"],
      name: "test",
      description: "",
    });
  });

  test("accept all basic types", () => {
    expect(arg("test (boolean)").type).toEqual(["BOOLEAN"]);
    expect(arg("test (any)").type).toEqual(["ANY"]);
    expect(arg("test (NumBer)").type).toEqual(["NUMBER"]);
    expect(arg("test (string)").type).toEqual(["STRING"]);
  });

  test("accept all range types", () => {
    expect(arg("test (range)").type).toEqual(["RANGE"]);
    expect(arg("test (range<any>)").type).toEqual(["RANGE"]);
    expect(arg("test (range<boolean>)").type).toEqual(["RANGE<BOOLEAN>"]);
    expect(arg("test (range<number>)").type).toEqual(["RANGE<NUMBER>"]);
    expect(arg("test (range<string>)").type).toEqual(["RANGE<STRING>"]);
  });

  test("accept multiple types", () => {
    expect(arg("test (boolean,string)").type).toEqual(["BOOLEAN", "STRING"]);
    expect(arg("test (string,any)").type).toEqual(["STRING", "ANY"]);
  });

  test("accept optional flag", () => {
    expect(arg("test (boolean, optional)")).toEqual({
      description: "",
      name: "test",
      type: ["BOOLEAN"],
      optional: true,
    });
    expect(arg("test (boolean ,optional, string)")).toEqual({
      description: "",
      name: "test",
      type: ["BOOLEAN", "STRING"],
      optional: true,
    });
  });
  test("accept repeating flag", () => {
    expect(arg("test (boolean, repeating)")).toEqual({
      description: "",
      name: "test",
      type: ["BOOLEAN"],
      repeating: true,
    });
    expect(arg("test (boolean, repeating, number)")).toEqual({
      description: "",
      name: "test",
      type: ["BOOLEAN", "NUMBER"],
      repeating: true,
    });
  });
});

describe("arguments validation", () => {
  test("'META' type can only be declared alone", () => {
    expect(() => validateArguments([arg("metaArg (meta)")])).not.toThrow();
    expect(() => validateArguments([arg("metaArg (meta, optional)")])).not.toThrow();
    expect(() => validateArguments([arg("metaArg (meta, repeating)")])).not.toThrow();

    expect(() => validateArguments([arg("metaArg (meta, any)")])).toThrow();
    expect(() => validateArguments([arg("metaArg (meta, range)")])).toThrow();
    expect(() => validateArguments([arg("metaArg (meta, number)")])).toThrow();
    expect(() => validateArguments([arg("metaArg (meta, string)")])).toThrow();
    expect(() => validateArguments([arg("metaArg (meta, boolean)")])).toThrow();
  });

  test("All repeatable arguments must be declared last", () => {
    expect(() =>
      validateArguments([arg("arg1 (any)"), arg("arg2 (any, repeating)")])
    ).not.toThrow();
    expect(() =>
      validateArguments([
        arg("arg1 (any)"),
        arg("arg2 (any, repeating)"),
        arg("arg3 (any, repeating)"),
      ])
    ).not.toThrow();
    expect(() =>
      validateArguments([arg("arg1 (any)"), arg("arg2 (any, repeating)"), arg("arg3 (any)")])
    ).toThrow();
    expect(() =>
      validateArguments([
        arg("arg1 (any)"),
        arg("arg2 (any, repeating)"),
        arg("arg3 (any, optional)"),
      ])
    ).toThrow();
  });

  test("All optional arguments must be after all mandatory arguments", () => {
    expect(() =>
      validateArguments([
        arg("arg1 (any)"),
        arg("arg2 (any, optional)"),
        arg("arg3 (any, optional)"),
      ])
    ).not.toThrow();
    expect(() =>
      validateArguments([
        arg("arg1 (any)"),
        arg("arg2 (any, optional)"),
        arg("arg3 (any, repeating)"),
      ])
    ).not.toThrow();
    expect(() =>
      validateArguments([arg("arg1 (any)"), arg("arg2 (any, optional)"), arg("arg3 (any)")])
    ).toThrow();
  });
});

describe("function addMetaInfoFromArg", () => {
  test("with basic arguments", () => {
    const basicFunction = {
      description: "basic function",
      compute: () => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"] },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg(basicFunction);
    expect(descr.minArgRequired).toBe(2);
    expect(descr.maxArgPossible).toBe(2);
    expect(descr.nbrArgRepeating).toBe(0);

    const getArgToFocus = descr.getArgToFocus!;
    expect(getArgToFocus(-1)).toBe(-1);
    expect(getArgToFocus(1)).toBe(1);
    expect(getArgToFocus(2)).toBe(2);
    expect(getArgToFocus(42)).toBe(42);
  });

  test("with optional arguments", () => {
    const useOptional = {
      description: "function with optional argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], optional: true },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg(useOptional);
    expect(descr.minArgRequired).toBe(1);
    expect(descr.maxArgPossible).toBe(2);
    expect(descr.nbrArgRepeating).toBe(0);

    const getArgToFocus = descr.getArgToFocus!;
    expect(getArgToFocus(-1)).toBe(-1);
    expect(getArgToFocus(1)).toBe(1);
    expect(getArgToFocus(2)).toBe(2);
    expect(getArgToFocus(42)).toBe(42);
  });

  test("with repeatable argument", () => {
    const useRepeatable = {
      description: "function with repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], repeating: true },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg(useRepeatable);
    expect(descr.minArgRequired).toBe(1);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(1);

    const getArgToFocus = descr.getArgToFocus!;
    expect(getArgToFocus(-1)).toBe(-1);
    expect(getArgToFocus(1)).toBe(1);
    expect(getArgToFocus(2)).toBe(2);
    expect(getArgToFocus(42)).toBe(2);
  });

  test("with more than one repeatable argument", () => {
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], repeating: true },
        { name: "arg3", description: "", type: ["ANY"], repeating: true },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg(useRepeatables);
    expect(descr.minArgRequired).toBe(1);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(2);

    const getArgToFocus = descr.getArgToFocus!;
    expect(getArgToFocus(-1)).toBe(-1);
    expect(getArgToFocus(1)).toBe(1);
    expect(getArgToFocus(2)).toBe(2);
    expect(getArgToFocus(3)).toBe(3);
    expect(getArgToFocus(5)).toBe(3);
    expect(getArgToFocus(8)).toBe(2);
  });
});
