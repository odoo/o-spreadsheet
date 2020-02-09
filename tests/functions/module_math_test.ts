import { functionMap } from "../../src/functions/index";

const { SUM, RAND, MIN, MAX } = functionMap;

describe("math", () => {
  test("SUM: add some numbers", () => {
    expect(SUM(1, 2)).toEqual(3);
    expect(SUM(1, 2, 3)).toEqual(6);
  });

  test("SUM: add some ranges", () => {
    expect(SUM([1, 2])).toEqual(3);
    expect(SUM(1, [2, 3])).toEqual(6);
    expect(SUM([[1], [2], [3]])).toEqual(6);
    expect(SUM([[1], [2]], 3)).toEqual(6);
  });

  test("SUM: add a number and a string", () => {
    expect(SUM([11, "str"])).toEqual(11);
    expect(() => SUM(11, "str")).toThrow(
      `Argument "number" should be a number, but "str" is a text, and cannot be coerced to a number.`
    );
  });

  test("RAND: return a number", () => {
    const random = RAND();
    expect(typeof random).toBe("number");
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(1);
  });

  test("MIN", () => {
    expect(MIN(0, 1, 2, -1)).toEqual(-1);
    expect(MIN(0, 1, 2)).toEqual(0);
    expect(MIN(1, 2)).toEqual(1);
    expect(MIN(true, 2)).toEqual(1);
    expect(MIN(undefined, true)).toEqual(0);
    expect(MIN(-5)).toEqual(-5);
  });

  test("MAX", () => {
    expect(MAX(0, 1, 2, -1)).toEqual(2);
    expect(MAX(0, 1, 2)).toEqual(2);
    expect(MAX(1, 2)).toEqual(2);
    expect(MAX(-5)).toEqual(-5);
    expect(MAX(true, 2)).toEqual(2);
    expect(MAX(true, 0)).toEqual(1);
    expect(MAX(undefined, true)).toEqual(1);
  });
});
