import { evaluateCell } from "../test_helpers/helpers";

/**
 * Tests in this file are supposed to test mostly the compiler/functions parts,
 * not the semantic of the recursive evaluation of formulas.
 */

describe("expression evaluation", () => {
  test("arithmetic expressions", async () => {
    expect(await evaluateCell("A1", { A1: "=1" })).toBe(1);
    expect(await evaluateCell("A1", { A1: "=2 + 3 * 4" })).toBe(14);
  });

  test("comparisons", async () => {
    // eq
    expect(await evaluateCell("A1", { A1: "=2 = 1" })).toBe(false);
    expect(await evaluateCell("A1", { A1: "=2 = 2" })).toBe(true);

    // gt
    expect(await evaluateCell("A1", { A1: "=2 > 1" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=1 > 2" })).toBe(false);
    expect(await evaluateCell("A1", { A1: "=1 > 1" })).toBe(false);
    // gte
    expect(await evaluateCell("A1", { A1: "=1 >= 1" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=1 >= 0" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=-1 >= 3" })).toBe(false);
    // lt
    expect(await evaluateCell("A1", { A1: "=1 < 2" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=2 < 2" })).toBe(false);
    expect(await evaluateCell("A1", { A1: "=3 < 2" })).toBe(false);
    // lte
    expect(await evaluateCell("A1", { A1: "=1 <= 2" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=2 <= 2" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=3 <= 2" })).toBe(false);
  });

  test("priority of operations", async () => {
    expect(await evaluateCell("A1", { A1: "=4 > 1 + 2" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=4 < 1 + 2" })).toBe(false);
    expect(await evaluateCell("A1", { A1: "=4 >= 1 + 2" })).toBe(true);
    expect(await evaluateCell("A1", { A1: "=4 <= 1 + 2" })).toBe(false);
    expect(await evaluateCell("A1", { A1: "=2 = 1 + 1" })).toBe(true);

    expect(await evaluateCell("A1", { A1: '="4" > 1 & 2' })).toBe(true);
    expect(await evaluateCell("A1", { A1: '="4" < 1 & 2' })).toBe(false);
    expect(await evaluateCell("A1", { A1: '="4" >= 1 & 2' })).toBe(true);
    expect(await evaluateCell("A1", { A1: '="4" <= 1 & 2' })).toBe(false);
    expect(await evaluateCell("A1", { A1: '="12" = 1 & 2' })).toBe(true);
  });

  test("miscellaneous formulas", async () => {
    const r1 = await evaluateCell("A2", { A2: "=SUM(A1,B1)", A1: "1", B1: "2" });
    expect(r1).toBe(3);
    const r2 = await evaluateCell("A2", { A2: "=SUM(A1:B1)", A1: "1", B1: "2" });
    expect(r2).toBe(3);
  });
});
