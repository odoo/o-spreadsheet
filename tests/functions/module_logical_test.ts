import { functionMap } from "../../src/functions/index";

const { AND, OR, XOR, NOT, IF } = functionMap;

describe("bool", () => {
  test("AND", () => {
    expect(typeof AND(true)).toBe("boolean");
    expect(AND(true)).toBe(true);
    expect(AND(true, false)).toBe(false);
    expect(AND(true, true)).toBe(true);
    expect(AND(1, 0)).toBe(false);
    expect(AND("true", "false")).toBe(false);
    expect(() => AND("1", true)).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but '1' is a text, and cannot be coerced to a boolean.`
      );
    expect(() => AND("bla", "test")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
    expect(() => AND("bla", "")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
  });

  test("OR", () => {
    expect(typeof OR(true)).toBe("boolean");
    expect(OR(true)).toBe(true);
    expect(OR(true, false)).toBe(true);
    expect(OR(true, true)).toBe(true);
    expect(OR(1, 0)).toBe(true);
    expect(() => OR("bla", "test")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
    expect(() => OR("bla", "")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
    expect(OR("", "")).toBe(false);
    expect(OR(false)).toBe(false);
  });

  test("XOR", () => {
    expect(typeof XOR(true)).toBe("boolean");
    expect(XOR(true)).toBe(true);
    expect(XOR(true, false)).toBe(true);
    expect(XOR(true, true)).toBe(false);
    expect(XOR(true, false, true, true)).toBe(true);
    expect(XOR(1, 0)).toBe(true);
    expect(() => XOR("bla", "test")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
    expect(XOR("true", "")).toBe(true);
    expect(XOR("", "")).toBe(false);
    expect(XOR(false)).toBe(false);
  });

  test.skip("NOT", () => {
    expect(() => NOT()).toThrow(
      `Wrong number of arguments. Expected 1, but got 0 argument(s) instead.`
    );
    expect(NOT(false)).toBe(true);
    expect(NOT(true)).toBe(false);
    expect(NOT(0)).toBe(true);
    expect(NOT(1)).toBe(false);
    expect(() => NOT(true, false)).toThrow(
      "Wrong number of arguments. Expected 1, but got 2 argument(s) instead."
    );
    expect(() => NOT("bla")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'bla' is a text, and cannot be coerced to a boolean.`
    );
  });

  test("IF", () => {
    expect(IF(true, 1, 2)).toBe(1);
    expect(IF(false, 1, 2)).toBe(2);
    expect(IF(1 - 1, 1, 2)).toBe(2);
    expect(IF("true", "hello", "plop")).toBe("hello");
    expect(() => IF("real", "hello", "plop")).toThrow(
      `The function [[FUNCTION_NAME]] expects a boolean value, but 'real' is a text, and cannot be coerced to a boolean.`
    );
  });
});
