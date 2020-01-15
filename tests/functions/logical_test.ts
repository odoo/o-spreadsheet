import { functions } from "../../src/functions/logical";

describe("bool", () => {
  test("AND", () => {
    expect(typeof functions.AND.compute(true)).toBe("boolean");
    expect(functions.AND.compute(true)).toBe(true);
    expect(functions.AND.compute(true, false)).toBe(false);
    expect(functions.AND.compute(true, true)).toBe(true);
    expect(functions.AND.compute(1, 0)).toBe(false);
    expect(functions.AND.compute("bla", "test")).toBe(true);
    expect(functions.AND.compute("bla", "")).toBe(false);
  });

  test("OR", () => {
    expect(typeof functions.OR.compute(true)).toBe("boolean");
    expect(functions.OR.compute(true)).toBe(true);
    expect(functions.OR.compute(true, false)).toBe(true);
    expect(functions.OR.compute(true, true)).toBe(true);
    expect(functions.OR.compute(1, 0)).toBe(true);
    expect(functions.OR.compute("bla", "test")).toBe(true);
    expect(functions.OR.compute("bla", "")).toBe(true);
    expect(functions.OR.compute("", "")).toBe(false);
    expect(functions.OR.compute(false)).toBe(false);
  });

  test("XOR", () => {
    expect(typeof functions.XOR.compute(true)).toBe("boolean");
    expect(functions.XOR.compute(true)).toBe(true);
    expect(functions.XOR.compute(true, false)).toBe(true);
    expect(functions.XOR.compute(true, true)).toBe(false);
    expect(functions.XOR.compute(1, 0)).toBe(true);
    expect(functions.XOR.compute("bla", "test")).toBe(false);
    expect(functions.XOR.compute("bla", "")).toBe(true);
    expect(functions.XOR.compute("", "")).toBe(false);
    expect(functions.XOR.compute(false)).toBe(false);
  });

  test("NOT", () => {
    expect(typeof functions.NOT.compute()).toBe("boolean");
    expect(functions.NOT.compute(false)).toBe(true);
    expect(functions.NOT.compute(true)).toBe(false);
    expect(functions.NOT.compute(0)).toBe(true);
    expect(functions.NOT.compute(1)).toBe(false);
    expect(functions.NOT.compute("bla")).toBe(false);
  });

  test("IF", () => {
    expect(functions.IF.compute(true, 1, 2)).toBe(1);
    expect(functions.IF.compute(false, 1, 2)).toBe(2);
    expect(functions.IF.compute(1 - 1, 1, 2)).toBe(2);
    expect(functions.IF.compute("real", "hello", "plop")).toBe("hello");
  });
});
