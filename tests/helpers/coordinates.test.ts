import { numberToLetters, toCartesian, toXC } from "../../src/helpers/index";

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
    expect(toCartesian("AA55")).toEqual([26, 54]);
    expect(toCartesian("c5")).toEqual([2, 4]);
    expect(toCartesian(" C5 ")).toEqual([2, 4]);
    expect(toCartesian("AAA1")).toEqual([702, 0]);
    expect(toCartesian("A999999")).toEqual([0, 999998]);
  });

  test("invalid ranges", () => {
    expect(() => toCartesian("C5A")).toThrow();
    expect(() => toCartesian("C5C5")).toThrow();
    expect(() => toCartesian("C")).toThrow();
    expect(() => toCartesian("5")).toThrow();
    expect(() => toCartesian("C 5")).toThrow();
    expect(() => toCartesian("")).toThrow();
    expect(() => toCartesian(" ")).toThrow();
    expect(() => toCartesian("AAAA1")).toThrow();
    expect(() => toCartesian("A10000000")).toThrow();
  });
});

describe("toXC", () => {
  test("basic functionality", () => {
    expect(toXC(0, 0)).toBe("A1");
    expect(toXC(1, 0)).toBe("B1");
    expect(toXC(0, 1)).toBe("A2");
  });
});
