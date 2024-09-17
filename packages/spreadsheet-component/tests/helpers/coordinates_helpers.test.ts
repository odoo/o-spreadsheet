import { numberToLetters, toCartesian, toXC } from "../../src/helpers/index";
import { Position } from "../../src/types";

function toPosition(col: number, row: number): Position {
  return { col, row };
}

describe("numberToLetter", () => {
  test("basic functionality", () => {
    expect(() => numberToLetters(-1)).toThrow();
    expect(numberToLetters(0)).toBe("A");
    expect(numberToLetters(25)).toBe("Z");
    expect(numberToLetters(26)).toBe("AA");
  });
});

describe("toCartesian", () => {
  test("basic functionality", () => {
    expect(toCartesian("A1")).toEqual(toPosition(0, 0));
    expect(toCartesian("B1")).toEqual(toPosition(1, 0));
    expect(toCartesian("C5")).toEqual(toPosition(2, 4));
    expect(toCartesian("AA55")).toEqual(toPosition(26, 54));
    expect(toCartesian("c5")).toEqual(toPosition(2, 4));
    expect(toCartesian(" C5 ")).toEqual(toPosition(2, 4));
    expect(toCartesian("AAA1")).toEqual(toPosition(702, 0));
    expect(toCartesian("A999999")).toEqual(toPosition(0, 999998));
  });

  test("invalid ranges", () => {
    expect(() => toCartesian("C5A")).toThrow("Invalid cell description: C5A");
    expect(() => toCartesian("C5C5")).toThrow("Invalid cell description: C5C5");
    expect(() => toCartesian("C")).toThrow("Invalid cell description: C");
    expect(() => toCartesian("5")).toThrow("Invalid cell description: 5");
    expect(() => toCartesian("C 5")).toThrow("Invalid cell description: C 5");
    expect(() => toCartesian("")).toThrow("Invalid cell description: ");
    expect(() => toCartesian(" ")).toThrow("Invalid cell description: ");
    expect(() => toCartesian("AAAA1")).toThrow("Invalid cell description: AAAA1");
    expect(() => toCartesian("A10000000")).toThrow("Invalid cell description: A10000000");
  });
});

describe("toXC", () => {
  test("basic functionality", () => {
    expect(toXC(0, 0)).toBe("A1");
    expect(toXC(1, 0)).toBe("B1");
    expect(toXC(0, 1)).toBe("A2");
  });
});
