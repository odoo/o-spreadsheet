import { NEWLINE } from "../../src/constants";
import { tokenize } from "../../src/formulas";
import { DEFAULT_LOCALE } from "../../src/types";

describe("tokenizer", () => {
  test("simple token", () => {
    expect(tokenize("1")).toEqual([{ type: "NUMBER", value: "1" }]);
  });
  test("number with decimal token", () => {
    expect(tokenize("=1.5")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "1.5" },
    ]);
  });
  test("formula token", () => {
    expect(tokenize("=1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "1" },
    ]);
  });
  test("longer operators >=", () => {
    expect(tokenize("= >= <= <")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "OPERATOR", value: ">=" },
      { type: "SPACE", value: " " },
      { type: "OPERATOR", value: "<=" },
      { type: "SPACE", value: " " },
      { type: "OPERATOR", value: "<" },
    ]);
  });

  test("concat operator", () => {
    expect(tokenize("=&")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "OPERATOR", value: "&" },
    ]);
  });

  test("not equal operator", () => {
    expect(tokenize("=<>")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "OPERATOR", value: "<>" },
    ]);
  });

  test("percent operator", () => {
    expect(tokenize("=1%")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "1" },
      { type: "OPERATOR", value: "%" },
    ]);
    expect(tokenize("=50 %")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "50" },
      { type: "SPACE", value: " " },
      { type: "OPERATOR", value: "%" },
    ]);
  });

  test("spaces", () => {
    expect(tokenize("  ")).toEqual([{ type: "SPACE", value: " ".repeat(2) }]);
    expect(tokenize(" \t\v\f")).toEqual([{ type: "SPACE", value: " ".repeat(4) }]);
    expect(tokenize("= 50 %")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "NUMBER", value: "50" },
      { type: "SPACE", value: " " },
      { type: "OPERATOR", value: "%" },
    ]);
  });

  test("newlines", () => {
    expect(tokenize("\n\r")).toEqual([{ type: "SPACE", value: NEWLINE.repeat(2) }]);
    expect(tokenize("\r\n")).toEqual([{ type: "SPACE", value: NEWLINE.repeat(1) }]);
    expect(tokenize("\r")).toEqual([{ type: "SPACE", value: NEWLINE.repeat(1) }]);
    expect(tokenize("\n")).toEqual([{ type: "SPACE", value: NEWLINE.repeat(1) }]);
    expect(tokenize("= \n \n")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "SPACE", value: NEWLINE },
      { type: "SPACE", value: " " },
      { type: "SPACE", value: NEWLINE },
    ]);
    expect(tokenize("= 50\n%")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "NUMBER", value: "50" },
      { type: "SPACE", value: NEWLINE },
      { type: "OPERATOR", value: "%" },
    ]);
    expect(tokenize("= \n5")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "SPACE", value: NEWLINE },
      { type: "NUMBER", value: "5" },
    ]);
  });

  test("can tokenize various number expressions", () => {
    expect(tokenize("1.1")).toEqual([{ type: "NUMBER", value: "1.1" }]);
    expect(tokenize("1e3")).toEqual([{ type: "NUMBER", value: "1e3" }]);
  });

  test("debug formula token", () => {
    expect(tokenize("=?1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "DEBUGGER", value: "?" },
      { type: "NUMBER", value: "1" },
    ]);
  });

  test("#REF formula token", () => {
    expect(tokenize("#REF")).toEqual([{ type: "INVALID_REFERENCE", value: "#REF" }]);
    expect(tokenize("=#REF+1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "INVALID_REFERENCE", value: "#REF" },
      { type: "OPERATOR", value: "+" },
      { type: "NUMBER", value: "1" },
    ]);
  });

  test("String", () => {
    expect(tokenize('"hello"')).toEqual([{ type: "STRING", value: '"hello"' }]);
    expect(tokenize("'hello'")).toEqual([{ type: "SYMBOL", value: "'hello'" }]);
    expect(tokenize("'hello")).toEqual([{ type: "UNKNOWN", value: "'hello" }]);
    expect(tokenize('"he\\"l\\"lo"')).toEqual([{ type: "STRING", value: '"he\\"l\\"lo"' }]);
    expect(tokenize("\"hel'l'o\"")).toEqual([{ type: "STRING", value: "\"hel'l'o\"" }]);
    expect(tokenize('"hello""test"')).toEqual([
      { type: "STRING", value: '"hello"' },
      { type: "STRING", value: '"test"' },
    ]);
  });

  test.each(['"hello', `"hello'`, '"hello\\"'])("String without closing double quotes", (str) => {
    expect(tokenize(str)).toEqual([{ type: "STRING", value: str }]);
  });

  test("Function token", () => {
    expect(tokenize("SUM")).toEqual([{ type: "SYMBOL", value: "SUM" }]);
    expect(tokenize("RAND")).toEqual([{ type: "SYMBOL", value: "RAND" }]);
    expect(tokenize("rand")).toEqual([{ type: "SYMBOL", value: "rand" }]);
  });

  test("Function token with point", () => {
    expect(tokenize("CEILING.MATH")).toEqual([{ type: "SYMBOL", value: "CEILING.MATH" }]);
    expect(tokenize("ceiling.math")).toEqual([{ type: "SYMBOL", value: "ceiling.math" }]);
  });

  test("Boolean", () => {
    expect(tokenize("true")).toEqual([{ type: "SYMBOL", value: "true" }]);
    expect(tokenize("false")).toEqual([
      {
        type: "SYMBOL",
        value: "false",
      },
    ]);
    expect(tokenize("TRUE")).toEqual([{ type: "SYMBOL", value: "TRUE" }]);
    expect(tokenize("FALSE")).toEqual([
      {
        type: "SYMBOL",
        value: "FALSE",
      },
    ]);
    expect(tokenize("TrUe")).toEqual([{ type: "SYMBOL", value: "TrUe" }]);
    expect(tokenize("FalSe")).toEqual([
      {
        type: "SYMBOL",
        value: "FalSe",
      },
    ]);
    expect(tokenize("=AND(true,false)")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "AND" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SYMBOL", value: "true" },
      { type: "ARG_SEPARATOR", value: "," },
      { type: "SYMBOL", value: "false" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
    expect(tokenize("=trueee")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "trueee" },
    ]);
  });

  test("references", () => {
    expect(tokenize("=A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "A1" },
    ]);
    expect(tokenize("= A1 ")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "REFERENCE", value: "A1" },
      { type: "SPACE", value: " " },
    ]);
  });

  test("$references", () => {
    expect(tokenize("=$A$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "$A$1" },
    ]);
    expect(tokenize("=C$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "C$1" },
    ]);
    expect(tokenize("=$C1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "$C1" },
    ]);
  });

  test("reference and sheets", () => {
    expect(tokenize("=Sheet1!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet1!A1" },
    ]);
    expect(tokenize("=Sheet1!A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet1!A1" },
      { type: "OPERATOR", value: ":" },
      { type: "REFERENCE", value: "A2" },
    ]);
    expect(tokenize("=Sheet1!A:A")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet1!A" },
      { type: "OPERATOR", value: ":" },
      { type: "SYMBOL", value: "A" },
    ]);
    expect(tokenize("='Sheet1'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'Sheet1'!A1" },
    ]);
    expect(tokenize("='Aryl Nibor Xela Nalim'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'Aryl Nibor Xela Nalim'!A1" },
    ]);
    expect(tokenize("=Sheet1!$A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet1!$A1" },
    ]);
    expect(tokenize("=Sheet1!A$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "Sheet1!A$1" },
    ]);
    expect(tokenize("='a '' b'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'a '' b'!A1" },
    ]);
    expect(tokenize("=1name!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "1name!A1" },
    ]);
    expect(tokenize("=123!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "123!A1" },
    ]);
    expect(tokenize("='1name'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'1name'!A1" },
    ]);
    expect(tokenize("='123'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "REFERENCE", value: "'123'!A1" },
    ]);
  });

  test("wrong references", () => {
    // note the missing ' in the following test:
    expect(tokenize("='Sheet1!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "UNKNOWN", value: "'Sheet1!A1" },
    ]);
    expect(tokenize("=!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "!A1" },
    ]);
    expect(tokenize("=''!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "''!A1" },
    ]);
    expect(tokenize("=A1A")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1A" },
    ]);
  });

  test("Unknown characters", () => {
    expect(tokenize("=ù4")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "UNKNOWN", value: "ù" },
      { type: "NUMBER", value: "4" },
    ]);
  });
});

describe("Localized tokenizer", () => {
  test("Can change decimal separator", () => {
    const locale = { ...DEFAULT_LOCALE, decimalSeparator: "¤" };
    expect(tokenize("=SUM(5¤9, 8¤1)", locale)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "SUM" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "NUMBER", value: "5¤9" },
      { type: "ARG_SEPARATOR", value: "," },
      { type: "SPACE", value: " " },
      { type: "NUMBER", value: "8¤1" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });

  test("Can change argument separator", () => {
    const locale = { ...DEFAULT_LOCALE, formulaArgSeparator: "空" };
    expect(tokenize("=SUM(5空 8.5)", locale)).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "SUM" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "NUMBER", value: "5" },
      { type: "ARG_SEPARATOR", value: "空" },
      { type: "SPACE", value: " " },
      { type: "NUMBER", value: "8.5" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });
});
