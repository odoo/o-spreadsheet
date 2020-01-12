import { numberToLetters, toCartesian, toXC } from "../src/helpers";

describe("numberToLetter", () => {
  test("basic functionality", () => {
    expect(numberToLetters(0)).toBe("A");
    expect(numberToLetters(25)).toBe("Z");
    expect(numberToLetters(26)).toBe("AA");
  });
});

describe("toCartesian", () => {
  test("basic functionality", () => {
    expect(toCartesian("A1")).toEqual([0, 0]);
    expect(toCartesian("B1")).toEqual([1, 0]);
    expect(toCartesian("C5")).toEqual([2, 4]);
  });
});

describe("toXC", () => {
  test("basic functionality", () => {
    expect(toXC(0, 0)).toBe("A1");
    expect(toXC(1, 0)).toBe("B1");
    expect(toXC(0, 1)).toBe("A2");
  });
});
