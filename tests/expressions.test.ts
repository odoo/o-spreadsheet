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
