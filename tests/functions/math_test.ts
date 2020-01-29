import { functions } from "../../src/functions/math";
import { evaluate } from "../helpers";

describe("math", () => {
  test("SUM: add some numbers", () => {
    expect(functions.SUM.compute(1, 2)).toEqual(3);
    expect(functions.SUM.compute(1, 2, 3)).toEqual(6);
  });

  test("SUM: add some ranges", () => {
    expect(functions.SUM.compute([1, 2])).toEqual(3);
    expect(functions.SUM.compute(1, [2, 3])).toEqual(6);
    expect(evaluate("=sum(A1:A3)", { A1: 1, A2: 2, A3: 3 })).toEqual(6);
    expect(evaluate("=sum(A1:A3, A3)", { A1: 1, A2: 2, A3: 3 })).toEqual(9);
  });

  test("SUM: add a number and a string", () => {
    expect(functions.SUM.compute([11, "str"])).toEqual(11);
  });

  test("RAND: return a number", () => {
    const random = functions.RAND.compute();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(1);
  });

  test("MIN", () => {
    expect(evaluate(`=min(0,1,2,-1)`)).toEqual(-1);
    expect(evaluate(`=min(0,1,2)`)).toEqual(0);
    expect(evaluate(`=min(1,2)`)).toEqual(1);
    expect(evaluate(`=min(-5)`)).toEqual(-5);
  });

  test("MAX", () => {
    expect(evaluate(`=max(0,1,2,-1)`)).toEqual(2);
    expect(evaluate(`=max(0,1,2)`)).toEqual(2);
    expect(evaluate(`=max(1,2)`)).toEqual(2);
    expect(evaluate(`=max(-5)`)).toEqual(-5);
  });
});
