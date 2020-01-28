import { tokenize } from "../../src/formulas";

describe("tokenizer", () => {
  test("simple token", () => {
    expect(tokenize("1")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "NUMBER",
        value: 1
      }
    ]);
  });
  test("formula token", () => {
    expect(tokenize("=1")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "OPERATOR",
        value: "="
      },
      {
        start: 1,
        end: 2,
        length: 1,
        type: "NUMBER",
        value: 1
      }
    ]);
  });
  test("longer operators >=", () => {
    expect(tokenize("= >= <= <")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "OPERATOR",
        value: "="
      },
      {
        start: 1,
        end: 2,
        length: 1,
        type: "SPACE",
        value: " "
      },
      {
        start: 2,
        end: 4,
        length: 2,
        type: "OPERATOR",
        value: ">="
      },
      {
        start: 4,
        end: 5,
        length: 1,
        type: "SPACE",
        value: " "
      },
      {
        start: 5,
        end: 7,
        length: 2,
        type: "OPERATOR",
        value: "<="
      },
      {
        start: 7,
        end: 8,
        length: 1,
        type: "SPACE",
        value: " "
      },
      {
        start: 8,
        end: 9,
        length: 1,
        type: "OPERATOR",
        value: "<"
      }
    ]);
  });

  test("debug formula token", () => {
    expect(tokenize("=?1")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "OPERATOR",
        value: "="
      },
      {
        start: 1,
        end: 2,
        length: 1,
        type: "DEBUGGER",
        value: "?"
      },
      {
        start: 2,
        end: 3,
        length: 1,
        type: "NUMBER",
        value: 1
      }
    ]);
  });
  test("String", () => {
    expect(tokenize("'hello'")).toEqual([
      {
        start: 0,
        end: 7,
        length: 7,
        type: "STRING",
        value: "hello"
      }
    ]);
    expect(tokenize("'he\\'l\\'lo'")).toEqual([
      {
        start: 0,
        end: 11,
        length: 11,
        type: "STRING",
        value: "he\\'l\\'lo"
      }
    ]);
    expect(tokenize("'hel\"l\"o'")).toEqual([
      {
        start: 0,
        end: 9,
        length: 9,
        type: "STRING",
        value: 'hel"l"o'
      }
    ]);
    expect(tokenize("'hello''test'")).toEqual([
      {
        start: 0,
        end: 7,
        length: 7,
        type: "STRING",
        value: "hello"
      },
      {
        start: 7,
        end: 13,
        length: 6,
        type: "STRING",
        value: "test"
      }
    ]);
  });

  test("Function token", () => {
    expect(tokenize("SUM")).toEqual([
      {
        start: 0,
        end: 3,
        length: 3,
        type: "FUNCTION",
        value: "SUM"
      }
    ]);
    expect(tokenize("RAND")).toEqual([
      {
        start: 0,
        end: 4,
        length: 4,
        type: "FUNCTION",
        value: "RAND"
      }
    ]);
  });
  test("Boolean", () => {
    expect(tokenize("true")).toEqual([
      {
        start: 0,
        end: 4,
        length: 4,
        type: "SYMBOL",
        value: "TRUE"
      }
    ]);
    expect(tokenize("false")).toEqual([
      {
        start: 0,
        end: 5,
        length: 5,
        type: "SYMBOL",
        value: "FALSE"
      }
    ]);
    expect(tokenize("=AND(true,false)")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "OPERATOR",
        value: "="
      },
      {
        start: 1,
        end: 4,
        length: 3,
        type: "FUNCTION",
        value: "AND"
      },
      {
        start: 4,
        end: 5,
        length: 1,
        type: "LEFT_PAREN",
        value: "("
      },
      {
        start: 5,
        end: 9,
        length: 4,
        type: "SYMBOL",
        value: "TRUE"
      },
      {
        start: 9,
        end: 10,
        length: 1,
        type: "COMMA",
        value: ","
      },
      {
        start: 10,
        end: 15,
        length: 5,
        type: "SYMBOL",
        value: "FALSE"
      },
      {
        start: 15,
        end: 16,
        length: 1,
        type: "RIGHT_PAREN",
        value: ")"
      }
    ]);
    expect(tokenize("=trueee")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "OPERATOR",
        value: "="
      },
      {
        start: 1,
        end: 7,
        length: 6,
        type: "SYMBOL",
        value: "TRUEEE"
      }
    ]);
  });
});
