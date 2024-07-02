import { astToFormula, parse } from "../../src";
import { InvalidReferenceError } from "../../src/types/errors";

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
    expect(parse("IF(A1 > 0, 1, 2)")).toEqual({
      type: "FUNCALL",
      value: "IF",
      args: [
        {
          type: "BIN_OPERATION",
          value: ">",
          left: { type: "REFERENCE", value: "A1" },
          right: { type: "NUMBER", value: 0 },
        },
        { type: "NUMBER", value: 1 },
        { type: "NUMBER", value: 2 },
      ],
    });
  });

  test("function without a opening parenthesis", () => {
    expect(() => parse(`SUM 5`)).toThrow("Wrong function call");
  });

  test("function without a closing parenthesis", () => {
    expect(() => parse(`SUM(5`)).toThrow("Wrong function call");
  });

  test("function without argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(`)).toThrow("Wrong function call");
  });

  test("function with empty first argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(,`)).toThrow("Invalid expression");
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
      operand: { type: "NUMBER", value: 1 },
    });
    expect(parse("+1")).toEqual({
      type: "UNARY_OPERATION",
      value: "+",
      operand: { type: "NUMBER", value: 1 },
    });
  });

  test("can parse % operator", () => {
    expect(parse("1%")).toEqual({
      type: "UNARY_OPERATION",
      value: "%",
      operand: { type: "NUMBER", value: 1 },
      postfix: true,
    });
    expect(parse("100 %")).toEqual({
      type: "UNARY_OPERATION",
      value: "%",
      operand: { type: "NUMBER", value: 100 },
      postfix: true,
    });
  });

  test("can parse numeric values", () => {
    expect(parse("1")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse("1.5")).toEqual({ type: "NUMBER", value: 1.5 });
    expect(parse("1.")).toEqual({ type: "NUMBER", value: 1 });
    expect(parse(".5")).toEqual({ type: "NUMBER", value: 0.5 });
  });

  test("can parse string without ending double quotes", () => {
    expect(parse('"hello')).toEqual({ type: "STRING", value: "hello" });
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
    expect(parse("A1&A2")).toEqual({
      type: "BIN_OPERATION",
      value: "&",
      left: { type: "REFERENCE", value: "A1" },
      right: { type: "REFERENCE", value: "A2" },
    });
  });

  test("Can parse invalid references", () => {
    expect(() => parse("#REF")).toThrowError(new InvalidReferenceError().message);
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
    expect(astToFormula(parse("-(4+5)"))).toBe("-(4+5)");
    expect(astToFormula(parse("-4+5"))).toBe("-4+5");
    expect(astToFormula(parse("-SUM(1)"))).toBe("-SUM(1)");
    expect(astToFormula(parse("-(1+2)/5"))).toBe("-(1+2)/5");
    expect(astToFormula(parse("1*-(1+2)"))).toBe("1*-(1+2)");
    expect(astToFormula(parse("1%"))).toBe("1%");
    expect(astToFormula(parse("(1+2)%"))).toBe("(1+2)%");
  });
  test("Convert binary operator", () => {
    expect(astToFormula(parse("89-45"))).toBe("89-45");
    expect(astToFormula(parse("1+2+5"))).toBe("1+2+5");
    expect(astToFormula(parse("(1+2)/5"))).toBe("(1+2)/5");
    expect(astToFormula(parse("5/(1+2)"))).toBe("5/(1+2)");
    expect(astToFormula(parse("2/(1*2)"))).toBe("2/(1*2)");
    expect(astToFormula(parse("1-2+3"))).toBe("1-2+3");
    expect(astToFormula(parse("1-(2+3)"))).toBe("1-(2+3)");
    expect(astToFormula(parse("(1+2)-3"))).toBe("1+2-3");
    expect(astToFormula(parse("(1<5)+5"))).toBe("(1<5)+5");
    expect(astToFormula(parse("1*(4*2+3)"))).toBe("1*(4*2+3)");
    expect(astToFormula(parse("1*(4+2*3)"))).toBe("1*(4+2*3)");
    expect(astToFormula(parse("1*(4*2+3*9)"))).toBe("1*(4*2+3*9)");
    expect(astToFormula(parse("1*(4-(2+3))"))).toBe("1*(4-(2+3))");
    expect(astToFormula(parse("1/(2*(2+3))"))).toBe("1/(2*(2+3))");
    expect(astToFormula(parse("1/((2+3)*2)"))).toBe("1/((2+3)*2)");
    expect(astToFormula(parse("2<(1<1)"))).toBe("2<(1<1)");
    expect(astToFormula(parse("2<=(1<1)"))).toBe("2<=(1<1)");
    expect(astToFormula(parse("2>(1<1)"))).toBe("2>(1<1)");
    expect(astToFormula(parse("2>=(1<1)"))).toBe("2>=(1<1)");
    expect(astToFormula(parse("TRUE=1=1"))).toBe("TRUE=1=1");
    expect(astToFormula(parse("TRUE=(1=1)"))).toBe("TRUE=(1=1)");
  });
  test("Convert function", () => {
    expect(astToFormula(parse("SUM(5,9,8)"))).toBe("SUM(5,9,8)");
    expect(astToFormula(parse("-SUM(5,9,SUM(5,9,8))"))).toBe("-SUM(5,9,SUM(5,9,8))");
  });
  test("Convert references", () => {
    expect(astToFormula(parse("A10"))).toBe("A10");
    expect(astToFormula(parse("Sheet1!A10"))).toBe("Sheet1!A10");
    expect(astToFormula(parse("'Sheet 1'!A10"))).toBe("'Sheet 1'!A10");
    expect(astToFormula(parse("'Sheet 1'!A10:A11"))).toBe("'Sheet 1'!A10:A11");
    expect(astToFormula(parse("SUM(A1,A2)"))).toBe("SUM(A1,A2)");
    expect(astToFormula(parse("'Sheet 1'!A:B"))).toBe("'Sheet 1'!A:B");
  });
  test("Convert strings", () => {
    expect(astToFormula(parse('"R"'))).toBe('"R"');
    expect(astToFormula(parse('"R'))).toBe('"R"');
    expect(astToFormula(parse('"R\\"'))).toBe('"R\\""');
    expect(astToFormula(parse('CONCAT("R", "EM")'))).toBe('CONCAT("R","EM")');
  });
  test("Convert numbers", () => {
    expect(astToFormula(parse("5"))).toBe("5");
    expect(astToFormula(parse("5+4"))).toBe("5+4");
    expect(astToFormula(parse("+5"))).toBe("+5");
  });
});
