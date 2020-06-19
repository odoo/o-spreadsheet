import { parse } from "../../src/formulas";

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toEqual({ type: "FUNCALL", value: "RAND", args: [] });
  });

  test("can parse a function call with one argument", () => {
    expect(parse("SUM(1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [{ type: "NUMBER", value: 1 }],
    });
  });

  test("can parse a function call with sub expressions as argument", () => {
    expect(parse("IF(A1 > 0, 1, 2)")).toEqual({
      type: "FUNCALL",
      value: "IF",
      args: [
        {
          type: "BIN_OPERATION",
          value: ">",
          left: { type: "REFERENCE", value: "A1" },
          right: { type: "NUMBER", value: 0 },
        },
        { type: "NUMBER", value: 1 },
        { type: "NUMBER", value: 2 },
      ],
    });
  });

  test("add a unknown token for empty arguments", () => {
    expect(parse("SUM(1,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
    expect(parse("SUM(,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,,,1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
  });

  test("can parse unary operations", () => {
    expect(parse("-1")).toEqual({
      type: "UNARY_OPERATION",
      value: "-",
      right: { type: "NUMBER", value: 1 },
    });
  });
  test("can parse numeric values", () => {
    expect(parse("1")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse("1.5")).toEqual({ type: "NUMBER", value: 1.5 });
    expect(parse("1.")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse(".5")).toEqual({ type: "NUMBER", value: 0.5 });
  });

  test("can parse number expressed as percent", () => {
    expect(parse("1%")).toEqual({ type: "NUMBER", value: 0.01 });
    expect(parse("100%")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse("50.0%")).toEqual({ type: "NUMBER", value: 0.5 });
  });

  test("can parse binary operations", () => {
    expect(parse("2-3")).toEqual({
      type: "BIN_OPERATION",
      value: "-",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 3 },
    });
  });

  test("can parse concat operator", () => {
    expect(parse("A1&A2")).toEqual({
      type: "BIN_OPERATION",
      value: "&",
      left: { type: "REFERENCE", value: "A1" },
      right: { type: "REFERENCE", value: "A2" },
    });
  });

  test("AND", () => {
    expect(parse("=AND(true, false)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false },
      ],
    });
    expect(parse("=AND(0, tRuE)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true },
      ],
    });
  });

  test("can parse async functions", () => {
    expect(parse("=WAIT(12)")).toEqual({
      type: "ASYNC_FUNCALL",
      value: "WAIT",
      args: [{ type: "NUMBER", value: 12 }],
    });
  });
});

describe("knows what's a reference and what's not", () => {
  test("lowercase cell reference", () => {
    expect(parse("=a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
    });
  });

  test("single cell reference", () => {
    expect(parse("=AA1")).toEqual({
      type: "REFERENCE",
      value: "AA1",
    });
  });

  test("large single cell reference", () => {
    expect(parse("=AA100")).toEqual({
      type: "REFERENCE",
      value: "AA100",
    });
  });

  test("fixed cell", () => {
    expect(parse("=$a$1")).toEqual({
      type: "REFERENCE",
      value: "A1",
    });
  });

  test("fixed row", () => {
    expect(parse("=a$1")).toEqual({
      type: "REFERENCE",
      value: "A1",
    });
  });

  test("fixed column", () => {
    expect(parse("=$a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
    });
  });

  test("sheet, with lowercase cell reference", () => {
    expect(parse("=Sheet3!a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "Sheet3",
    });
  });

  test("sheet, fixed cell", () => {
    expect(parse("=Sheet3!$a$1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "Sheet3",
    });
  });

  test("sheet, fixed row", () => {
    expect(parse("=Sheet3!a$1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "Sheet3",
    });
  });

  test("sheet, fixed column", () => {
    expect(parse("=Sheet3!$a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "Sheet3",
    });
  });

  test("sheet with quotes and spaces", () => {
    expect(parse("='Sheet3'!a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "Sheet3",
    });
    expect(parse("='S h i t'!a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "S h i t",
    });
    expect(parse("='S ''h i t'!a1")).toEqual({
      type: "REFERENCE",
      value: "A1",
      sheet: "S 'h i t",
    });
  });
});

describe("parsing ranges", () => {
  test("normal range", () => {
    expect(parse("=A1:B2")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "A1",
      },
      right: {
        type: "REFERENCE",
        value: "B2",
      },
    });
  });

  test("invalid range should be corrected", () => {
    expect(parse("=B1:A2")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "A1",
      },
      right: {
        type: "REFERENCE",
        value: "B2",
      },
    });
  });

  test.skip("column", () => {
    expect(parse("=A:A")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "A",
      },
      right: {
        type: "REFERENCE",
        value: "A",
      },
    });
  });
  test.skip("row", () => {
    expect(parse("=1:1")).toEqual({
      type: "BIN_OPERATION",
      value: ":",
      left: {
        type: "REFERENCE",
        value: "1",
      },
      right: {
        type: "REFERENCE",
        value: "1",
      },
    });
  });
});
describe("parsing other stuff", () => {
  test("arbitrary text", () => {
    expect(() => parse("=undefined")).toThrow();
  });
});
