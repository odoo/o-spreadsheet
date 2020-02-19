import { tokenize } from "../../src/formulas";

describe("tokenizer", () => {
  test("simple token", () => {
    expect(tokenize("1")).toEqual([{ type: "NUMBER", value: "1" }]);
  });
  test("number with decimal token", () => {
    expect(tokenize("=1.5")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "1.5" }
    ]);
  });
  test("formula token", () => {
    expect(tokenize("=1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: "1" }
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
      { type: "OPERATOR", value: "<" }
    ]);
  });

  test("debug formula token", () => {
    expect(tokenize("=?1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "DEBUGGER", value: "?" },
      { type: "NUMBER", value: "1" }
    ]);
  });
  test("String", () => {
    expect(tokenize("'hello'")).toEqual([{ type: "STRING", value: "'hello'" }]);
    expect(tokenize("'he\\'l\\'lo'")).toEqual([{ type: "STRING", value: "'he\\'l\\'lo'" }]);
    expect(tokenize("'hel\"l\"o'")).toEqual([{ type: "STRING", value: "'hel\"l\"o'" }]);
    expect(tokenize("'hello''test'")).toEqual([
      { type: "STRING", value: "'hello'" },
      { type: "STRING", value: "'test'" }
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
        value: "false"
      }
    ]);
    expect(tokenize("=AND(true,false)")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "FUNCTION", value: "AND" },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SYMBOL", value: "true" },
      { type: "COMMA", value: "," },
      { type: "SYMBOL", value: "false" },
      { type: "RIGHT_PAREN", value: ")" }
    ]);
    expect(tokenize("=trueee")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "trueee" }
    ]);
  });
  test("$references", () => {
    expect(tokenize("=$A$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$A$1" }
    ]);
    expect(tokenize("=C$1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "C$1" }
    ]);
    expect(tokenize("=$C1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "$C1" }
    ]);
  });
  test("Unknown characters", () => {
    expect(tokenize("=ù4")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "UNKNOWN", value: "ù" },
      { type: "NUMBER", value: "4" }
    ]);
  });
});
