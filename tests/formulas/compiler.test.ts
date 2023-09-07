import { Model } from "../../src";
import { functionCache } from "../../src/formulas/compiler";
import { compile } from "../../src/formulas/index";
import { functionRegistry } from "../../src/functions";
import { createRange } from "../../src/helpers";
import { ArgType, CompiledFormula } from "../../src/types";
import { evaluateCell, evaluateCellFormat, restoreDefaultFunctions } from "../test_helpers/helpers";

function compiledBaseFunction(formula: string): CompiledFormula {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  return compileFromCompleteFormula(formula);
}

function compileFromCompleteFormula(formula: string) {
  return compile(formula);
}

describe("expression compiler", () => {
  test.each(["=1", "=true", `="abc"`])("some arithmetic expressions", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("simple values that throw error", () => {
    expect(() => compiledBaseFunction(`='abc'`)).toThrowError();
  });

  test.each(["=1 + 3", "=2 * 3", "=2 - 3", "=2 / 3", "=-3", "=(3 + 1) * (-1 + 4)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.execute.toString()).toMatchSnapshot();
    }
  );

  test.each(["=sum(1,2)", '=sum(true, "")', "=sum(1,,2)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.execute.toString()).toMatchSnapshot();
    }
  );

  test.each(["=1%", "=(2+5)%", "=A1%"])("some arithmetic expressions", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("read some values and functions", () => {
    const compiledFormula = compiledBaseFunction("=A1 + sum(A2:C3)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("with the same reference multiple times", () => {
    const compiledFormula = compiledBaseFunction("=SUM(A1, A1, A2)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with $ref", () => {
    const compiledFormula = compiledBaseFunction("=$A1+$A$2+A$3");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with references with a sheet", () => {
    const compiledFormula = compiledBaseFunction("=Sheet34!B3");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expressions with a debugger", () => {
    const compiledFormula = compiledBaseFunction("=? A1 / 2");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("cells are converted to ranges if function require a range", () => {
    const compiledFormula = compiledBaseFunction("=sum(A1)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("cannot compile some invalid formulas", () => {
    expect(() => compiledBaseFunction("=qsdf")).toThrow();
  });
});

describe("compile functions", () => {
  describe("check number of arguments", () => {
    afterAll(() => {
      restoreDefaultFunctions();
    });

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
      restoreDefaultFunctions();
    });

    test("with optional argument", () => {
      functionRegistry.add("OPTIONAL", {
        description: "function with optional argument",
        compute: () => {
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
      restoreDefaultFunctions();
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
      restoreDefaultFunctions();
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
      restoreDefaultFunctions();
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
      restoreDefaultFunctions();
    });
  });

  describe("interpret arguments", () => {
    beforeAll(() => {
      functionRegistry.add("ISSECONDARGUNDEFINED", {
        description: "any function",
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        compute: (arg1, arg2) => {
          return arg2 === undefined;
        },
        computeFormat: (arg1, arg2) => {
          return arg2 === undefined ? "TRUE" : "FALSE";
        },
        returns: ["BOOLEAN"],
      });

      functionRegistry.add("SECONDARGDEFAULTVALUEEQUAL42", {
        description: "function with a default argument",
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
        compute: (arg1, arg2 = 42) => {
          return arg2 === 42;
        },
        computeFormat: (arg1, arg2 = { value: 42, format: "42" }) => {
          return !Array.isArray(arg2) &&
            typeof arg2 !== "function" &&
            arg2.value === 42 &&
            arg2.format === "42"
            ? "TRUE"
            : "FALSE";
        },
        returns: ["ANY"],
      });
    });
    afterAll(() => {
      restoreDefaultFunctions();
    });
    test("empty value interpreted as undefined", () => {
      expect(evaluateCell("A1", { A1: "=ISSECONDARGUNDEFINED(1,)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=ISSECONDARGUNDEFINED(1,)" })).toBe("TRUE");
    });

    test("if default value --> empty value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1,)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1,)" })).toBe("TRUE");
    });

    test("if default value --> non-value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1)" })).toBe("TRUE");
    });
  });

  describe("check type of arguments", () => {
    afterAll(() => {
      restoreDefaultFunctions();
    });
    test("reject non-range argument when expecting only range argument", () => {
      functionRegistry.add("RANGEEXPECTED", {
        description: "function expect number in 1st arg",
        compute: (arg) => {
          return true;
        },
        args: [{ name: "arg1", description: "", type: ["RANGE"] }],
        returns: ["ANY"],
      });

      functionRegistry.add("FORMULA_RETURNING_RANGE", {
        description: "function returning range",
        compute: (arg) => {
          return [["cucumber"]];
        },
        args: [],
        returns: ["RANGE"],
      });

      functionRegistry.add("FORMULA_NOT_RETURNING_RANGE", {
        description: "function returning range",
        compute: (arg) => {
          return "cucumber";
        },
        args: [],
        returns: ["STRING"],
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
      expect(() =>
        compiledBaseFunction("=RANGEEXPECTED(FORMULA_NOT_RETURNING_RANGE())")
      ).toThrowError(
        "Function RANGEEXPECTED expects the parameter 1 to be reference to a cell or range, not a funcall."
      );

      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A1)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A2)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(A1:A$2)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(sheet2!A1:A$2)")).not.toThrow();
      expect(() => compiledBaseFunction("=RANGEEXPECTED(FORMULA_RETURNING_RANGE())")).not.toThrow();
    });

    test("reject range when expecting only non-range argument", () => {
      for (let typeExpected of ["ANY", "BOOLEAN", "DATE", "NUMBER", "STRING"] as ArgType[]) {
        functionRegistry.add(typeExpected + "EXPECTED", {
          description: "function expect number in 1st arg",
          compute: () => {
            return true;
          },
          args: [{ name: "arg1", description: "", type: [typeExpected] }],
          returns: ["ANY"],
        });
      }

      const m = new Model();
      const sheetId = m.getters.getActiveSheetId();

      expect(() => m.getters.evaluateFormula(sheetId, "=?ANYEXPECTED(A1:A2)")).toThrowError(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=BOOLEANEXPECTED(A1:A2)")).toThrowError(
        "Function BOOLEANEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=DATEEXPECTED(A1:A2)")).toThrowError(
        "Function DATEEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=NUMBEREXPECTED(A1:A2)")).toThrowError(
        "Function NUMBEREXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=STRINGEXPECTED(A1:A2)")).toThrowError(
        "Function STRINGEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );

      expect(() => m.getters.evaluateFormula(sheetId, "=ANYEXPECTED(A1:A$2)")).toThrowError(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=ANYEXPECTED(sheet2!A1:A$2)")).toThrowError(
        "Function ANYEXPECTED expects the parameter 1 to be a single value or a single cell reference, not a range."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=A2:A3")).toThrowError(
        "Function EQ expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=+A2:A3")).toThrowError(
        "Function UPLUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=A1+A2:A3")).toThrowError(
        "Function ADD expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=-A2:A3")).toThrowError(
        "Function UMINUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=A1-A2:A3")).toThrowError(
        "Function MINUS expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=A1+A4*A5:A6-A2")).toThrowError(
        "Function MULTIPLY expects its parameters to be single values or single cell references, not ranges."
      );
      expect(() => m.getters.evaluateFormula(sheetId, "=ANYEXPECTED(A1:A1)")).not.toThrow();
    });
  });

  describe("with meta arguments", () => {
    beforeAll(() => {
      functionRegistry.add("USEMETAARG", {
        description: "function with a meta argument",
        compute: () => true,
        args: [{ name: "arg", description: "", type: ["META"] }],
        returns: ["STRING"],
      });
      functionRegistry.add("NOTUSEMETAARG", {
        description: "any function",
        compute: () => true,
        args: [{ name: "arg", description: "", type: ["ANY"] }],
        returns: ["ANY"],
      });
    });

    test.each(["=USEMETAARG(A1)", "=USEMETAARG(B2)"])(
      "function call requesting meta parameter",
      (formula) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.execute.toString()).toMatchSnapshot();
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

      const m = new Model();

      let refFn = jest.fn();
      let ensureRange = jest.fn();

      const ctx = { USEMETAARG: () => {}, NOTUSEMETAARG: () => {} };

      const rangeA1 = createRange(m.getters, "ABC", "A1")!;
      const rangeA1ToB2 = createRange(m.getters, "ABC", "A1:B2")!;

      compiledFormula1.execute([rangeA1], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1, true, "USEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula2.execute([rangeA1ToB2], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1ToB2, true, "USEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula3.execute([rangeA1], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1, false, "NOTUSEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula4.execute([rangeA1ToB2], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1ToB2, false, "NOTUSEMETAARG", 1);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();
    });
  });

  test("function cache ignore spaces in functions", () => {
    compiledBaseFunction("=SUM(A1)");
    expect(Object.keys(functionCache)).toEqual(["=SUM(|0|)"]);
    compile("= SUM(A1)");
    compile("=SUM( A1)");
    compile("= SUM(A1 )");
    compile("= SUM   (    A1    )");
    expect(Object.keys(functionCache)).toEqual(["=SUM(|0|)"]);
  });
});
