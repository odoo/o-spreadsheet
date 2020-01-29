import { parse } from "../../src/formulas";

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toEqual({ type: "FUNCALL", value: "RAND", args: [] });
  });

  test("can parse unary operations", () => {
    expect(parse("-1")).toEqual({
      type: "UNARY_OPERATION",
      value: "-",
      right: { type: "NUMBER", value: 1 }
    });
  });
  test("can parse binary operations", () => {
    expect(parse("2-3")).toEqual({
      type: "BIN_OPERATION",
      value: "-",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 3 }
    });
  });

  test("AND", () => {
    expect(parse("=AND(true, false)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false }
      ]
    });
    expect(parse("=AND(0, tRuE)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true }
      ]
    });
  });

  test("can parse async functions", () => {
    expect(parse("=WAIT(12)")).toEqual({
      type: "ASYNC_FUNCALL",
      value: "WAIT",
      args: [{ type: "NUMBER", value: 12 }]
    });
  });
});

describe("knows what's a reference and what's not", () => {
  test("lowercase cell reference", () => {
    expect(parse("=a1")).toEqual({
      type: "REFERENCE",
      value: "A1"
    });
  });
  test("single cell reference", () => {
    expect(parse("=AA1")).toEqual({
      type: "REFERENCE",
      value: "AA1"
    });
  });
  test("large single cell reference", () => {
    expect(parse("=AA100")).toEqual({
      type: "REFERENCE",
      value: "AA100"
    });
  });
  test.skip("fixed cell", () => {
    expect(parse("=$a$1")).toEqual({
      type: "REFERENCE",
      value: "A1"
    });
  });
  test.skip("fixed row", () => {
    expect(parse("=a$1")).toEqual({
      type: "REFERENCE",
      value: "A1"
    });
  });
  test.skip("fixed column", () => {
    expect(parse("=$a1")).toEqual({
      type: "REFERENCE",
      value: "A1"
    });
  });
});

describe("parsing ranges", () => {
  test.skip("column", () => {
    expect(parse("=A:A")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "A"
      },
      right: {
        type: "REFERENCE",
        value: "A"
      }
    });
  });
  test.skip("row", () => {
    expect(parse("=1:1")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "1"
      },
      right: {
        type: "REFERENCE",
        value: "1"
      }
    });
  });
});
describe("parsing other stuff", () => {
  test("arbitrary text", () => {
    expect(parse("=undefined")).toEqual({
      type: "UNKNOWN",
      value: "UNDEFINED"
    });
  });
});
