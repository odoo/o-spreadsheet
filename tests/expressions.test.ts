import { tokenize, applyOffset } from "../src/expressions";

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
