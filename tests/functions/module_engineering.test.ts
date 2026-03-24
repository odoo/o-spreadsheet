import { evaluateCell } from "../test_helpers/helpers";

describe("DELTA formula", () => {
  test("take 1 or 2 arguments", async () => {
    expect(await evaluateCell("A1", { A1: "=DELTA()" })).toBe("#BAD_EXPR");
    expect(await evaluateCell("A1", { A1: "=DELTA(0)" })).toBe(1);
    expect(await evaluateCell("A1", { A1: "=DELTA(0,0)" })).toBe(1);
    expect(await evaluateCell("A1", { A1: "=DELTA(1,2,3)" })).toBe("#BAD_EXPR");
  });

  test.each([
    ["0", "1", 0],
    ["1", "1", 1],
    ["-1", "-1", 1],
  ])("delta value", async (value1, value2, result) => {
    expect(await evaluateCell("A1", { A1: "=DELTA(A2, A3)", A2: value1, A3: value2 })).toBe(result);
  });

  test("default value for arg 2 is 0", async () => {
    expect(await evaluateCell("A1", { A1: "=DELTA(0)" })).toBe(1);
  });

  test("empty cell are considered as 0", async () => {
    expect(await evaluateCell("A1", { A1: "=DELTA(A2)" })).toBe(1);
  });
});
