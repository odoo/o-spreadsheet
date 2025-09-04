import {
  addMetaInfoFromArg,
  arg,
  argTargeting,
  validateArguments,
} from "../../src/functions/arguments";
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
  const aRandomFunction: Omit<AddFunctionDescription, "args"> = {
    description: "a random function",
    compute: () => 0,
  };

  function validateArgsDefinition(definitions: string[]) {
    const args = definitions.map((def) => arg(def));
    const descr = addMetaInfoFromArg("functionName", { ...aRandomFunction, args });
    return validateArguments(descr);
  }

  test("'META' type can only be declared alone", () => {
    expect(() => validateArgsDefinition(["metaArg (meta)"])).not.toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, optional)"])).not.toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, repeating)"])).not.toThrow();

    expect(() => validateArgsDefinition(["metaArg (meta, any)"])).toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, range)"])).toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, number)"])).toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, string)"])).toThrow();
    expect(() => validateArgsDefinition(["metaArg (meta, boolean)"])).toThrow();
  });

  test("All repeatable arguments must be declared consecutively", () => {
    expect(() => validateArgsDefinition(["arg1 (any)", "arg2 (any, repeating)"])).not.toThrow();
    expect(() =>
      validateArgsDefinition(["arg1 (any)", "arg2 (any, repeating)", "arg3 (any, repeating)"])
    ).not.toThrow();
    expect(() =>
      validateArgsDefinition(["arg1 (any)", "arg2 (any, repeating)", "arg3 (any)"])
    ).not.toThrow();
    expect(() =>
      validateArgsDefinition([
        "arg1 (any)",
        "arg2 (any, repeating)",
        "arg3 (any, optional)",
        "arg4 (any, repeating)",
      ])
    ).toThrow();
    expect(() =>
      validateArgsDefinition(["arg1 (any, repeating)", "arg2 (any)", "arg3 (any, repeating)"])
    ).toThrow();
  });

  test("If repeatable arguments --> The number of repeatable arguments must be greater than the number of optional arguments", () => {
    expect(() => validateArgsDefinition(["arg1 (any)", "arg2 (any, optional)"])).not.toThrow();
    expect(() =>
      validateArgsDefinition(["arg1 (any)", "arg2 (any, optional)", "arg3 (any, repeating)"])
    ).toThrow();
    expect(() =>
      validateArgsDefinition([
        "arg1 (any)",
        "arg2 (any, optional)",
        "arg3 (any, repeating)",
        "arg4 (any, repeating)",
      ])
    ).not.toThrow();
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

    const descr = addMetaInfoFromArg("basicFunction", basicFunction);
    expect(descr.minArgRequired).toBe(2);
    expect(descr.maxArgPossible).toBe(2);
    expect(descr.nbrArgRepeating).toBe(0);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(0);

    const getArgToFocus = argTargeting(descr, 2);
    expect(getArgToFocus(0)).toBe(0);
    expect(getArgToFocus(1)).toBe(1);
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

    const descr = addMetaInfoFromArg("useOptional", useOptional);
    expect(descr.minArgRequired).toBe(1);
    expect(descr.maxArgPossible).toBe(2);
    expect(descr.nbrArgRepeating).toBe(0);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(1);

    const getArgToFocusOnOneArg = argTargeting(descr, 1);
    expect(getArgToFocusOnOneArg(0)).toBe(0);

    const getArgToFocusOnTwoArgs = argTargeting(descr, 2);
    expect(getArgToFocusOnTwoArgs(0)).toBe(0);
    expect(getArgToFocusOnTwoArgs(1)).toBe(1);
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

    const descr = addMetaInfoFromArg("useRepeatable", useRepeatable);
    expect(descr.minArgRequired).toBe(2);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(1);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(0);

    const getArgToFocusOnOneArg = argTargeting(descr, 1);
    expect(getArgToFocusOnOneArg(0)).toBe(0);

    const getArgToFocusOnSeveralArgs = argTargeting(descr, 42);
    expect(getArgToFocusOnSeveralArgs(0)).toBe(0);
    expect(getArgToFocusOnSeveralArgs(1)).toBe(1);
    expect(getArgToFocusOnSeveralArgs(20)).toBe(1);
    expect(getArgToFocusOnSeveralArgs(41)).toBe(1);
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

    const descr = addMetaInfoFromArg("useRepeatables1", useRepeatables);
    expect(descr.minArgRequired).toBe(3);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(2);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(0);

    const getArgToFocus = argTargeting(descr, 42);
    expect(getArgToFocus(0)).toBe(0);
    expect(getArgToFocus(1)).toBe(1);
    expect(getArgToFocus(2)).toBe(2);
    expect(getArgToFocus(4)).toBe(2);
    expect(getArgToFocus(7)).toBe(1);
  });

  test("with optional arg after repeatable argument", () => {
    // like the SWITCH function
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], repeating: true },
        { name: "arg3", description: "", type: ["ANY"], repeating: true },
        { name: "arg4", description: "", type: ["ANY"], optional: true },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg("useRepeatables2", useRepeatables);
    expect(descr.minArgRequired).toBe(3);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(2);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(1);

    const getArgToFocus_1 = argTargeting(descr, 1);
    expect(getArgToFocus_1(0)).toBe(0);

    const getArgToFocus_3 = argTargeting(descr, 3);
    expect(getArgToFocus_3(0)).toBe(0);
    expect(getArgToFocus_3(1)).toBe(1);
    expect(getArgToFocus_3(2)).toBe(2);

    const getArgToFocus_4 = argTargeting(descr, 4);
    expect(getArgToFocus_4(0)).toBe(0);
    expect(getArgToFocus_4(1)).toBe(1);
    expect(getArgToFocus_4(2)).toBe(2);
    expect(getArgToFocus_4(3)).toBe(3);

    const getArgToFocus_5 = argTargeting(descr, 5);
    expect(getArgToFocus_5(0)).toBe(0);
    expect(getArgToFocus_5(1)).toBe(1);
    expect(getArgToFocus_5(2)).toBe(2);
    expect(getArgToFocus_5(3)).toBe(1);
    expect(getArgToFocus_5(4)).toBe(2);
  });

  test("with 2 optionals arg after 3 repeatable arguments", () => {
    // like the SWITCH function
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], repeating: true },
        { name: "arg3", description: "", type: ["ANY"], repeating: true },
        { name: "arg4", description: "", type: ["ANY"], repeating: true },
        { name: "arg5", description: "", type: ["ANY"], optional: true },
        { name: "arg6", description: "", type: ["ANY"], optional: true },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg("useRepeatables3", useRepeatables);
    expect(descr.minArgRequired).toBe(4);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(3);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(2);

    const getArgToFocus_1 = argTargeting(descr, 1);
    expect(getArgToFocus_1(0)).toBe(0);

    const getArgToFocus_5 = argTargeting(descr, 5);
    expect(getArgToFocus_5(0)).toBe(0);
    expect(getArgToFocus_5(1)).toBe(1);
    expect(getArgToFocus_5(2)).toBe(2);
    expect(getArgToFocus_5(3)).toBe(3);
    expect(getArgToFocus_5(4)).toBe(4);

    const getArgToFocus_8 = argTargeting(descr, 8);
    expect(getArgToFocus_8(0)).toBe(0);
    expect(getArgToFocus_8(1)).toBe(1);
    expect(getArgToFocus_8(2)).toBe(2);
    expect(getArgToFocus_8(3)).toBe(3);
    expect(getArgToFocus_8(4)).toBe(1);
    expect(getArgToFocus_8(5)).toBe(2);
    expect(getArgToFocus_8(6)).toBe(3);
    expect(getArgToFocus_8(7)).toBe(4);
  });

  test("with required arg after repeatable argument", () => {
    // like the SWITCH function
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], repeating: true },
        { name: "arg3", description: "", type: ["ANY"], repeating: true },
        { name: "arg4", description: "", type: ["ANY"] },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg("useRepeatables4", useRepeatables);
    expect(descr.minArgRequired).toBe(4);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(2);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(0);

    const getArgToFocus_2 = argTargeting(descr, 2);
    expect(getArgToFocus_2(0)).toBe(0);
    expect(getArgToFocus_2(1)).toBe(3);

    const getArgToFocus_4 = argTargeting(descr, 4);
    expect(getArgToFocus_4(0)).toBe(0);
    expect(getArgToFocus_4(1)).toBe(1);
    expect(getArgToFocus_4(2)).toBe(2);
    expect(getArgToFocus_4(3)).toBe(3);

    const getArgToFocus_6 = argTargeting(descr, 6);
    expect(getArgToFocus_6(0)).toBe(0);
    expect(getArgToFocus_6(1)).toBe(1);
    expect(getArgToFocus_6(2)).toBe(2);
    expect(getArgToFocus_6(3)).toBe(1);
    expect(getArgToFocus_6(4)).toBe(2);
    expect(getArgToFocus_6(5)).toBe(3);
  });

  test("with required arg after optional argument", () => {
    // like the SWITCH function
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"], optional: true },
        { name: "arg3", description: "", type: ["ANY"], optional: true },
        { name: "arg4", description: "", type: ["ANY"] },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg("useRepeatables5", useRepeatables);
    expect(descr.minArgRequired).toBe(2);
    expect(descr.maxArgPossible).toBe(4);
    expect(descr.nbrArgRepeating).toBe(0);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(2);

    const getArgToFocus_2 = argTargeting(descr, 2);
    expect(getArgToFocus_2(0)).toBe(0);
    expect(getArgToFocus_2(1)).toBe(3);

    const getArgToFocus_3 = argTargeting(descr, 3);
    expect(getArgToFocus_3(0)).toBe(0);
    expect(getArgToFocus_3(1)).toBe(1);
    expect(getArgToFocus_3(2)).toBe(3);

    const getArgToFocus_4 = argTargeting(descr, 4);
    expect(getArgToFocus_4(0)).toBe(0);
    expect(getArgToFocus_4(1)).toBe(1);
    expect(getArgToFocus_4(2)).toBe(2);
    expect(getArgToFocus_4(3)).toBe(3);
  });

  test("a random case", () => {
    // like the SWITCH function
    const useRepeatables = {
      description: "function with many repeatable argument",
      compute: (arg) => {
        return true;
      },
      args: [
        { name: "arg1", description: "", type: ["ANY"], optional: true },
        { name: "arg2", description: "", type: ["ANY"] },
        { name: "arg3", description: "", type: ["ANY"], optional: true },
        { name: "arg4", description: "", type: ["ANY"] },
        { name: "arg5", description: "", type: ["ANY"], repeating: true },
        { name: "arg6", description: "", type: ["ANY"], repeating: true },
        { name: "arg7", description: "", type: ["ANY"], repeating: true },
        { name: "arg8", description: "", type: ["ANY"], repeating: true },
        { name: "arg9", description: "", type: ["ANY"], optional: true },
        { name: "arg10", description: "", type: ["ANY"] },
      ],
    } as AddFunctionDescription;

    const descr = addMetaInfoFromArg("useRepeatables6", useRepeatables);
    expect(descr.minArgRequired).toBe(7);
    expect(descr.maxArgPossible).toBe(Infinity);
    expect(descr.nbrArgRepeating).toBe(4);
    expect(descr.nbrOptionalNonRepeatingArgs).toBe(3);

    const getArgToFocus_3 = argTargeting(descr, 3);
    expect(getArgToFocus_3(0)).toBe(1);
    expect(getArgToFocus_3(1)).toBe(3);
    expect(getArgToFocus_3(2)).toBe(9);

    const getArgToFocus_4 = argTargeting(descr, 4);
    expect(getArgToFocus_4(0)).toBe(0);
    expect(getArgToFocus_4(1)).toBe(1);
    expect(getArgToFocus_4(2)).toBe(3);
    expect(getArgToFocus_4(3)).toBe(9);

    const getArgToFocus_5 = argTargeting(descr, 5);
    expect(getArgToFocus_5(0)).toBe(0);
    expect(getArgToFocus_5(1)).toBe(1);
    expect(getArgToFocus_5(2)).toBe(2);
    expect(getArgToFocus_5(3)).toBe(3);
    expect(getArgToFocus_5(4)).toBe(9);

    const getArgToFocus_6 = argTargeting(descr, 6);
    expect(getArgToFocus_6(0)).toBe(0);
    expect(getArgToFocus_6(1)).toBe(1);
    expect(getArgToFocus_6(2)).toBe(2);
    expect(getArgToFocus_6(3)).toBe(3);
    expect(getArgToFocus_6(4)).toBe(8);
    expect(getArgToFocus_6(5)).toBe(9);

    const getArgToFocus_7 = argTargeting(descr, 7);
    expect(getArgToFocus_7(0)).toBe(1);
    expect(getArgToFocus_7(1)).toBe(3);
    expect(getArgToFocus_7(2)).toBe(4);
    expect(getArgToFocus_7(3)).toBe(5);
    expect(getArgToFocus_7(4)).toBe(6);
    expect(getArgToFocus_7(5)).toBe(7);
    expect(getArgToFocus_7(6)).toBe(9);
  });
});
