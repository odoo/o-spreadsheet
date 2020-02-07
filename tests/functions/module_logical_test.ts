import { functions } from "../../src/functions/module_logical";

const { AND, OR, XOR, NOT, IF } = functions;

describe("bool", () => {
  test("AND", () => {
    expect(typeof AND.compute(true)).toBe("boolean");
    expect(AND.compute(true)).toBe(true);
    expect(AND.compute(true, false)).toBe(false);
    expect(AND.compute(true, true)).toBe(true);
    expect(AND.compute(1, 0)).toBe(false);
    expect(AND.compute("bla", "test")).toBe(true);
    expect(AND.compute("bla", "")).toBe(false);
  });

  test("OR", () => {
    expect(typeof OR.compute(true)).toBe("boolean");
    expect(OR.compute(true)).toBe(true);
    expect(OR.compute(true, false)).toBe(true);
    expect(OR.compute(true, true)).toBe(true);
    expect(OR.compute(1, 0)).toBe(true);
    expect(OR.compute("bla", "test")).toBe(true);
    expect(OR.compute("bla", "")).toBe(true);
    expect(OR.compute("", "")).toBe(false);
    expect(OR.compute(false)).toBe(false);
  });

  test("XOR", () => {
    expect(typeof XOR.compute(true)).toBe("boolean");
    expect(XOR.compute(true)).toBe(true);
    expect(XOR.compute(true, false)).toBe(true);
    expect(XOR.compute(true, true)).toBe(false);
    expect(XOR.compute(1, 0)).toBe(true);
    expect(XOR.compute("bla", "test")).toBe(false);
    expect(XOR.compute("bla", "")).toBe(true);
    expect(XOR.compute("", "")).toBe(false);
    expect(XOR.compute(false)).toBe(false);
  });

  test("NOT", () => {
    expect(typeof NOT.compute()).toBe("boolean");
    expect(NOT.compute(false)).toBe(true);
    expect(NOT.compute(true)).toBe(false);
    expect(NOT.compute(0)).toBe(true);
    expect(NOT.compute(1)).toBe(false);
    expect(NOT.compute("bla")).toBe(false);
  });

  test("IF", () => {
    expect(IF.compute(true, 1, 2)).toBe(1);
    expect(IF.compute(false, 1, 2)).toBe(2);
    expect(IF.compute(1 - 1, 1, 2)).toBe(2);
    expect(IF.compute("real", "hello", "plop")).toBe("hello");
  });
});
