import { functions } from "../../src/functions/module_math";

const { SUM, RAND, MIN, MAX } = functions;

describe("math", () => {
  test("SUM: add some numbers", () => {
    expect(SUM.compute(1, 2)).toEqual(3);
    expect(SUM.compute(1, 2, 3)).toEqual(6);
  });

  test("SUM: add some ranges", () => {
    expect(SUM.compute([1, 2])).toEqual(3);
    expect(SUM.compute(1, [2, 3])).toEqual(6);
    expect(SUM.compute([[1], [2], [3]])).toEqual(6);
    expect(SUM.compute([[1], [2]], 3)).toEqual(6);
  });

  test.only("SUM: add a number and a string", () => {
    expect(SUM.compute([11, "str"])).toEqual(11);
  });

  test("RAND: return a number", () => {
    const random = RAND.compute();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(1);
  });

  test("MIN", () => {
    expect(MIN.compute(0, 1, 2, -1)).toEqual(-1);
    expect(MIN.compute(0, 1, 2)).toEqual(0);
    expect(MIN.compute(1, 2)).toEqual(1);
    expect(MIN.compute(-5)).toEqual(-5);
  });

  test("MAX", () => {
    expect(MAX.compute(0, 1, 2, -1)).toEqual(2);
    expect(MAX.compute(0, 1, 2)).toEqual(2);
    expect(MAX.compute(1, 2)).toEqual(2);
    expect(MAX.compute(-5)).toEqual(-5);
  });
});
