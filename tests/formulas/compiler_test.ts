import { compile, normalize } from "../../src/formulas/index";
import { functionCache } from "../../src/formulas/compiler";
import { functionRegistry } from "../../src/functions";
import { evaluateCell } from "../helpers";
import { NormalizedFormula, Range } from "../../src/types";
import { toZone } from "../../src/helpers";

function compiledBaseFunction(formula: string): string {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  compileFromCompleteFormula(formula);
  return Object.values(functionCache)[0].toString();
}

function compileFromCompleteFormula(formula: string) {
  let formulaString: NormalizedFormula = normalize(formula);
  return compile(formulaString);
}

describe("expression compiler", () => {
  test("simple values", () => {
    expect(compiledBaseFunction("=1")).toMatchSnapshot();
    expect(compiledBaseFunction("=true")).toMatchSnapshot();
    expect(compiledBaseFunction(`="abc"`)).toMatchSnapshot();

    expect(() => compiledBaseFunction(`='abc'`)).toThrowError();
  });

  test("some arithmetic expressions", () => {
    expect(compiledBaseFunction("=1 + 3")).toMatchSnapshot();
    expect(compiledBaseFunction("=2 * 3")).toMatchSnapshot();
    expect(compiledBaseFunction("=2 - 3")).toMatchSnapshot();
    expect(compiledBaseFunction("=2 / 3")).toMatchSnapshot();
    expect(compiledBaseFunction("=-3")).toMatchSnapshot();
    expect(compiledBaseFunction("=(3 + 1) * (-1 + 4)")).toMatchSnapshot();
  });

  test("function call", () => {
    expect(compiledBaseFunction("=sum(1,2)")).toMatchSnapshot();
    expect(compiledBaseFunction('=sum(true, "")')).toMatchSnapshot();
    expect(compiledBaseFunction("=sum(1,,2)")).toMatchSnapshot();
  });

  test("read some values and functions", () => {
    expect(compiledBaseFunction("=A1 + sum(A2:C3)")).toMatchSnapshot();
  });

  test("expression with $ref", () => {
    expect(compiledBaseFunction("=$A1+$A$2+A$3")).toMatchSnapshot();
  });

  test("expression with references with a sheet", () => {
    expect(compiledBaseFunction("=Sheet34!B3")).toMatchSnapshot();
  });

  test("expressions with a debugger", () => {
    expect(compiledBaseFunction("=? A1 / 2")).toMatchSnapshot();
  });

  test("async functions", () => {
    expect(compiledBaseFunction("=WAIT(5)")).toMatchSnapshot();
  });

  test("cells are converted to ranges if function require a range", () => {
    expect(compiledBaseFunction("=sum(A1)")).toMatchSnapshot();
  });

  test("cannot compile some invalid formulas", () => {
    expect(() => compiledBaseFunction("=qsdf")).toThrow();
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
        compute: (arg) => {
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

    test("functions call requesting lazy parameters", () => {
      expect(compiledBaseFunction("=USELAZYARG(24)")).toMatchSnapshot();
      expect(compiledBaseFunction("=USELAZYARG(1/0)")).toMatchSnapshot();
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

    test("function call requesting meta parameter", () => {
      expect(compiledBaseFunction("=USEMETAARG(A1)")).toMatchSnapshot();
      expect(compiledBaseFunction("=USEMETAARG(B2)")).toMatchSnapshot();
    });

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

      const ctx = { USEMETAARG: () => {}, NOTUSEMETAARG: () => {} };

      const rangeA1 = [{ zone: toZone("A1"), id: "R1", sheetId: "ABC" }] as Range[];
      const rangeA1ToB2 = [{ zone: toZone("A1:B2"), id: "R1", sheetId: "ABC" }] as Range[];

      compiledFormula1(rangeA1, "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1, "ABC", true);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula2(rangeA1ToB2, "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1ToB2, "ABC", true);
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula3(rangeA1, "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1, "ABC");
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();

      compiledFormula4(rangeA1ToB2, "ABC", refFn, ensureRange, ctx);
      expect(refFn).toHaveBeenCalledWith(0, rangeA1ToB2, "ABC");
      expect(ensureRange).toHaveBeenCalledTimes(0);
      refFn.mockReset();
    });
  });
});
