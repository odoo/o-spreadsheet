import { rangeTokenize } from "../../src/formulas";

describe("rangeTokenizer", () => {
  test("only range", () => {
    expect(rangeTokenize("=A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });
  test("operation and no range", () => {
    expect(rangeTokenize("=A3+A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1" },
    ]);
  });
  test("operation and range", () => {
    expect(rangeTokenize("=A3+A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });
  test("operation and range with spaces", () => {
    expect(rangeTokenize("=A3+  A1 : A2   ")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });

  test("range with spaces then operation", () => {
    expect(rangeTokenize("=  A1 : A2   +a3")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1:A2" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "a3" },
    ]);
  });

  test("= SUM ( C4 : C5 )", () => {
    expect(rangeTokenize("= SUM ( C4 : C5 )")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "FUNCTION", value: "SUM" },
      { type: "SPACE", value: " " },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SYMBOL", value: "C4:C5" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });
});

describe("knows what's a reference and what's not", () => {
  test("lowercase cell reference", () => {
    expect(rangeTokenize("=a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "a1" },
    ]);
  });

  test("single cell reference", () => {
    expect(rangeTokenize("=AA1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "AA1" },
    ]);
  });

  test("large single cell reference", () => {
    expect(rangeTokenize("=AA100")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "AA100" },
    ]);
  });

  test("fixed cell", () => {
    expect(rangeTokenize("=$a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$a$1" },
    ]);
  });

  test("fixed row", () => {
    expect(rangeTokenize("=a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "a$1" },
    ]);
  });

  test("fixed column", () => {
    expect(rangeTokenize("=$a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$a1" },
    ]);
  });

  test("sheet, with lowercase cell reference", () => {
    expect(rangeTokenize("=Sheet3!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet3!a1" },
    ]);
  });

  test("sheet, fixed cell", () => {
    expect(rangeTokenize("=Sheet3!$a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet3!$a$1" },
    ]);
  });

  test("sheet, fixed row", () => {
    expect(rangeTokenize("=Sheet3!a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet3!a$1" },
    ]);
  });

  test("sheet, fixed column", () => {
    expect(rangeTokenize("=Sheet3!$a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet3!$a1" },
    ]);
  });

  test("sheet with quotes and spaces", () => {
    expect(rangeTokenize("='Sheet3'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'Sheet3'!a1" },
    ]);
    expect(rangeTokenize("='S h i t'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'S h i t'!a1" },
    ]);
    expect(rangeTokenize("='S ''h i t'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'S ''h i t'!a1" },
    ]);
  });
});

describe("tokenize ranges", () => {
  test("normal range", () => {
    expect(rangeTokenize("=A1:B2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1:B2" },
    ]);
  });

  test("invalid range should be corrected", () => {
    expect(rangeTokenize("=B1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "B1:A2" },
    ]);
  });

  test.skip("column", () => {
    expect(rangeTokenize("=A:A")).toEqual({
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
    expect(rangeTokenize("=1:1")).toEqual({
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
