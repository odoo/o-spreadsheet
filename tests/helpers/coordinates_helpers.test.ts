import { numberToLetters, toA1, toCartesian, toXC } from "../../src/helpers/index";
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

describe("toA1", () => {
  test("bounded absolute reference", () => {
    expect(toA1("R1C1")).toBe("A1");
    expect(toA1("R1C3")).toBe("C1");
    expect(toA1("R4C2")).toBe("B4");
    expect(toA1("R1C1:R2C2")).toBe("A1:B2");
  });

  test("unbounded absolute reference", () => {
    expect(toA1("C3")).toBe("C:C");
    expect(toA1("RC3")).toBe("C:C");
    expect(toA1("R4")).toBe("4:4");
    expect(toA1("R4C")).toBe("4:4");
    expect(toA1("R1:R2")).toBe("1:2");
    expect(toA1("C1:C2")).toBe("A:B");
  });

  test("bounded relative references", () => {
    expect(toA1("R[1]C[1]", { col: 0, row: 0 })).toBe("B2");
    expect(toA1("R[0]C[3]", { col: 0, row: 1 })).toBe("D2");
    expect(toA1("R[-1]C[-2]", { col: 4, row: 4 })).toBe("C4");
    expect(toA1("R[-1]C[-1]:R[1]C[1]", { col: 4, row: 4 })).toBe("D4:F6");
  });

  test("unbounded relative references", () => {
    expect(toA1("C[3]", { col: 0, row: 1 })).toBe("D:D");
    expect(toA1("RC[3]", { col: 0, row: 1 })).toBe("D:D");
    expect(toA1("R[-1]", { col: 4, row: 4 })).toBe("4:4");
    expect(toA1("R[-1]C", { col: 4, row: 4 })).toBe("4:4");
    expect(toA1("R[-1]:R[1]", { col: 4, row: 4 })).toBe("4:6");
    expect(toA1("C[-1]:C[1]", { col: 4, row: 4 })).toBe("D:F");
  });

  test("mixed references", () => {
    expect(toA1("R[1]C1", { col: 0, row: 0 })).toBe("A2");
    expect(toA1("R1C[-2]", { col: 4, row: 4 })).toBe("C1");
    expect(toA1("R1:R[1]", { col: 0, row: 2 })).toBe("1:4");
    expect(toA1("C1:C[-1]", { col: 4, row: 4 })).toBe("A:D");
  });

  test("invalid references", () => {
    expect(() => toA1("R-1")).toThrow("Invalid reference");
    expect(() => toA1("C-1")).toThrow("Invalid reference");
    expect(() => toA1("R[-1")).toThrow("Invalid reference");
    expect(() => toA1("C[-1")).toThrow("Invalid reference");
  });
});
