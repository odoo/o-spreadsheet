import { Model } from "../../src";
import { functionCache } from "../../src/formulas/compiler";
import { compile } from "../../src/formulas/index";
import { functionRegistry } from "../../src/functions";
import { createValidRange } from "../../src/helpers";
import { CompiledFormula } from "../../src/types";
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
    expect(compiledBaseFunction(`='abc'`).isBadExpression).toBe(true);
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
    expect(compiledBaseFunction("=qsdf").isBadExpression).toBe(true);
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
      });
      expect(compiledBaseFunction("=ANYFUNCTION()").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=ANYFUNCTION(1)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=ANYFUNCTION(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=ANYFUNCTION(1,2,3)").isBadExpression).toBe(true);
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
      });
      expect(compiledBaseFunction("=OPTIONAL(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=OPTIONAL(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=OPTIONAL(1,2,3)").isBadExpression).toBe(true);
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
      });
      expect(compiledBaseFunction("=USEDEFAULTARG(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEDEFAULTARG(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEDEFAULTARG(1,2,3)").isBadExpression).toBe(true);
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
      });
      expect(compiledBaseFunction("=REPEATABLE(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLE(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLE(1,2,3,4,5,6)").isBadExpression).toBe(false);
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
      });
      expect(compiledBaseFunction("=REPEATABLES(1, 2)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3, 4)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3, 4, 5)").isBadExpression).toBe(false);
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
          return {
            value: arg2 === undefined,
            format: arg2 === undefined ? "TRUE" : "FALSE",
          };
        },
      });

      functionRegistry.add("SECONDARGDEFAULTVALUEEQUAL42", {
        description: "function with a default argument",
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
        compute: (arg1, arg2 = { value: 42, format: "42" }) => {
          return !Array.isArray(arg2) && arg2.value === 42 && arg2.format === "42"
            ? { value: true, format: "TRUE" }
            : { value: false, format: "FALSE" };
        },
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

  describe("with meta arguments", () => {
    beforeAll(() => {
      functionRegistry.add("USEMETAARG", {
        description: "function with a meta argument",
        compute: () => true,
        args: [{ name: "arg", description: "", type: ["META"] }],
      });
      functionRegistry.add("NOTUSEMETAARG", {
        description: "any function",
        compute: () => true,
        args: [{ name: "arg", description: "", type: ["ANY"] }],
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
      expect(compiledBaseFunction("=USEMETAARG(X8)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG($X$8)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG(Sheet42!X8)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG('Sheet 42'!X8)").isBadExpression).toBe(false);

      expect(compiledBaseFunction("=USEMETAARG(D3:Z9)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG($D$3:$Z$9)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG(Sheet42!$D$3:$Z$9)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEMETAARG('Sheet 42'!D3:Z9)").isBadExpression).toBe(false);

      expect(compiledBaseFunction('=USEMETAARG("kikou")').isBadExpression).toBe(true);
      expect(compiledBaseFunction('=USEMETAARG("")').isBadExpression).toBe(true);
      expect(compiledBaseFunction("=USEMETAARG(TRUE)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=USEMETAARG(SUM(1,2,3))").isBadExpression).toBe(true);
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

      const rangeA1 = createValidRange(m.getters, "ABC", "A1")!;
      const rangeA1ToB2 = createValidRange(m.getters, "ABC", "A1:B2")!;

      compiledFormula1.execute([rangeA1], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1, true);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula2.execute([rangeA1ToB2], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1ToB2, true);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula3.execute([rangeA1], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(rangeA1, false);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula4.execute([rangeA1ToB2], refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledTimes(0);
      expect(ensureRange).toHaveBeenCalledWith(rangeA1ToB2);
      refFn.mockReset();
    });
  });

  test("function cache ignore spaces in functions", () => {
    compiledBaseFunction("=SUM(A1)");
    expect(Object.keys(functionCache)).toEqual(["=SUM(C|0|)"]);
    compile("= SUM(A1)");
    compile("=SUM( A1)");
    compile("= SUM(A1 )");
    compile("= SUM   (    A1    )");
    expect(Object.keys(functionCache)).toEqual(["=SUM(C|0|)"]);
  });
});
