import { astToFormula } from "@odoo/o-spreadsheet-engine/formulas/formula_formatter";
import { CellErrorType, parse, tokenize } from "../../src";

describe("parser", () => {
  test("can parse a function call with no argument", () => {
    expect(parse("RAND()")).toMatchObject({ type: "FUNCALL", value: "RAND", args: [] });
  });

  test("cannot parse a quoted function call", () => {
    expect(() => parse("'RAND'()")).toThrow("Invalid expression");
  });

  test("can parse a function call with one argument", () => {
    expect(parse("SUM(1)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [{ type: "NUMBER", value: 1 }],
    });
  });

  test("can parse a function call with sub expressions as argument", () => {
    expect(parse("IF(A1 > 0, 1, 2)")).toMatchObject({
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
    expect(() => parse(`SUM 5`)).toThrow("Invalid expression");
  });

  test("function without closing parenthesis", () => {
    expect(() => parse(`SUM(5,`)).toThrow("Invalid expression");
  });

  test("function without a closing parenthesis", () => {
    expect(() => parse(`SUM(5`)).toThrow("Wrong function call");
  });

  test("function without argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(`)).toThrow("Invalid expression");
  });

  test("function with empty first argument nor a closing parenthesis", () => {
    expect(() => parse(`SUM(,`)).toThrow("Invalid expression");
  });

  test("add a EMPTY token for empty arguments", () => {
    expect(parse("SUM(1,)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "EMPTY", value: "" },
      ],
    });
    expect(parse("SUM(,1)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "EMPTY", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
    expect(parse("SUM(,)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "EMPTY", value: "" },
        { type: "EMPTY", value: "" },
      ],
    });
    expect(parse("SUM(,,)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "EMPTY", value: "" },
        { type: "EMPTY", value: "" },
        { type: "EMPTY", value: "" },
      ],
    });
    expect(parse("SUM(,,,1)")).toMatchObject({
      type: "FUNCALL",
      value: "SUM",
      args: [
        { type: "EMPTY", value: "" },
        { type: "EMPTY", value: "" },
        { type: "EMPTY", value: "" },
        { type: "NUMBER", value: 1 },
      ],
    });
  });

  test("can parse unary operations", () => {
    expect(parse("-1")).toMatchObject({
      type: "UNARY_OPERATION",
      value: "-",
      operand: { type: "NUMBER", value: 1 },
    });
    expect(parse("+1")).toMatchObject({
      type: "UNARY_OPERATION",
      value: "+",
      operand: { type: "NUMBER", value: 1 },
    });
  });

  test("can parse % operator", () => {
    expect(parse("1%")).toMatchObject({
      type: "UNARY_OPERATION",
      value: "%",
      operand: { type: "NUMBER", value: 1 },
      postfix: true,
    });
    expect(parse("100 %")).toMatchObject({
      type: "UNARY_OPERATION",
      value: "%",
      operand: { type: "NUMBER", value: 100 },
      postfix: true,
    });
  });

  test("can parse numeric values", () => {
    expect(parse("1")).toMatchObject({ type: "NUMBER", value: 1 });
    expect(parse("1.5")).toMatchObject({ type: "NUMBER", value: 1.5 });
    expect(parse("1.")).toMatchObject({ type: "NUMBER", value: 1 });
    expect(parse(".5")).toMatchObject({ type: "NUMBER", value: 0.5 });
    expect(parse("1e3")).toMatchObject({ type: "NUMBER", value: 1e3 });
    expect(parse("1e+3")).toMatchObject({ type: "NUMBER", value: 1e3 });
    expect(parse("1e-3")).toMatchObject({ type: "NUMBER", value: 1e-3 });
    expect(parse("1E3")).toMatchObject({ type: "NUMBER", value: 1e3 });
    expect(parse("1E+3")).toMatchObject({ type: "NUMBER", value: 1e3 });
    expect(parse("1E-3")).toMatchObject({ type: "NUMBER", value: 1e-3 });
  });

  test("can parse string without ending double quotes", () => {
    expect(parse('"hello')).toMatchObject({ type: "STRING", value: "hello" });
  });

  test("can parse binary operations", () => {
    expect(parse("2-3")).toMatchObject({
      type: "BIN_OPERATION",
      value: "-",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 3 },
    });
  });

  test("can parse expression with parenthesis", () => {
    expect(parse("(2+3)")).toMatchObject({
      type: "BIN_OPERATION",
      value: "+",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 3 },
    });
  });

  test("binary operation without a closing parenthesis", () => {
    expect(() => parse("(2+3")).toThrow("Missing closing parenthesis");
  });

  test("can parse concat operator", () => {
    expect(parse("A1&A2")).toMatchObject({
      type: "BIN_OPERATION",
      value: "&",
      left: { type: "REFERENCE", value: "A1" },
      right: { type: "REFERENCE", value: "A2" },
    });
  });

  test("Can parse invalid references", () => {
    expect(parse("#REF")).toMatchObject({
      type: "REFERENCE",
      value: CellErrorType.InvalidReference,
    });
  });

  test("Cannot parse empty string", () => {
    expect(() => parse("")).toThrowError("Invalid expression");
  });

  test("AND", () => {
    expect(parse("=AND(true, false)")).toMatchObject({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "BOOLEAN", value: true },
        { type: "BOOLEAN", value: false },
      ],
    });
    expect(parse("=AND(0, tRuE)")).toMatchObject({
      type: "FUNCALL",
      value: "AND",
      args: [
        { type: "NUMBER", value: 0 },
        { type: "BOOLEAN", value: true },
      ],
    });
  });

  test("can parse simple symbol", () => {
    expect(parse("Hello")).toMatchObject({
      type: "SYMBOL",
      value: "Hello",
    });
  });

  test("can parse quoted symbol", () => {
    expect(parse("'Hello world'")).toMatchObject({
      type: "SYMBOL",
      value: "Hello world",
    });
  });

  test("cannot parse unquoted symbol with space", () => {
    expect(() => parse("Hello world")).toThrow("Invalid expression");
  });

  describe("Parser saves the token indexes in the AST", () => {
    test("Simple formula", () => {
      const formula = "SUM(A1)";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "FUNCALL",
        value: "SUM",
        tokenStartIndex: 0,
        tokenEndIndex: tokens.findIndex((t) => t.value === ")"),
        args: [
          {
            type: "REFERENCE",
            value: "A1",
            tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
            tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
          },
        ],
      });
    });

    test("Simple prefix unary operator", () => {
      const formula = "-A1";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "UNARY_OPERATION",
        value: "-",
        tokenStartIndex: 0,
        tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
        operand: {
          type: "REFERENCE",
          value: "A1",
          tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
        },
      });
    });

    test("Simple suffix unary operator", () => {
      const formula = "12%";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "UNARY_OPERATION",
        value: "%",
        tokenStartIndex: 0,
        tokenEndIndex: tokens.findIndex((t) => t.value === "%"),
        operand: {
          type: "NUMBER",
          value: 12,
          tokenStartIndex: 0,
          tokenEndIndex: 0,
        },
        postfix: true,
      });
    });

    test("Simple binary operator", () => {
      const formula = "A1+B2";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "BIN_OPERATION",
        value: "+",
        tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
        tokenEndIndex: tokens.findIndex((t) => t.value === "B2"),
        left: {
          type: "REFERENCE",
          value: "A1",
          tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
        },
        right: {
          type: "REFERENCE",
          value: "B2",
          tokenStartIndex: tokens.findIndex((t) => t.value === "B2"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "B2"),
        },
      });
    });

    test("With parenthesis", () => {
      const formula = "((A1+B2))";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "BIN_OPERATION",
        value: "+",
        tokenStartIndex: 0,
        tokenEndIndex: 6,
        left: {
          type: "REFERENCE",
          value: "A1",
          tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
        },
        right: {
          type: "REFERENCE",
          value: "B2",
          tokenStartIndex: tokens.findIndex((t) => t.value === "B2"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "B2"),
        },
      });
    });

    test("Complex formula", () => {
      const formula = "SUM(A1+(-B2),12%)+15";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "BIN_OPERATION",
        value: "+",
        tokenStartIndex: 0,
        tokenEndIndex: tokens.length - 1,
        left: {
          type: "FUNCALL",
          value: "SUM",
          tokenStartIndex: 0,
          tokenEndIndex: 11,
          args: [
            {
              type: "BIN_OPERATION",
              value: "+",
              tokenStartIndex: 2,
              tokenEndIndex: 7,
              left: {
                type: "REFERENCE",
                value: "A1",
                tokenStartIndex: 2,
                tokenEndIndex: 2,
              },
              right: {
                type: "UNARY_OPERATION",
                value: "-",
                tokenStartIndex: 4,
                tokenEndIndex: 7,
                operand: {
                  type: "REFERENCE",
                  value: "B2",
                  tokenStartIndex: 6,
                  tokenEndIndex: 6,
                },
              },
            },
            {
              type: "UNARY_OPERATION",
              value: "%",
              tokenStartIndex: 9,
              tokenEndIndex: 10,
              operand: {
                type: "NUMBER",
                value: 12,
                tokenStartIndex: 9,
                tokenEndIndex: 9,
              },
              postfix: true,
            },
          ],
        },
        right: {
          type: "NUMBER",
          value: 15,
          tokenStartIndex: 13,
          tokenEndIndex: 13,
        },
      });
    });

    test("With = at the start", () => {
      const formula = "=A1";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "REFERENCE",
        value: "A1",
        tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
        tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
      });
    });

    test("With spaces", () => {
      const formula = "  A1  +  B2  ";
      const tokens = tokenize(formula);

      expect(parse(formula)).toMatchObject({
        type: "BIN_OPERATION",
        value: "+",
        tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
        tokenEndIndex: tokens.findIndex((t) => t.value === "B2"),
        left: {
          type: "REFERENCE",
          value: "A1",
          tokenStartIndex: tokens.findIndex((t) => t.value === "A1"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "A1"),
        },
        right: {
          type: "REFERENCE",
          value: "B2",
          tokenStartIndex: tokens.findIndex((t) => t.value === "B2"),
          tokenEndIndex: tokens.findIndex((t) => t.value === "B2"),
        },
      });
    });
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
    expect(astToFormula(parse('"R\\"'))).toBe('"R\\"');
    expect(astToFormula(parse('CONCAT("R", "EM")'))).toBe('CONCAT("R","EM")');
  });
  test("Convert numbers", () => {
    expect(astToFormula(parse("5"))).toBe("5");
    expect(astToFormula(parse("5+4"))).toBe("5+4");
    expect(astToFormula(parse("+5"))).toBe("+5");
  });
});
