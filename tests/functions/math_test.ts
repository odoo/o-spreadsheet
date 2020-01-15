import { functions } from "../../src/functions/math";

describe("math", () => {
  test("SUM: add some numbers", () => {
    expect(functions.SUM.compute(1, 2)).toBe(3);
    expect(functions.SUM.compute(1, 2, 3)).toBe(6);
  });

  test("SUM: add some ranges", () => {
    expect(functions.SUM.compute([1, 2])).toBe(3);
    expect(functions.SUM.compute(1, [2, 3])).toBe(6);
  });

  test("RAND: return a number", () => {
    expect(typeof functions.RAND.compute()).toBe("number");
  });

  test("MIN", () => {
    expect(typeof functions.MIN.compute()).toBe("number");
    expect(functions.MIN.compute(0, 1, 2)).toBe(0);
    expect(functions.MIN.compute("1", "2")).toBe(1);
    expect(functions.MIN.compute("-5", 5)).toBe(-5);
  });

  test("MAX", () => {
    expect(typeof functions.MAX.compute()).toBe("number");
    expect(functions.MAX.compute(0, 1, 2)).toBe(2);
    expect(functions.MAX.compute("1", "2")).toBe(2);
    expect(functions.MAX.compute("-5", 5)).toBe(5);
  });
});
