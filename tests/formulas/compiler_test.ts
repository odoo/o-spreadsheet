import { compile } from "../../src/formulas";

describe("expression compiler", () => {
  test("simple values", () => {
    expect(compile("=1").toString()).toMatchSnapshot();
    expect(compile("=true").toString()).toMatchSnapshot();
    expect(compile(`="abc"`).toString()).toMatchSnapshot();
    expect(() => compile(`='abc'`).toString()).toThrowError();
  });

  test("some arithmetic expressions", () => {
    expect(compile("=1 + 3").toString()).toMatchSnapshot();
    expect(compile("=2 * 3").toString()).toMatchSnapshot();
    expect(compile("=2 - 3").toString()).toMatchSnapshot();
    expect(compile("=2 / 3").toString()).toMatchSnapshot();
    expect(compile("=-3").toString()).toMatchSnapshot();
    expect(compile("=(3 + 1) * (-1 + 4)").toString()).toMatchSnapshot();
  });

  test("function call", () => {
    expect(compile("=sum(1,2)").toString()).toMatchSnapshot();
    expect(compile('=sum(true, "")').toString()).toMatchSnapshot();
    expect(compile("=sum(1,,2)").toString()).toMatchSnapshot();
  });

  test("read some values and functions", () => {
    expect(compile("=A1 + sum(A2:C3)").toString()).toMatchSnapshot();
  });

  test("expression with $ref", () => {
    expect(compile("=$A1+$A$2+A$3").toString()).toMatchSnapshot();
  });

  test("expression with references with a sheet", () => {
    expect(compile("=Sheet34!B3").toString()).toMatchSnapshot();
  });

  test("expressions with a debugger", () => {
    expect(compile("=? A1 / 2").toString()).toMatchSnapshot();
  });

  test("async functions", () => {
    expect(compile("=WAIT(5)").toString()).toMatchSnapshot();
  });

  test("cells are converted to ranges if function require a range", () => {
    expect(compile("=sum(A1)").toString()).toMatchSnapshot();
  });

  test("cannot compile some invalid formulas", () => {
    expect(() => compile("=A1:A2")).toThrow();
    expect(() => compile("=qsdf")).toThrow();
  });

  test("check at compile time for number of arguments", () => {
    expect(() => compile("=pi()")).not.toThrow();
    expect(() => compile("=pi(3)")).toThrowError("Invalid number of arguments");
    expect(() => compile("=sum()")).toThrowError("Invalid number of arguments");
    expect(() => compile("=sum(1)")).not.toThrowError();
    expect(() => compile("=sum(1,2)")).not.toThrowError();
    expect(() => compile("=sum(1,2,3)")).not.toThrowError();
  });
});
