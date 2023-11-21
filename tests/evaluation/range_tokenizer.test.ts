import { NEWLINE } from "../../src/constants";
import { rangeTokenize } from "../../src/formulas";

describe("rangeTokenizer", () => {
  test.each(["A1:A2", "a1:a2", "A1:a2", "a1:A2"])("only range", (xc) => {
    expect(rangeTokenize(`=${xc}`)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: xc },
    ]);
  });
  test("operation and no range", () => {
    expect(rangeTokenize("=A3+A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "REFERENCE", value: "A1" },
    ]);
  });
  test("operation and range without spaces", () => {
    expect(rangeTokenize("=A3+A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "REFERENCE", value: "A1:A2" },
    ]);
  });
  test("operation and range with spaces", () => {
    expect(rangeTokenize("=A3+  A1 : A2   ")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SPACE", value: "  " },
      { type: "REFERENCE", value: "A1 : A2" },
      { type: "SPACE", value: "   " },
    ]);
  });
  test("operation and range with spaces and newlines", () => {
    expect(rangeTokenize("=A3\n+  A1 :\r A2   \r\n")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A3" },
      { type: "SPACE", value: NEWLINE },
      { type: "OPERATOR", value: "+" },
      { type: "SPACE", value: "  " },
      { type: "REFERENCE", value: "A1 :\n A2" },
      { type: "SPACE", value: "   " },
      { type: "SPACE", value: NEWLINE },
    ]);
  });

  test("range with spaces then operation", () => {
    expect(rangeTokenize("=  A1 : A2   +a3")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: "  " },
      { type: "REFERENCE", value: "A1 : A2" },
      { type: "SPACE", value: "   " },
      { type: "OPERATOR", value: "+" },
      { type: "REFERENCE", value: "a3" },
    ]);
  });

  test("= SUM ( C4 : C5 )", () => {
    expect(rangeTokenize("= SUM ( C4 : C5 )")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "SYMBOL", value: "SUM" },
      { type: "SPACE", value: " " },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SPACE", value: " " },
      { type: "REFERENCE", value: "C4 : C5" },
      { type: "SPACE", value: " " },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });

  test.each(["A:A", "A1:A", "A:A1", "$A:$A", "A:$A", "$A:A", "$B$2:$C"])("full column", (xc) => {
    expect(rangeTokenize(`=${xc}`)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: xc },
    ]);
  });

  test.each(["A:A", "A1:A"])("formula with full column", (xc) => {
    expect(rangeTokenize(`=SUM(${xc})`)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "SUM" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "REFERENCE", value: xc },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });

  test.each(["1:1", "A1:1", "1:A1", "$1:$1", "1:$1", "$1:1", "$B$1:$2"])("full row", (xc) => {
    expect(rangeTokenize(`=${xc}`)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: xc },
    ]);
  });

  test.each(["1:1", "A1:1"])("formula with full row", (xc) => {
    expect(rangeTokenize(`=SUM(${xc})`)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "SUM" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "REFERENCE", value: xc },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });

  test("wrong full column/row", () => {
    expect(rangeTokenize("1:A")).toEqual([
      { type: "NUMBER", value: "1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "A" },
    ]);
    expect(rangeTokenize("1:$A")).toEqual([
      { type: "NUMBER", value: "1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "$A" },
    ]);
    expect(rangeTokenize("A:1")).toEqual([
      { type: "SYMBOL", value: "A" },
      { type: "OPERATOR", value: ":" },
      { type: "NUMBER", value: "1" },
    ]);
    expect(rangeTokenize("A:$1")).toEqual([
      { type: "SYMBOL", value: "A" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "$1" },
    ]);
    expect(rangeTokenize("1:Sheet1!2")).toEqual([
      { type: "NUMBER", value: "1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "Sheet1!2" },
    ]);
    expect(rangeTokenize("A:Sheet1!A")).toEqual([
      { type: "SYMBOL", value: "A" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "Sheet1!A" },
    ]);
  });
});

describe("knows what is a reference and what is not", () => {
  test("lowercase cell reference", () => {
    expect(rangeTokenize("=a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "a1" },
    ]);
  });

  test("single cell reference", () => {
    expect(rangeTokenize("=AA1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "AA1" },
    ]);
  });

  test("large single cell reference", () => {
    expect(rangeTokenize("=AA100")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "AA100" },
    ]);
  });

  test("fixed cell", () => {
    expect(rangeTokenize("=$a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "$a$1" },
    ]);
  });

  test("fixed row", () => {
    expect(rangeTokenize("=a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "a$1" },
    ]);
  });

  test("fixed column", () => {
    expect(rangeTokenize("=$a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "$a1" },
    ]);
  });

  test("sheet, with lowercase cell reference", () => {
    expect(rangeTokenize("=Sheet3!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!a1" },
    ]);
  });

  test("sheet, fixed cell", () => {
    expect(rangeTokenize("=Sheet3!$a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!$a$1" },
    ]);
  });

  test("sheet, fixed row", () => {
    expect(rangeTokenize("=Sheet3!a$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!a$1" },
    ]);
  });

  test("sheet, range", () => {
    expect(rangeTokenize("=Sheet3!A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!A1:A2" },
    ]);
  });

  test("double sheet range", () => {
    expect(rangeTokenize("=Sheet3!A1:Sheet3!A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!A1" },
      { type: "OPERATOR", value: ":" },
      { type: "REFERENCE", value: "Sheet3!A2" },
    ]);
  });

  test("sheet, fixed column", () => {
    expect(rangeTokenize("=Sheet3!$a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet3!$a1" },
    ]);
  });

  test("sheet with quotes and spaces", () => {
    expect(rangeTokenize("='Sheet3'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'Sheet3'!a1" },
    ]);
    expect(rangeTokenize("='S h i t'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'S h i t'!a1" },
    ]);
    // single quotes should forbidden in sheet names
    // but I don't think it's the tokenizer responsibility
    // to know that
    expect(rangeTokenize("='S ''h i t'!a1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'S ''h i t'!a1" },
    ]);
  });

  test.each([
    "Sheet3!A:A",
    "Sheet3!1:1",
    "Sheet3!A1:1",
    "Sheet3!A1:A",
    "Sheet3!A:A1",
    "Sheet3!1:A1",
  ])("sheet, full column/row range", (xc) => {
    expect(rangeTokenize("=" + xc)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: xc },
    ]);
  });

  test("sheet, wrong full column/row range", () => {
    expect(rangeTokenize("Sheet3!A:1")).toEqual([
      { type: "SYMBOL", value: "Sheet3!A" },
      { type: "OPERATOR", value: ":" },
      { type: "NUMBER", value: "1" },
    ]);
    expect(rangeTokenize("Sheet3!1:A")).toEqual([
      { type: "SYMBOL", value: "Sheet3!1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "A" },
    ]);
    expect(rangeTokenize("Sheet3!1:Sheet3!A")).toEqual([
      { type: "SYMBOL", value: "Sheet3!1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "Sheet3!A" },
    ]);
    expect(rangeTokenize("Sheet3!1:Sheet3!A1")).toEqual([
      { type: "SYMBOL", value: "Sheet3!1" },
      { type: "OPERATOR", value: ":" },
      { type: "REFERENCE", value: "Sheet3!A1" },
    ]);
    expect(rangeTokenize("Sheet3!A:Sheet3!A")).toEqual([
      { type: "SYMBOL", value: "Sheet3!A" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "Sheet3!A" },
    ]);
    expect(rangeTokenize("Sheet3!A:Sheet3!A1")).toEqual([
      { type: "SYMBOL", value: "Sheet3!A" },
      { type: "OPERATOR", value: ":" },
      { type: "REFERENCE", value: "Sheet3!A1" },
    ]);
    expect(rangeTokenize("Sheet3!A1:Sheet3!A")).toEqual([
      { type: "REFERENCE", value: "Sheet3!A1" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "Sheet3!A" },
    ]);
  });
});

describe("tokenize ranges", () => {
  test("normal range", () => {
    expect(rangeTokenize("=A1:B2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A1:B2" },
    ]);
  });

  test("invalid range should be corrected", () => {
    expect(rangeTokenize("=B1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "B1:A2" },
    ]);
  });
});
