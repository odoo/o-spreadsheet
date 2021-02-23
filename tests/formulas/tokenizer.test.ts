import { tokenize } from "../../src/formulas";

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

  test("can tokenize various number expressions", () => {
    expect(tokenize("1%")).toEqual([{ type: "NUMBER", value: "1%" }]);
    expect(tokenize("1 %")).toEqual([{ type: "NUMBER", value: "1 %" }]);
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

  test("Function token", () => {
    expect(tokenize("SUM")).toEqual([{ type: "FUNCTION", value: "SUM" }]);
    expect(tokenize("RAND")).toEqual([{ type: "FUNCTION", value: "RAND" }]);
    expect(tokenize("rand")).toEqual([{ type: "FUNCTION", value: "rand" }]);
  });

  test("Function token with point", () => {
    expect(tokenize("CEILING.MATH")).toEqual([{ type: "FUNCTION", value: "CEILING.MATH" }]);
    expect(tokenize("ceiling.math")).toEqual([{ type: "FUNCTION", value: "ceiling.math" }]);
  });

  test("Boolean", () => {
    expect(tokenize("true")).toEqual([{ type: "SYMBOL", value: "true" }]);
    expect(tokenize("false")).toEqual([
      {
        type: "SYMBOL",
        value: "false",
      },
    ]);
    expect(tokenize("=AND(true,false)")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "FUNCTION", value: "AND" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SYMBOL", value: "true" },
      { type: "COMMA", value: "," },
      { type: "SYMBOL", value: "false" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
    expect(tokenize("=trueee")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "trueee" },
    ]);
  });

  test("$references", () => {
    expect(tokenize("=$A$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$A$1" },
    ]);
    expect(tokenize("=C$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "C$1" },
    ]);
    expect(tokenize("=$C1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$C1" },
    ]);
  });

  test("reference and sheets", () => {
    expect(tokenize("=Sheet1!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet1!A1" },
    ]);
    expect(tokenize("='Sheet1'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'Sheet1'!A1" },
    ]);
    expect(tokenize("='Aryl Nibor Xela Nalim'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'Aryl Nibor Xela Nalim'!A1" },
    ]);
    expect(tokenize("=Sheet1!$A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet1!$A1" },
    ]);
    expect(tokenize("=Sheet1!A$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "Sheet1!A$1" },
    ]);
    expect(tokenize("='a '' b'!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "'a '' b'!A1" },
    ]);

    // note the missing ' in the following test:
    expect(tokenize("='Sheet1!A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "UNKNOWN", value: "'Sheet1!A1" },
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
