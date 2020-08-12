import { rangeTokenize } from "../../src/formulas/range_tokenizer";

describe("rangeTokenizer", () => {
  test("only range", () => {
    expect(rangeTokenize("=A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });
  test("operation and no range", () => {
    expect(rangeTokenize("=A3+A1")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1" },
    ]);
  });
  test("operation and range", () => {
    expect(rangeTokenize("=A3+A1:A2")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });
  test("operation and range with spaces", () => {
    expect(rangeTokenize("=A3+  A1 : A2   ")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A3" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "A1:A2" },
    ]);
  });

  test("range with spaces then operation", () => {
    expect(rangeTokenize("=  A1 : A2   +a3")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SYMBOL", value: "A1:A2" },
      { type: "OPERATOR", value: "+" },
      { type: "SYMBOL", value: "a3" },
    ]);
  });

  test("= SUM ( C4 : C5 )", () => {
    expect(rangeTokenize("= SUM ( C4 : C5 )")).toEqual([
      { type: "OPERATOR", value: "=" },
      { type: "SPACE", value: " " },
      { type: "FUNCTION", value: "SUM" },
      { type: "SPACE", value: " " },
      { type: "LEFT_PAREN", value: "(" },
      { type: "SYMBOL", value: "C4:C5" },
      { type: "RIGHT_PAREN", value: ")" },
    ]);
  });
});
