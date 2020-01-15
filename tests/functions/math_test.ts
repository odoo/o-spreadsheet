import { functions } from "../../src/functions";

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
});
