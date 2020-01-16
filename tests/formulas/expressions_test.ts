import { compile } from "../../src/formulas";

function evaluate(str: string, vars = {}, fns = {}): any {
  const fn = compile(str);
  const getValue = v => vars[v];
  return fn(getValue, fns);
}
describe("expression evaluation", () => {
  test("arithmetic expressions", () => {
    expect(evaluate("=1")).toBe(1);
    expect(evaluate("=2 + 3 * 4")).toBe(14);
  });

  test("comparisons", () => {
    expect(evaluate("=2 > 1")).toBe(true);
    expect(evaluate("=1 >= 1")).toBe(true);
    expect(evaluate("=1 > 2")).toBe(false);
  });
});
