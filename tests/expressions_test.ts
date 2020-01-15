import { tokenize, applyOffset, parse } from "../src/expressions";

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
        type: "FORMULA",
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
  test("debug formula token", () => {
    expect(tokenize("=?1")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "FORMULA",
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
        type: "BOOLEAN",
        value: true
      }
    ]);
    expect(tokenize("false")).toEqual([
      {
        start: 0,
        end: 5,
        length: 5,
        type: "BOOLEAN",
        value: false
      }
    ]);
    expect(tokenize("=AND(true,false)")).toEqual([
      {
        start: 0,
        end: 1,
        length: 1,
        type: "FORMULA",
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
        type: "BOOLEAN",
        value: true
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
        type: "BOOLEAN",
        value: false
      },
      {
        start: 15,
        end: 16,
        length: 1,
        type: "RIGHT_PAREN",
        value: ")"
      }
    ]);
  });
});

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toEqual({ debug: false, type: "FUNCALL", value: "RAND", args: [] });
  });
  test("AND", () => {
    expect(parse("=AND(true, false)")).toEqual({
      debug: false,
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false }
      ]
    });
    expect(parse("=AND(0, tRuE)")).toEqual({
      debug: false,
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true }
      ]
    });
  });
});

describe("applyOffset", () => {
  test("simple changes", () => {
    expect(applyOffset("=A1", 1, 1)).toEqual("=B2");
    expect(applyOffset("=A1 + B3", 1, 1)).toEqual("=B2 + C4");
  });

  test("can handle negative/invalid offsets", () => {
    expect(applyOffset("=B2", 0, -4)).toEqual("=#REF");
  });
});
