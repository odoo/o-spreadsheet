import { astToFormula, normalize } from "../../src";
import { parse } from "../../src/formulas";

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

  test("function without a opening parenthesis", () => {
    expect(() => parse(`SUM 5`)).toThrow("wrong function call");
  });

  test("function without a closing parenthesis", () => {
    expect(() => parse(`SUM(5`)).toThrow("wrong function call");
  });

  test("function without argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(`)).toThrow("wrong function call");
  });

  test("function with empty first argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(,`)).toThrow("invalid expression");
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

  test("can parse string without ending double quotes", () => {
    expect(parse('"hello')).toEqual({ type: "STRING", value: '"hello' });
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

  test("can parse async functions", () => {
    expect(parse("=WAIT(12)")).toEqual({
      type: "ASYNC_FUNCALL",
      value: "WAIT",
      args: [{ type: "NUMBER", value: 12 }],
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
    expect(astToFormula(parse("1"), [])).toBe("1");
  });
  test("Convert string", () => {
    expect(astToFormula(parse(`"hello"`), [])).toBe(`"hello"`);
  });
  test("Convert boolean", () => {
    expect(astToFormula(parse("TRUE"), [])).toBe("TRUE");
    expect(astToFormula(parse("FALSE"), [])).toBe("FALSE");
  });
  test("Convert unary operator", () => {
    expect(astToFormula(parse("-45"), [])).toBe("-45");
    expect(astToFormula(parse("+45"), [])).toBe("+45");
  });
  test("Convert binary operator", () => {
    expect(astToFormula(parse("89-45"), [])).toBe("89-45");
  });
  test("Convert function", () => {
    expect(astToFormula(parse("SUM(5,9,8)"), [])).toBe("SUM(5,9,8)");
    expect(astToFormula(parse("-SUM(5,9,SUM(5,9,8))"), [])).toBe("-SUM(5,9,SUM(5,9,8))");
  });
  test("Convert normalized references", () => {
    let { text, dependencies } = normalize("A10");
    expect(astToFormula(parse(text), dependencies)).toBe("A10");
    ({ text, dependencies } = normalize("Sheet1!A10"));
    expect(astToFormula(parse(text), dependencies)).toBe("Sheet1!A10");
    ({ text, dependencies } = normalize("'Sheet 1'!A10"));
    expect(astToFormula(parse(text), dependencies)).toBe("'Sheet 1'!A10");
    ({ text, dependencies } = normalize("'Sheet 1'!A10:A11"));
    expect(astToFormula(parse(text), dependencies)).toBe("'Sheet 1'!A10:A11");
    ({ text, dependencies } = normalize("SUM(A1,A2)"));
    expect(astToFormula(parse(text), dependencies)).toBe("SUM(A1,A2)");
  });
  test("Convert normalized strings", () => {
    let { text, dependencies } = normalize('"R"');
    expect(astToFormula(parse(text), dependencies)).toBe('"R"');
    ({ text, dependencies } = normalize('CONCAT("R", "EM")'));
    expect(astToFormula(parse(text), dependencies)).toBe('CONCAT("R","EM")');
  });
  test("Convert normalized numbers", () => {
    let { text, dependencies } = normalize("5");
    expect(astToFormula(parse(text), dependencies)).toBe("5");
    ({ text, dependencies } = normalize("5+4"));
    expect(astToFormula(parse(text), dependencies)).toBe("5+4");
    ({ text, dependencies } = normalize("+5"));
    expect(astToFormula(parse(text), dependencies)).toBe("+5");
  });
});
