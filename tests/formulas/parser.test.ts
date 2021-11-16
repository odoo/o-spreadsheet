import { astToFormula } from "../../src";
import { normalize, parse } from "../../src/formulas";

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toEqual({ type: "FUNCALL", value: "RAND", args: [] });
  });

  test("can parse a function call with one argument", () => {
    expect(parse("SUM(1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [{ type: "NUMBER", value: 1 }],
    });
  });

  test("can parse a function call with sub expressions as argument", () => {
    expect(parse("IF(|0| > 0, 1, 2)")).toEqual({
      type: "FUNCALL",
      value: "IF",
      args: [
        {
          type: "BIN_OPERATION",
          value: ">",
          left: { type: "REFERENCE", value: 0 },
          right: { type: "NUMBER", value: 0 },
        },
        { type: "NUMBER", value: 1 },
        { type: "NUMBER", value: 2 },
      ],
    });
  });

  test("add a unknown token for empty arguments", () => {
    expect(parse("SUM(1,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
    expect(parse("SUM(,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,,)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
      ],
    });
    expect(parse("SUM(,,,1)")).toEqual({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "UNKNOWN", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
  });

  test("can parse unary operations", () => {
    expect(parse("-1")).toEqual({
      type: "UNARY_OPERATION",
      value: "-",
      right: { type: "NUMBER", value: 1 },
    });
    expect(parse("+1")).toEqual({
      type: "UNARY_OPERATION",
      value: "+",
      right: { type: "NUMBER", value: 1 },
    });
  });
  test("can parse numeric values", () => {
    expect(parse("1")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse("1.5")).toEqual({ type: "NUMBER", value: 1.5 });
    expect(parse("1.")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse(".5")).toEqual({ type: "NUMBER", value: 0.5 });
  });

  test("can parse number expressed as percent", () => {
    expect(parse("1%")).toEqual({ type: "NUMBER", value: 0.01 });
    expect(parse("100%")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse("50.0%")).toEqual({ type: "NUMBER", value: 0.5 });
  });

  test("can parse binary operations", () => {
    expect(parse("2-3")).toEqual({
      type: "BIN_OPERATION",
      value: "-",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 3 },
    });
  });

  test("can parse concat operator", () => {
    expect(parse("|0|&|1|")).toEqual({
      type: "BIN_OPERATION",
      value: "&",
      left: { type: "REFERENCE", value: 0 },
      right: { type: "REFERENCE", value: 1 },
    });
  });

  test("Can parse invalid references", () => {
    expect(() => parse("#REF")).toThrowError("Invalid reference");
  });

  test("AND", () => {
    expect(parse("=AND(true, false)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false },
      ],
    });
    expect(parse("=AND(0, tRuE)")).toEqual({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true },
      ],
    });
  });
});

describe("parsing other stuff", () => {
  test("arbitrary text", () => {
    expect(() => parse("=undefined")).toThrow();
  });
});
describe("Converting AST to string", () => {
  test("Convert number", () => {
    expect(astToFormula(parse("1"))).toBe("1");
  });
  test("Convert string", () => {
    expect(astToFormula(parse(`"hello"`))).toBe(`"hello"`);
  });
  test("Convert boolean", () => {
    expect(astToFormula(parse("TRUE"))).toBe("TRUE");
    expect(astToFormula(parse("FALSE"))).toBe("FALSE");
  });
  test("Convert unary operator", () => {
    expect(astToFormula(parse("-45"))).toBe("-45");
    expect(astToFormula(parse("+45"))).toBe("+45");
  });
  test("Convert binary operator", () => {
    expect(astToFormula(parse("89-45"))).toBe("89-45");
  });
  test("Convert reference", () => {
    expect(astToFormula(parse(normalize("A10").text))).toBe("|0|");
    expect(astToFormula(parse(normalize("$A$10").text))).toBe("|0|");
    expect(astToFormula(parse(normalize("Sheet1!A10").text))).toBe("|0|");
  });
  test("Convert function", () => {
    expect(astToFormula(parse("SUM(5,9,8)"))).toBe("SUM(5,9,8)");
    expect(astToFormula(parse("-SUM(5,9,SUM(5,9,8))"))).toBe("-SUM(5,9,SUM(5,9,8))");
  });
});
