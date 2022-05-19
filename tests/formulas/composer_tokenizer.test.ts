import { composerTokenize } from "../../src/formulas/composer_tokenizer";

describe("composerTokenizer", () => {
  describe.each(["A1:B1", "A:A", "1:1", "A1:A", "B3:4"])("tokenise ranges", (xc) => {
    test(`range ${xc}`, () => {
      expect(composerTokenize("=" + xc)).toEqual([
        { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
        { start: 1, end: 1 + xc.length, length: xc.length, type: "REFERENCE", value: xc },
      ]);
    });
  });
  test("operation and no range", () => {
    expect(composerTokenize("=A3+A1")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+" },
      { start: 4, end: 6, length: 2, type: "REFERENCE", value: "A1" },
    ]);
  });
  test("operation and range", () => {
    expect(composerTokenize("=A3+A1:A2")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+" },
      { start: 4, end: 9, length: 5, type: "REFERENCE", value: "A1:A2" },
    ]);
  });

  test("unbound range with spaces", () => {
    expect(composerTokenize("= A : A ")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 8, length: 7, type: "REFERENCE", value: " A : A " },
    ]);
  });

  test("operation and range with spaces", () => {
    expect(composerTokenize("=A3+  A1 : A2   ")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+" },
      { start: 4, end: 16, length: 12, type: "REFERENCE", value: "  A1 : A2   " },
    ]);
  });

  test("range with spaces then operation", () => {
    expect(composerTokenize("=  A1 : A2   +a3")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 13, length: 12, type: "REFERENCE", value: "  A1 : A2   " },
      { start: 13, end: 14, length: 1, type: "OPERATOR", value: "+" },
      { start: 14, end: 16, length: 2, type: "REFERENCE", value: "a3" },
    ]);
  }); //"= SUM ( C4 : C5 )"

  test("= SUM ( C4 : C5 )", () => {
    expect(composerTokenize("= SUM ( C4 : C5 )")).toMatchSnapshot();
  });
});

describe("composerTokenizer base tests", () => {
  test("simple token", () => {
    expect(composerTokenize("1")).toEqual([
      { start: 0, end: 1, length: 1, type: "NUMBER", value: "1" },
    ]);
  });
  test("formula token", () => {
    expect(composerTokenize("=1")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 2, length: 1, type: "NUMBER", value: "1" },
    ]);
    expect(composerTokenize("=SUM(1 ,(1+2),ADD (2, 3),4)")).toMatchSnapshot();
  });
  test("longer operators >=", () => {
    expect(composerTokenize("= >= <= <")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 2, length: 1, type: "SPACE", value: " " },
      { start: 2, end: 4, length: 2, type: "OPERATOR", value: ">=" },
      { start: 4, end: 5, length: 1, type: "SPACE", value: " " },
      { start: 5, end: 7, length: 2, type: "OPERATOR", value: "<=" },
      { start: 7, end: 8, length: 1, type: "SPACE", value: " " },
      { start: 8, end: 9, length: 1, type: "OPERATOR", value: "<" },
    ]);
  });

  test("debug formula token", () => {
    expect(composerTokenize("=?1")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 2, length: 1, type: "DEBUGGER", value: "?" },
      { start: 2, end: 3, length: 1, type: "NUMBER", value: "1" },
    ]);
  });
  test("String", () => {
    expect(composerTokenize('"hello"')).toEqual([
      { start: 0, end: 7, length: 7, type: "STRING", value: '"hello"' },
    ]);
    //expect(() => composerTokenize("'hello'")).toThrowError("kikou");
    expect(composerTokenize("'hello'")).toEqual([
      { start: 0, end: 7, length: 7, type: "SYMBOL", value: "'hello'" },
    ]);
    expect(composerTokenize('"he\\"l\\"lo"')).toEqual([
      { start: 0, end: 11, length: 11, type: "STRING", value: '"he\\"l\\"lo"' },
    ]);
    expect(composerTokenize("\"hel'l'o\"")).toEqual([
      { start: 0, end: 9, length: 9, type: "STRING", value: "\"hel'l'o\"" },
    ]);
    expect(composerTokenize('"hello""test"')).toEqual([
      { start: 0, end: 7, length: 7, type: "STRING", value: '"hello"' },
      { start: 7, end: 13, length: 6, type: "STRING", value: '"test"' },
    ]);
  });

  test("Function token", () => {
    expect(composerTokenize("SUM")).toEqual([
      { start: 0, end: 3, length: 3, type: "FUNCTION", value: "SUM" },
    ]);
    expect(composerTokenize("RAND")).toEqual([
      { start: 0, end: 4, length: 4, type: "FUNCTION", value: "RAND" },
    ]);
  });
  test("Boolean", () => {
    expect(composerTokenize("true")).toEqual([
      { start: 0, end: 4, length: 4, type: "SYMBOL", value: "true" },
    ]);
    expect(composerTokenize("false")).toEqual([
      { start: 0, end: 5, length: 5, type: "SYMBOL", value: "false" },
    ]);
    expect(composerTokenize("=AND(true,false)")).toMatchSnapshot();
    expect(composerTokenize("=trueee")).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=" },
      { start: 1, end: 7, length: 6, type: "SYMBOL", value: "trueee" },
    ]);
  });
});
