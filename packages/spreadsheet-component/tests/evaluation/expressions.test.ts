import { evaluateCell } from "../test_helpers/helpers";

/**
 * Tests in this file are supposed to test mostly the compiler/functions parts,
 * not the semantic of the recursive evaluation of formulas.
 */

describe("expression evaluation", () => {
  test("arithmetic expressions", () => {
    expect(evaluateCell("A1", { A1: "=1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=2 + 3 * 4" })).toBe(14);
  });

  test("comparisons", () => {
    // eq
    expect(evaluateCell("A1", { A1: "=2 = 1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=2 = 2" })).toBe(true);

    // gt
    expect(evaluateCell("A1", { A1: "=2 > 1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=1 > 2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=1 > 1" })).toBe(false);
    // gte
    expect(evaluateCell("A1", { A1: "=1 >= 1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=1 >= 0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=-1 >= 3" })).toBe(false);
    // lt
    expect(evaluateCell("A1", { A1: "=1 < 2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=2 < 2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=3 < 2" })).toBe(false);
    // lte
    expect(evaluateCell("A1", { A1: "=1 <= 2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=2 <= 2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=3 <= 2" })).toBe(false);
  });

  test("priority of operations", () => {
    expect(evaluateCell("A1", { A1: "=4 > 1 + 2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=4 < 1 + 2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=4 >= 1 + 2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=4 <= 1 + 2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=2 = 1 + 1" })).toBe(true);

    expect(evaluateCell("A1", { A1: '="4" > 1 & 2' })).toBe(true);
    expect(evaluateCell("A1", { A1: '="4" < 1 & 2' })).toBe(false);
    expect(evaluateCell("A1", { A1: '="4" >= 1 & 2' })).toBe(true);
    expect(evaluateCell("A1", { A1: '="4" <= 1 & 2' })).toBe(false);
    expect(evaluateCell("A1", { A1: '="12" = 1 & 2' })).toBe(true);
  });

  test("miscellaneous formulas", () => {
    const r1 = evaluateCell("A2", { A2: "=SUM(A1,B1)", A1: "1", B1: "2" });
    expect(r1).toBe(3);
    const r2 = evaluateCell("A2", { A2: "=SUM(A1:B1)", A1: "1", B1: "2" });
    expect(r2).toBe(3);
  });
});
