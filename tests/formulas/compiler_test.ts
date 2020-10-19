import { compileFromCompleteFormula } from "../../src/formulas/index";
import { functionCache } from "../../src/formulas/compiler";
import { functionRegistry } from "../../src/functions";
import { evaluateCell } from "../helpers";

function compiledBaseFunction(formula: string): string {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  compileFromCompleteFormula(formula);
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

describe("compile functions with lazy arguments", () => {
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

  test("formulas passed as lazy arguments are not executed before the parent formula", () => {
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

describe("compile functions with meta arguments", () => {
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

  test("function call requesting meta parameter throws error if parameter isn't cell/range reference", () => {
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

  test("functions call requesting a meta parameter does not care about the value of the cell / range passed as a reference", () => {
    const compiledFormula1 = compileFromCompleteFormula("=USEMETAARG(A1)");
    const compiledFormula2 = compileFromCompleteFormula("=USEMETAARG(A1:B2)");
    const compiledFormula3 = compileFromCompleteFormula("=NOTUSEMETAARG(A1)");
    const compiledFormula4 = compileFromCompleteFormula("=NOTUSEMETAARG(A1:B2)");

    let refFn = jest.fn();
    let ensureRange = jest.fn();

    const ctx = { USEMETAARG: () => {}, NOTUSEMETAARG: () => {} };

    compiledFormula1(["A1"], "ABC", undefined, refFn, ensureRange, ctx);
    expect(refFn).toHaveBeenCalledTimes(0);
    expect(ensureRange).toHaveBeenCalledTimes(0);

    compiledFormula2(["A1:B2"], "ABC", undefined, refFn, ensureRange, ctx);
    expect(refFn).toHaveBeenCalledTimes(0);
    expect(ensureRange).toHaveBeenCalledTimes(0);

    compiledFormula3(["A1"], "ABC", undefined, refFn, ensureRange, ctx);
    expect(refFn).toHaveBeenCalled();
    expect(ensureRange).toHaveBeenCalledTimes(0);
    refFn.mockReset();

    compiledFormula4(["A1:B2"], "ABC", undefined, refFn, ensureRange, ctx);
    expect(refFn).toHaveBeenCalledTimes(0);
    expect(ensureRange).toHaveBeenCalled();
  });
});
