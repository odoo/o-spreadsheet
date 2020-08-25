import { compile } from "../../src/formulas";
import { functionCache } from "../../src/formulas/compiler";

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
