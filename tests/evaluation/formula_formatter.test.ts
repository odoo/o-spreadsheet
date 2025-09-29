import { prettify } from "@odoo/o-spreadsheet-engine/formulas/formula_formatter";
import { parse } from "../../src";

function prettifyContent(content: string): string {
  return prettify(parse(content));
}

describe("formula formatter", () => {
  test("remove extra spaces around operators", () => {
    expect(prettifyContent("=  A2      +   A3  ")).toBe("=A2+A3");
  });

  test("remove extra spaces around formula arguments ", () => {
    expect(prettifyContent("=SUM( 1 ,   2  ,    3 )")).toBe("=SUM(1, 2, 3)");
  });

  test("remove the extra parentheses", () => {
    // should not be. But we loose the parentheses information during the parsing into an AST
    expect(prettifyContent("=(2*(((A2)+A3)))")).toBe("=2*(A2+A3)");
    expect(prettifyContent("=1+(2+(3+4))")).toBe("=1+2+3+4");
    expect(prettifyContent("=2^3%")).toBe("=2^3%");
  });

  test("keep parentheses who against priority order", () => {
    expect(prettifyContent("=((2+3))*4")).toBe("=(2+3)*4");
    expect(prettifyContent("=1-((2-(3+4)))")).toBe("=1-(2-(3+4))");
    expect(prettifyContent("=2^((3^4))")).toBe("=2^(3^4)");
    expect(prettifyContent("=2/((3/4))")).toBe("=2/(3/4)");
  });

  test("nested functions are properly indented", () => {
    expect(prettifyContent("=SUM(AVERAGE(1,2,3,4), MAX(5,6,7,8), MIN(10,11,12,13))")).toBe(
      "=SUM(\n" +
        "\tAVERAGE(1, 2, 3, 4), \n" +
        "\tMAX(5, 6, 7, 8), \n" +
        "\tMIN(10, 11, 12, 13)\n" +
        ")"
    );
  });

  test("long nested functions are properly indented with sub-lvls", () => {
    expect(
      prettifyContent(
        "=SUM(AVERAGE(COUNT(4,5,6,7),COUNT(10,11,12,13),COUNT(14,15,16,17)), MAX(COUNT(4,5,6,7),COUNT(10,11,12,13),COUNT(14,15,16,17)))"
      )
    ).toBe(
      "=SUM(\n" +
        "\tAVERAGE(\n" +
        "\t\tCOUNT(4, 5, 6, 7), \n" +
        "\t\tCOUNT(10, 11, 12, 13), \n" +
        "\t\tCOUNT(14, 15, 16, 17)\n" +
        "\t), \n" +
        "\tMAX(\n" +
        "\t\tCOUNT(4, 5, 6, 7), \n" +
        "\t\tCOUNT(10, 11, 12, 13), \n" +
        "\t\tCOUNT(14, 15, 16, 17)\n" +
        "\t)\n" +
        ")"
    );
  });

  test("too long binary operation series are split in multiple lines and indented", () => {
    expect(
      prettifyContent(
        "=SUM(1111 + 2222 + 3333 + 4444 + 5555 + 6666 + 7777 + 8888 + 9999 + 11111 + 22222 + 33333 + 44444)"
      )
    ).toBe(
      //prettier-ignore
      "=SUM(\n" +
          "\t1111+2222+3333+4444+5555+6666+7777+8888+9999+11111+22222+\n" +
          "\t\t33333+\n" +
          "\t\t44444\n" +
          ")"
    );
  });

  test("during binary operations, keep priority operations on the same line", () => {
    expect(
      prettifyContent(
        "=SUM(1111 + 2222 + 3333 + 4444 + 5555 + 6666 + 7777 + 8888 + 9999 + 11111 + 22222 + 33333 * 44444 - 55555 + 66666 / 77777 )"
      )
    ).toBe(
      "=SUM(\n" +
        "\t1111+2222+3333+4444+5555+6666+7777+8888+9999+11111+22222+\n" +
        "\t\t33333*44444-\n" +
        "\t\t55555+\n" +
        "\t\t66666/77777\n" +
        ")"
    );
  });

  test("long functions with nested parenthesis for mathematical operation are properly indented with sub-lvls", () => {
    expect(
      prettifyContent(
        "=1*(2-2-2-2-2-2-2-(3+3+3+3+3+3+3+3+3-(4+4+4+4+4+4+4+4+4/(4+5+6+7+5+6+7+8+9))))"
      )
    ).toBe(
      "=1*\n" +
        "\t(\n" +
        "\t\t2-2-2-2-2-2-2-\n" +
        "\t\t\t(\n" +
        "\t\t\t\t3+3+3+3+3+3+3+3+3-\n" +
        "\t\t\t\t\t(4+4+4+4+4+4+4+4+4/(4+5+6+7+5+6+7+8+9))\n" +
        "\t\t\t)\n" +
        "\t)"
    );
  });

  test("formula with groups of repeatable arguments keep group on same line", () => {
    expect(
      prettifyContent(
        '=SUMIFS(A1:A10, B1:B10, ">0", C1:C10, "<100", D1:D10, "<>50", E1:E10, "=20" )'
      )
    ).toBe(
      "=SUMIFS(\n" +
        "\tA1:A10, \n" + // <-- values
        '\tB1:B10, ">0", \n' + // <-- group 1
        '\tC1:C10, "<100", \n' + // <-- group 2
        '\tD1:D10, "<>50", \n' + // <-- group 3
        '\tE1:E10, "=20"\n' + // <-- group 4
        ")"
    );
  });

  test("array literals are formatted", () => {
    expect(prettifyContent("={1,2;3,4}")).toBe("={1, 2; 3, 4}");
  });

  test("long array literals are formatted depending the dimensions", () => {
    expect(prettifyContent("={A1,A2,A3,A4,A5;B1,B2,B3,B4,B5;C1,C2,C3,C4,C5}")).toBe(
      "={\n" +
        "\tA1, A2, A3, A4, A5; \n" +
        "\tB1, B2, B3, B4, B5; \n" +
        "\tC1, C2, C3, C4, C5\n" +
        "}"
    );
  });
});
