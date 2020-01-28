import { tokenize } from "../../src/formulas";

describe("tokenizer", () => {
  test("simple token", () => {
    expect(tokenize("1")).toEqual([{ type: "NUMBER", value: 1 }]);
  });
  test("formula token", () => {
    expect(tokenize("=1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "NUMBER", value: 1 }
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
      { type: "NUMBER", value: 1 }
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
});
