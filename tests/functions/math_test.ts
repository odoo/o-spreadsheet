import { functions } from "../../src/functions/math";
import { fromNumber, N } from "../../src/decimal";
import { evaluate } from "../helpers";

const n = fromNumber;

describe("math", () => {
  test("SUM: add some numbers", () => {
    expect(functions.SUM.compute(n(1), n(2))).toEqual(n(3));
    expect(functions.SUM.compute(n(1), n(2), n(3))).toEqual(n(6));
  });

  test("SUM: add some ranges", () => {
    expect(functions.SUM.compute([n(1), n(2)])).toEqual(n(3));
    expect(functions.SUM.compute(n(1), [n(2), n(3)])).toEqual(n(6));
    expect(evaluate("=sum(A1:A3)", { A1: 1, A2: 2, A3: 3 })).toEqual(n(6));
    expect(evaluate("=sum(A1:A3, A3)", { A1: 1, A2: 2, A3: 3 })).toEqual(n(9));
  });

  test("SUM: add a number and a string", () => {
    expect(functions.SUM.compute([n(11), "str"])).toEqual(n(11));
  });

  test("RAND: return a number", () => {
    expect(functions.RAND.compute()).toBeInstanceOf(N);
  });

  test("MIN", () => {
    expect(evaluate(`=min(0,1,2,-1)`)).toEqual(n(-1));
    expect(evaluate(`=min(0,1,2)`)).toEqual(n(0));
    expect(evaluate(`=min(1,2)`)).toEqual(n(1));
    expect(evaluate(`=min(-5)`)).toEqual(n(-5));
  });

  test("MAX", () => {
    expect(evaluate(`=max(0,1,2,-1)`)).toEqual(n(2));
    expect(evaluate(`=max(0,1,2)`)).toEqual(n(2));
    expect(evaluate(`=max(1,2)`)).toEqual(n(2));
    expect(evaluate(`=max(-5)`)).toEqual(n(-5));
  });
});
