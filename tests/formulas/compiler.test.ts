import { Model } from "../../src";
import { functionCache } from "../../src/formulas/compiler";
import { compile, normalize } from "../../src/formulas/index";
import { functionRegistry } from "../../src/functions/index";
import { toZone } from "../../src/helpers";
import {
  ArgType,
  ArgValue,
  CellDependencies,
  CompiledFormula,
  NormalizedFormula,
  Range,
  ReturnFormatType,
} from "../../src/types";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellError } from "../test_helpers/getters_helpers";
import { evaluateCell } from "../test_helpers/helpers";

function compiledBaseFunction(formula: string): CompiledFormula {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  compileFromCompleteFormula(formula);
  return Object.values(functionCache)[0];
}

function compileFromCompleteFormula(formula: string) {
  let formulaString: NormalizedFormula = normalize(formula);
  return compile(formulaString);
}

describe("expression compiler", () => {
  test.each(["=1", "=true", `="abc"`])("some arithmetic expressions", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("simple values that throw error", () => {
    expect(() => compiledBaseFunction(`='abc'`)).toThrowError();
  });

  test.each(["=1 + 3", "=2 * 3", "=2 - 3", "=2 / 3", "=-3", "=(3 + 1) * (-1 + 4)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.toString()).toMatchSnapshot();
    }
  );

  test.each(["=sum(1,2)", '=sum(true, "")', "=sum(1,,2)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.toString()).toMatchSnapshot();
    }
  );

  test("read some values and functions", () => {
    const compiledFormula = compiledBaseFunction("=A1 + sum(A2:C3)");
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("expression with $ref", () => {
    const compiledFormula = compiledBaseFunction("=$A1+$A$2+A$3");
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("expression with references with a sheet", () => {
    const compiledFormula = compiledBaseFunction("=Sheet34!B3");
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("expressions with a debugger", () => {
    const compiledFormula = compiledBaseFunction("=? A1 / 2");
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("cells are converted to ranges if function require a range", () => {
    const compiledFormula = compiledBaseFunction("=sum(A1)");
    expect(compiledFormula.toString()).toMatchSnapshot();
  });

  test("cannot compile some invalid formulas", () => {
    expect(() => compiledBaseFunction("=qsdf")).toThrow();
  });
});

describe("compile dependencies format", () => {
  functionRegistry.add("ANYFUNCTION", {
    description: "any function",
    compute: () => 42,
    args: [{ name: "arg", description: "", type: ["ANY"], optional: true }],
    returns: ["NUMBER"],
  });

  const format = { specificFormat: "dd/mm/yy" };
  functionRegistry.add("RETURNFORMAT", {
    description: "a function with a specific return format",
    compute: () => 42,
    args: [
      { name: "arg1", description: "", type: ["ANY"], optional: true },
      { name: "arg2", description: "", type: ["ANY"], optional: true },
    ],
    returns: ["NUMBER"],
    returnFormat: format,
  });

  functionRegistry.add("RETURNARGSFORMAT", {
    description: "a function that returns a value in the format of the first argument",
    compute: () => 42,
    args: [
      { name: "arg1", description: "", type: ["ANY"], optional: true },
      { name: "arg2", description: "", type: ["ANY"], optional: true },
    ],
    returns: ["NUMBER"],
    returnFormat: ReturnFormatType.FormatFromArgument,
  });

  test.each(["=1", "=true", `="abc"`])("simple expressions don t return formats", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.dependenciesFormat.length).toEqual(0);
  });

  test.each(["=A1", "=A1:B9", "=Sheet34!B3"])(
    "expression with ref return ref dependency",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.dependenciesFormat).toEqual([0]);
    }
  );

  describe("expression with function", () => {
    test.each(["=ANYFUNCTION()", "=ANYFUNCTION(21)", "=ANYFUNCTION(TRUE)", "=ANYFUNCTION(B1)"])(
      "doesn't return formats, whatever args",
      (formula) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.dependenciesFormat.length).toEqual(0);
      }
    );

    test.each(["=RETURNFORMAT()", "=RETURNFORMAT(21)", "=RETURNFORMAT(TRUE)", "=RETURNFORMAT(B1)"])(
      "that has a specific return format return this specific return format, whatever args",
      (formula) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.dependenciesFormat).toEqual([format.specificFormat]);
      }
    );

    test.each([
      ["=RETURNARGSFORMAT()", []],
      ["=RETURNARGSFORMAT(21)", []],
      ["=RETURNARGSFORMAT(TRUE)", []],
      ["=RETURNARGSFORMAT(B1)", [0]],
      ["=RETURNARGSFORMAT(RETURNFORMAT(B1))", [format.specificFormat]],
      ["=RETURNARGSFORMAT(21,B1)", []],
    ])("that has 'ANY' as return format return the format of the first arg", (formula, result) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.dependenciesFormat).toEqual(result);
    });
  });

  test.each([
    ["=+1", []],
    ["=+TRUE", []],
    ["=+B1", [0]],
    ["=+ANYFUNCTION(21)", []],
    ["=+RETURNFORMAT()", [format.specificFormat]],
    ["=+RETURNARGSFORMAT(B1)", [0]],
    ["=-1", []],
    ["=-TRUE", []],
    ["=-B1", [0]],
    ["=-ANYFUNCTION(21)", []],
    ["=-RETURNFORMAT()", [format.specificFormat]],
    ["=-RETURNARGSFORMAT(B1)", [0]],
  ])(
    "expression with unary operator returns dependency format of the right part",
    (formula, result) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.dependenciesFormat).toEqual(result);
    }
  );

  describe("expression with bin operator that has 'ANY' as return format", () => {
    test.each([
      ["=1+B1", [0]],
      ["=B1+B2", [0, 1]],
      ["=B1+B2+B3", [0, 1, 2]],
      ["=B4+RETURNFORMAT()", [0, format.specificFormat]],
      ["=RETURNARGSFORMAT(B1,B2)+B3", [0, 2]],
      ["=ANYFUNCTION(B1)+B2", [1]],
      ["=RETURNARGSFORMAT(21,B1)+B2", [1]],
      ["=RETURNARGSFORMAT(B1+B2,B3)+B4", [0, 1, 3]],
      ["=RETURNARGSFORMAT(RETURNARGSFORMAT(B1,B2),B3)+B4", [0, 3]],
    ])("return dependencies format of the left and right part", (formula, result) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.dependenciesFormat).toEqual(result);
    });

    test.each([
      ["=RETURNFORMAT()+B4", [format.specificFormat]],
      ["=B1+RETURNFORMAT()+B3", [0, format.specificFormat]],
      ["=RETURNARGSFORMAT(RETURNFORMAT(B1,B2),B3)+B4", [format.specificFormat]],
    ])(
      "return dependencies format of the left part if the left par is a string",
      (formula, result) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.dependenciesFormat).toEqual(result);
      }
    );
  });
});

describe("compile functions", () => {
  describe("check number of arguments", () => {
    test("with basic arguments", () => {
      functionRegistry.add("ANYFUNCTION", {
        description: "any function",
        compute: () => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=ANYFUNCTION()")).toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1)")).toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1,2,3)")).toThrow();
    });

    test("with optional argument", () => {
      functionRegistry.add("OPTIONAL", {
        description: "function with optional argument",
        compute: (arg) => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=OPTIONAL(1)")).not.toThrow();
      expect(() => compiledBaseFunction("=OPTIONAL(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=OPTIONAL(1,2,3)")).toThrow();
    });

    test("with default argument", () => {
      functionRegistry.add("USEDEFAULTARG", {
        description: "function with a default argument",
        compute: () => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=USEDEFAULTARG(1)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEDEFAULTARG(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEDEFAULTARG(1,2,3)")).toThrow();
    });

    test("with repeatable argument", () => {
      functionRegistry.add("REPEATABLE", {
        description: "function with repeatable argument",
        compute: (arg) => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true, repeating: true },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=REPEATABLE(1)")).not.toThrow();
      expect(() => compiledBaseFunction("=REPEATABLE(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=REPEATABLE(1,2,3,4,5,6)")).not.toThrow();
    });

    test("with more than one repeatable argument", () => {
      functionRegistry.add("REPEATABLES", {
        description: "any function",
        compute: (arg) => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true, repeating: true },
          { name: "arg3", description: "", type: ["ANY"], optional: true, repeating: true },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=REPEATABLES(1, 2)")).toThrow();
      expect(() => compiledBaseFunction("=REPEATABLES(1, 2, 3)")).not.toThrow();
      expect(() => compiledBaseFunction("=REPEATABLES(1, 2, 3, 4)")).toThrow();
      expect(() => compiledBaseFunction("=REPEATABLES(1, 2, 3, 4, 5)")).not.toThrow();
    });
  });

  describe("interpret values", () => {
    beforeAll(() => {
      functionRegistry.add("ANYFUNCTION", {
        description: "any function",
        compute: (arg1, arg2) => {
          return arg2;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        returns: ["ANY"],
      });

      functionRegistry.add("USEDEFAULTARG", {
        description: "function with a default argument",
        compute: (arg1, arg2 = 42) => {
          return arg2;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
        returns: ["ANY"],
      });
    });

    test("empty value interpreted as undefined", () => {
      expect(evaluateCell("A1", { A1: "=ANYFUNCTION(1,)" })).toBe(undefined);
    });

    test("if default value --> empty value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=USEDEFAULTARG(1,)" })).toBe(42);
    });

    test("if default value --> non-value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=USEDEFAULTARG(1)" })).toBe(42);
    });

    test("empty cell interpreted as null", () => {
      expect(evaluateCell("A1", { A1: "=USEDEFAULTARG(1,A2)" })).toBe(null);
      expect(evaluateCell("A1", { A1: "=ANYFUNCTION(1,A2)" })).toBe(null);
    });
  });

  describe("with lazy arguments", () => {
    // this tests performs controls inside formula functions. For this reason, we
    // don't use mocked functions. Errors would be caught during evaluation of
    // formulas and not during the tests. So here we use a simple counter

    let count = 0;

    beforeAll(() => {
      functionRegistry.add("ANYFUNCTION", {
        description: "any function",
        compute: () => {
          count += 1;
          return true;
        },
        args: [],
        returns: ["ANY"],
      });

      functionRegistry.add("USELAZYARG", {
        description: "function with a lazy argument",
        compute: (arg: () => ArgValue) => {
          count *= 42;
          return arg();
        },
        args: [{ name: "lazyArg", description: "", type: ["ANY"], lazy: true }],
        returns: ["ANY"],
      });

      functionRegistry.add("NOTUSELAZYARG", {
        description: "any function",
        compute: (arg) => {
          count *= 42;
          return arg;
        },
        args: [{ name: "any", description: "", type: ["ANY"] }],
        returns: ["ANY"],
      });
    });

    test("with function as argument --> change the order in which functions are evaluated ", () => {
      count = 0;
      evaluateCell("A1", { A1: "=USELAZYARG(ANYFUNCTION())" });
      expect(count).toBe(1);
      count = 0;
      evaluateCell("A2", { A2: "=NOTUSELAZYARG(ANYFUNCTION())" });
      expect(count).toBe(42);
    });

    test.each([
      "=USELAZYARG(24)",
      "=USELAZYARG(1/0)",
      "=USELAZYARG(1/1/0)",
      "=USELAZYARG(USELAZYARG(24))",
    ])("functions call requesting lazy parameters", (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.toString()).toMatchSnapshot();
    });
  });

  describe("with meta arguments", () => {
    beforeAll(() => {
      functionRegistry.add("USEMETAARG", {
        description: "function with a meta argument",
        compute: (arg) => arg,
        args: [{ name: "arg", description: "", type: ["META"] }],
        returns: ["STRING"],
      });
      functionRegistry.add("NOTUSEMETAARG", {
        description: "any function",
        compute: (arg) => arg,
        args: [{ name: "arg", description: "", type: ["ANY"] }],
        returns: ["ANY"],
      });
    });

    test.each(["=USEMETAARG(A1)", "=USEMETAARG(B2)"])(
      "function call requesting meta parameter",
      (formula) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.toString()).toMatchSnapshot();
      }
    );

    test("throw error if parameter isn't cell/range reference", () => {
      expect(() => compiledBaseFunction("=USEMETAARG(X8)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG($X$8)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG(Sheet42!X8)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG('Sheet 42'!X8)")).not.toThrow();

      expect(() => compiledBaseFunction("=USEMETAARG(D3:Z9)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG($D$3:$Z$9)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG(Sheet42!$D$3:$Z$9)")).not.toThrow();
      expect(() => compiledBaseFunction("=USEMETAARG('Sheet 42'!D3:Z9)")).not.toThrow();

      expect(() => compiledBaseFunction('=USEMETAARG("kikou")')).toThrowError();
      expect(() => compiledBaseFunction('=USEMETAARG("")')).toThrowError();
      expect(() => compiledBaseFunction("=USEMETAARG(TRUE)")).toThrowError();
      expect(() => compiledBaseFunction("=USEMETAARG(SUM(1,2,3))")).toThrowError();
    });

    test("do not care about the value of the cell / range passed as a reference", () => {
      const compiledFormula1 = compileFromCompleteFormula("=USEMETAARG(A1)");
      const compiledFormula2 = compileFromCompleteFormula("=USEMETAARG(A1:B2)");
      const compiledFormula3 = compileFromCompleteFormula("=NOTUSEMETAARG(A1)");
      const compiledFormula4 = compileFromCompleteFormula("=NOTUSEMETAARG(A1:B2)");

      let refFn = jest.fn();
      let ensureRange = jest.fn();

      const ranges2CellDependencies = (ranges: Range[]): CellDependencies => ({
        strings: [],
        numbers: [],
        references: ranges,
      });
      const ctx = { USEMETAARG: () => {}, NOTUSEMETAARG: () => {} };

      const rangeA1 = [{ zone: toZone("A1"), sheetId: "ABC" }] as Range[];
      const rangeA1ToB2 = [{ zone: toZone("A1:B2"), sheetId: "ABC" }] as Range[];

      compiledFormula1(ranges2CellDependencies(rangeA1), "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1, "ABC", true, "USEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula2(ranges2CellDependencies(rangeA1ToB2), "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1ToB2, "ABC", true, "USEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula3(ranges2CellDependencies(rangeA1), "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1, "ABC", false, "NOTUSEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula4(ranges2CellDependencies(rangeA1ToB2), "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1ToB2, "ABC", false, "NOTUSEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();
    });
  });
});

describe("compile functions", () => {
  describe("check number of arguments", () => {
    test("with basic arguments", () => {
      functionRegistry.add("ANYFUNCTION", {
        description: "any function",
        compute: () => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=ANYFUNCTION()")).toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1)")).toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=ANYFUNCTION(1,2,3)")).toThrow();
    });

    test("with optional argument", () => {
      functionRegistry.add("OPTIONAL", {
        description: "function with optional argument",
        compute: (arg) => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=OPTIONAL(1)")).not.toThrow();
      expect(() => compiledBaseFunction("=OPTIONAL(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=OPTIONAL(1,2,3)")).toThrow();
    });

    test("with repeatable argument", () => {
      functionRegistry.add("REPEATABLE", {
        description: "function with repeatable argument",
        compute: (arg) => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true, repeating: true },
        ],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=REPEATABLE(1)")).not.toThrow();
      expect(() => compiledBaseFunction("=REPEATABLE(1,2)")).not.toThrow();
      expect(() => compiledBaseFunction("=REPEATABLE(1,2,3,4,5,6)")).not.toThrow();
    });
  });

  describe("check type of arguments", () => {
    test("reject non-range argument when expecting only range argument", () => {
      functionRegistry.add("RANGEEXPECTED", {
        description: "function expect number in 1st arg",
        compute: (arg) => {
          return true;
        },
        args: [{ name: "arg1", description: "", type: ["RANGE"] }],
        returns: ["ANY"],
      });
      expect(() => compiledBaseFunction("=RANGEEXPECTED(42)")).toThrowError(
        "Function RANGEEXPECTED expects the parameter 1 to be reference to a cell or range, not a number."
      );
      expect(() => compiledBaseFunction('=RANGEEXPECTED("test")')).toThrowError(
        "Function RANGEEXPECTED expects the parameter 1 to be reference to a cell or range, not a string."
      );
      expect(() => compiledBaseFunction("=RANGEEXPECTED(TRUE)")).toThrowError(
        "Function RANGEEXPECTED expects the parameter 1 to be reference to a cell or range, not a boolean."
      );

      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A1)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A2)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A$2)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(sheet2!A1:A$2)")).not.toThrow();
    });

    test("reject range when expecting only non-range argument", () => {
      for (let typeExpected of ["ANY", "BOOLEAN", "DATE", "NUMBER", "STRING"] as ArgType[]) {
        functionRegistry.add(typeExpected + "EXPECTED", {
          description: "function expect number in 1st arg",
          compute: (arg) => {
            return true;
          },
          args: [{ name: "arg1", description: "", type: [typeExpected] }],
          returns: ["ANY"],
        });
      }

      const m = new Model();

      setCellContent(m, "B1", "=?ANYEXPECTED(A1:A2)");
      setCellContent(m, "B2", "=BOOLEANEXPECTED(A1:A2)");
      setCellContent(m, "B3", "=DATEEXPECTED(A1:A2)");
      setCellContent(m, "B4", "=NUMBEREXPECTED(A1:A2)");
      setCellContent(m, "B5", "=STRINGEXPECTED(A1:A2)");
      setCellContent(m, "B6", "=ANYEXPECTED(A1:A$2)");
      setCellContent(m, "B7", "=ANYEXPECTED(sheet2!A1:A$2)");
      setCellContent(m, "B8", "=A2:A3");
      setCellContent(m, "B9", "=+A2:A3");
      setCellContent(m, "B10", "=A1+A2:A3");
      setCellContent(m, "B11", "=-A2:A3");
      setCellContent(m, "B12", "=A1-A2:A3");
      setCellContent(m, "B13", "=A1+A4*A5:A6-A2");
      setCellContent(m, "B14", "=ANYEXPECTED(A1:A1)");

      expect(getCellError(m, "B1")).toBe(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B2")).toBe(
        "Function BOOLEANEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B3")).toBe(
        "Function DATEEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B4")).toBe(
        "Function NUMBEREXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B5")).toBe(
        "Function STRINGEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B6")).toBe(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B7")).toBe(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(getCellError(m, "B8")).toBe(
        "Function EQ expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B9")).toBe(
        "Function UPLUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B10")).toBe(
        "Function ADD expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B11")).toBe(
        "Function UMINUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B12")).toBe(
        "Function MINUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B13")).toBe(
        "Function MULTIPLY expects its parameters to be single values or single cell references, not ranges."
      );
      expect(getCellError(m, "B14")).toBeUndefined();
    });
  });
});
