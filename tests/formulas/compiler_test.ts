import { compile } from "../../src/formulas";
import { functionCache } from "../../src/formulas/compiler";
import { functionRegistry } from "../../src/functions/index";
import { evaluateCell } from "../helpers";

function compiledBaseFunction(formula: string): string {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  compile(formula, "Sheet1", { Sheet1: "1" });
  return Object.values(functionCache)[0].toString();
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

  test("function call (with lazy parameters)", () => {
    expect(compiledBaseFunction("=IF(TRUE, 42, 24)")).toMatchSnapshot();
    expect(compiledBaseFunction("=IF(TRUE, A2, 1/0)")).toMatchSnapshot();
    expect(compiledBaseFunction("=IF(TRUE, IF(TRUE, A2, SQRT(-1)), 1/0)")).toMatchSnapshot();
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
    expect(() => compiledBaseFunction("=A1:A2")).toThrow();
    expect(() => compiledBaseFunction("=qsdf")).toThrow();
  });

  test("check at compile time for number of arguments", () => {
    expect(() => compiledBaseFunction("=pi()")).not.toThrow();
    expect(() => compiledBaseFunction("=pi(3)")).toThrowError("Invalid number of arguments");
    expect(() => compiledBaseFunction("=sum()")).toThrowError("Invalid number of arguments");
    expect(() => compiledBaseFunction("=sum(1)")).not.toThrowError();
    expect(() => compiledBaseFunction("=sum(1,2)")).not.toThrowError();
    expect(() => compiledBaseFunction("=sum(1,2,3)")).not.toThrowError();
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

    test.each(["=USELAZYARG(24)", "=USELAZYARG(1/0)"])(
      "functions call requesting lazy parameters",
      (formula) => {
        const compiledFormula = compiledBaseFunction(formula);
        expect(compiledFormula.toString()).toMatchSnapshot();
      }
    );
  });
});
