import { args, validateArguments, addMetaInfoFromArg } from "../../src/functions/arguments";
import { AddFunctionDescription } from "../../src/types";

describe("args", () => {
  test("various", () => {
    expect(args(``)).toEqual([]);
    expect(args(`test (number) some number`)).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test",
      },
    ]);

    expect(
      args(`
       test (number) some number
       test2 (number) some other number
      `)
    ).toEqual([
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
    expect(args(`test (number)`)).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: "",
      },
    ]);
  });

  test("default number value", () => {
    expect(args(`test (number,default=10) descr`)).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: "descr",
        default: true,
        defaultValue: 10,
      },
    ]);
  });

  test("default string value", () => {
    expect(args(`test (number,default="asdf") descr`)).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: "descr",
        default: true,
        defaultValue: "asdf",
      },
    ]);
  });

  test("with parenthesis in the description", () => {
    expect(args(`test (number) descr( hahaha )`)).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: "descr( hahaha )",
      },
    ]);
  });

  test("does not care if lower or uppercase", () => {
    expect(args(`test (NUMBER)`)).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: "",
      },
    ]);
  });

  test("accept all basic types", () => {
    expect(args(`test (boolean)`)[0].type).toEqual(["BOOLEAN"]);
    expect(args(`test (any)`)[0].type).toEqual(["ANY"]);
    expect(args(`test (NumBer)`)[0].type).toEqual(["NUMBER"]);
    expect(args(`test (string)`)[0].type).toEqual(["STRING"]);
  });

  test("accept all range types", () => {
    expect(args(`test (range)`)[0].type).toEqual(["RANGE"]);
    expect(args(`test (range<any>)`)[0].type).toEqual(["RANGE"]);
    expect(args(`test (range<boolean>)`)[0].type).toEqual(["RANGE<BOOLEAN>"]);
    expect(args(`test (range<number>)`)[0].type).toEqual(["RANGE<NUMBER>"]);
    expect(args(`test (range<string>)`)[0].type).toEqual(["RANGE<STRING>"]);
  });

  test("accept multiple types", () => {
    expect(args(`test (boolean,string)`)[0].type).toEqual(["BOOLEAN", "STRING"]);
    expect(args(`test (string,any)`)[0].type).toEqual(["STRING", "ANY"]);
  });

  test("accept optional flag", () => {
    expect(args(`test (boolean, optional)`)).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        optional: true,
      },
    ]);
    expect(args(`test (boolean ,optional, string)`)).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "STRING"],
        optional: true,
      },
    ]);
  });
  test("accept repeating flag", () => {
    expect(args(`test (boolean, repeating)`)).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        repeating: true,
      },
    ]);
    expect(args(`test (boolean, repeating, number)`)).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "NUMBER"],
        repeating: true,
      },
    ]);
  });
});

describe("arguments validation", () => {
  test("'META' type can only be declared alone", () => {
    expect(() => validateArguments(args(`metaArg (meta)`))).not.toThrow();
    expect(() => validateArguments(args(`metaArg (meta, optional)`))).not.toThrow();
    expect(() => validateArguments(args(`metaArg (meta, repeating)`))).not.toThrow();

    expect(() => validateArguments(args(`metaArg (meta, any)`))).toThrow();
    expect(() => validateArguments(args(`metaArg (meta, range)`))).toThrow();
    expect(() => validateArguments(args(`metaArg (meta, number)`))).toThrow();
    expect(() => validateArguments(args(`metaArg (meta, string)`))).toThrow();
    expect(() => validateArguments(args(`metaArg (meta, boolean)`))).toThrow();
  });

  test("All repeatable arguments must be declared last", () => {
    expect(() =>
      validateArguments(
        args(`
          arg1 (any)
          arg2 (any, repeating)
        `)
      )
    ).not.toThrow();
    expect(() =>
      validateArguments(
        args(`
          arg1 (any)
          arg2 (any, repeating)
          arg3 (any, repeating)
        `)
      )
    ).not.toThrow();
    expect(() =>
      validateArguments(
        args(`
          arg1 (any)
          arg2 (any, repeating)
          arg3 (any)
        `)
      )
    ).toThrow();
    expect(() =>
      validateArguments(
        args(`
          arg1 (any)
          arg2 (any, repeating)
          arg3 (any, optional)
        `)
      )
    ).toThrow();
  });

  test("All optional arguments must be after all mandatory arguments", () => {
    expect(() =>
      validateArguments(
        args(`
      arg1 (any)
      arg2 (any, optional)
      arg3 (any, optional)
    `)
      )
    ).not.toThrow();
    expect(() =>
      validateArguments(
        args(`
    arg1 (any)
    arg2 (any, optional)
    arg3 (any, repeating)
  `)
      )
    ).not.toThrow();
    expect(() =>
      validateArguments(
        args(`
      arg1 (any)
      arg2 (any, optional)
      arg3 (any)
    `)
      )
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
      returns: ["ANY"],
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
      returns: ["ANY"],
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
      returns: ["ANY"],
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
      returns: ["ANY"],
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
