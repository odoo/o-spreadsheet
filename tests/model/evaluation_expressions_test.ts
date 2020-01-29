import { evaluate } from "../helpers";

/**
 * Tests in this file are supposed to test mostly the compiler/functions parts,
 * not the semantic of the recursive evaluation of formulas.
 */

describe("expression evaluation", () => {
  test("arithmetic expressions", () => {
    expect(evaluate("=1")).toBe(1);
    expect(evaluate("=2 + 3 * 4")).toBe(14);
  });

  test("comparisons", () => {
    // eq
    expect(evaluate("=2 = 1")).toBe(false);
    expect(evaluate("=2 = 2")).toBe(true);

    // gt
    expect(evaluate("=2 > 1")).toBe(true);
    expect(evaluate("=1 > 2")).toBe(false);
    expect(evaluate("=1 > 1")).toBe(false);
    // gte
    expect(evaluate("=1 >= 1")).toBe(true);
    expect(evaluate("=1 >= 0")).toBe(true);
    expect(evaluate("=-1 >= 3")).toBe(false);
    // lt
    expect(evaluate("=1 < 2")).toBe(true);
    expect(evaluate("=2 < 2")).toBe(false);
    expect(evaluate("=3 < 2")).toBe(false);
    // lte
    expect(evaluate("=1 <= 2")).toBe(true);
    expect(evaluate("=2 <= 2")).toBe(true);
    expect(evaluate("=3 <= 2")).toBe(false);
  });

  test("miscellaneous formulas", () => {
    const r1 = evaluate("=SUM(A1,B1)", { A1: 1, B1: 2 });
    expect(r1).toBe(3);
    const r2 = evaluate("=SUM(A1:B1)", { A1: 1, B1: 2 });
    expect(r2).toBe(3);
  });
});
