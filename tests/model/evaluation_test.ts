import { GridModel } from "../../src/model/index";

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "2");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(3);
  });

  test("With empty content", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(1);
  });

  test("With empty cell", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(1);
  });

  test("handling some errors", () => {
    const model = new GridModel();
    model.setValue("A1", "=A1");
    model.setValue("A2", "=A1");
    model.setValue("A3", "=+");
    model.setValue("A4", "=1 + A3");
    model.setValue("A5", "=sum('asdf')"); // not a string!
    expect(model.state.cells["A1"].value).toEqual("#CYCLE");
    expect(model.state.cells["A2"].value).toEqual("#ERROR");
    expect(model.state.cells["A3"].value).toEqual("#BAD_EXPR");
    expect(model.state.cells["A4"].value).toEqual("#ERROR");
    expect(model.state.cells.A5.value).toEqual("#BAD_EXPR");
  });

  test("error in an addition", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1+A2");

    expect(model.state.cells.A3.value).toBe(3);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(43);
  });

  test("error in an substraction", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1-A2");

    expect(model.state.cells.A3.value).toBe(-1);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1*A2");

    expect(model.state.cells.A3.value).toBe(2);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1/A2");

    expect(model.state.cells.A3.value).toBe(0.5);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "30");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value).toBe(3);
  });

  test("range", () => {
    const model = new GridModel();
    model.setValue("D4", "42");
    model.setValue("A1", "=sum(A2:Z10)");

    expect(model.state.cells.A1.value).toBe(42);
  });

  test("misc math formulas", () => {
    const model = new GridModel();
    model.setValue("A1", "42");
    model.setValue("A2", "2");
    model.setValue("B3", "2.3");
    model.setValue("C1", "=countblank(A1:A10)");
    model.setValue("C2", "=sum(A1,B1)");
    model.setValue("C3", "=countblank(B1:A1)");
    model.setValue("C4", "=floor(B3)");
    model.setValue("C5", "=floor(A8)");
    model.setValue("C6", "=sum(A1:A4,B1:B5)");

    expect(model.state.cells.C1.value).toBe(8);
    expect(model.state.cells.C2.value).toBe(42);
    expect(model.state.cells.C3.value).toBe(1);
    expect(model.state.cells.C4.value).toBe(2);
    expect(model.state.cells.C5.value).toBe(0);
    expect(model.state.cells.C6.value).toBe(46.3);
  });

  test("priority of operations", () => {
    const model = new GridModel();
    model.setValue("A1", "=1 + 2 * 3");
    model.setValue("A2", "=-2*-2");
    model.setValue("A3", "=-2^2");
    model.setValue("A4", "=-2^2 + 3");
    model.setValue("A5", "= - 1 + - 2 * - 3");

    expect(model.state.cells.A1.value).toBe(7);
    expect(model.state.cells.A2.value).toBe(4);
    expect(model.state.cells.A3.value).toBe(-4);
    expect(model.state.cells.A4.value).toBe(-1);
    expect(model.state.cells.A5.value).toBe(5);
  });

  test("various expressions with whitespace", () => {
    const model = new GridModel();

    model.setValue("A1", "");
    model.setValue("A2", ",");
    model.setValue("A3", " ");
    model.setValue("A4", " , ");
    model.setValue("A5", " 42 ");
    model.setValue("A6", " 42 , 24  ");
    model.setValue("A7", " 43 ,     ");
    model.setValue("A8", " 44   45  ");

    model.setValue("B1", "=");
    model.setValue("B2", "=,");
    model.setValue("B3", "= ");
    model.setValue("B4", "= , ");
    model.setValue("B5", "= 42 ");
    model.setValue("B6", "= 42 , 24  ");
    model.setValue("B7", "= 43 ,     ");
    model.setValue("B8", "= 44   45  ");

    model.setValue("C1", "=SUM()");
    model.setValue("C2", "=SUM(,)");
    model.setValue("C3", "=SUM( )");
    model.setValue("C4", "=SUM( , )");
    model.setValue("C5", "=SUM( 42 )");
    model.setValue("C6", "=SUM( 42 , 24  )");
    model.setValue("C7", "=SUM( 43 ,     )");
    model.setValue("C8", "=SUM( 44   45  )");

    model.setValue("D1", "=COUNT()");
    model.setValue("D2", "=COUNT(,)");
    model.setValue("D3", "=COUNT( )");
    model.setValue("D4", "=COUNT( , )");
    model.setValue("D5", "=COUNT( 42 )");
    model.setValue("D6", "=COUNT( 42 , 24  )");
    model.setValue("D7", "=COUNT( 43 ,     )");
    model.setValue("D8", "=COUNT( 44   45  )");

    expect(model.state.cells.A1.value).toBe("");
    expect(model.state.cells.A2.value).toBe(",");
    expect(model.state.cells.A3.value).toBe(" ");
    expect(model.state.cells.A4.value).toBe(" , ");
    expect(model.state.cells.A5.value).toBe(42);
    expect(model.state.cells.A6.value).toBe(" 42 , 24  ");
    expect(model.state.cells.A7.value).toBe(" 43 ,     ");
    expect(model.state.cells.A8.value).toBe(" 44   45  ");

    expect(model.state.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.state.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.state.cells.B3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.state.cells.B4.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.state.cells.B5.value).toBe(42);
    expect(model.state.cells.B6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B7.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.state.cells.B8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.state.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.state.cells.C2.value).toBe(0);
    expect(model.state.cells.C3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.state.cells.C4.value).toBe(0);
    expect(model.state.cells.C5.value).toBe(42);
    expect(model.state.cells.C6.value).toBe(66);
    expect(model.state.cells.C7.value).toBe(43);
    expect(model.state.cells.C8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.state.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.state.cells.D2.value).toBe(2);
    expect(model.state.cells.D3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.state.cells.D4.value).toBe(2);
    expect(model.state.cells.D5.value).toBe(1);
    expect(model.state.cells.D6.value).toBe(2);
    expect(model.state.cells.D7.value).toBe(2);
    expect(model.state.cells.D8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with whitespace", () => {
    const model = new GridModel();

    model.setValue("A1", '""');
    model.setValue("A2", '","');
    model.setValue("A3", '" "');
    model.setValue("A4", '" , "');
    model.setValue("A5", '" 42  "');
    model.setValue("A6", '" 42 , 24  "');
    model.setValue("A7", '" 43 ,     "');
    model.setValue("A8", '" 44   45  "');

    model.setValue("B1", '=""');
    model.setValue("B2", '=","');
    model.setValue("B3", '=" "');
    model.setValue("B4", '=" , "');
    model.setValue("B5", '=" 42  "');
    model.setValue("B6", '=" 42 , 24  "');
    model.setValue("B7", '=" 43 ,     "');
    model.setValue("B8", '=" 44   45  "');

    model.setValue("C1", '=SUM("")');
    model.setValue("C2", '=SUM(",")');
    model.setValue("C3", '=SUM(" ")');
    model.setValue("C4", '=SUM(" , ")');
    model.setValue("C5", '=SUM(" 42  ")');
    model.setValue("C6", '=SUM(" 42 , 24  ")');
    model.setValue("C7", '=SUM(" 43 ,     ")');
    model.setValue("C8", '=SUM(" 44   45  ")');

    model.setValue("D1", '=COUNT("")');
    model.setValue("D2", '=COUNT(",")');
    model.setValue("D3", '=COUNT(" ")');
    model.setValue("D4", '=COUNT(" , ")');
    model.setValue("D5", '=COUNT(" 42  ")');
    model.setValue("D6", '=COUNT(" 42 , 24  ")');
    model.setValue("D7", '=COUNT(" 43 ,     ")');
    model.setValue("D8", '=COUNT(" 44   45  ")');

    expect(model.state.cells.A1.value).toBe('""');
    expect(model.state.cells.A2.value).toBe('","');
    expect(model.state.cells.A3.value).toBe('" "');
    expect(model.state.cells.A4.value).toBe('" , "');
    expect(model.state.cells.A5.value).toBe('" 42  "');
    expect(model.state.cells.A6.value).toBe('" 42 , 24  "');
    expect(model.state.cells.A7.value).toBe('" 43 ,     "');
    expect(model.state.cells.A8.value).toBe('" 44   45  "');

    expect(model.state.cells.B1.value).toBe("");
    expect(model.state.cells.B2.value).toBe(",");
    expect(model.state.cells.B3.value).toBe(" ");
    expect(model.state.cells.B4.value).toBe(" , ");
    expect(model.state.cells.B5.value).toBe(" 42  ");
    expect(model.state.cells.B6.value).toBe(" 42 , 24  ");
    expect(model.state.cells.B7.value).toBe(" 43 ,     ");
    expect(model.state.cells.B8.value).toBe(" 44   45  ");

    expect(model.state.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C3.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C4.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C5.value).toBe(42);
    expect(model.state.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C7.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C8.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(model.state.cells.D1.value).toBe(0);
    expect(model.state.cells.D2.value).toBe(0);
    expect(model.state.cells.D3.value).toBe(0);
    expect(model.state.cells.D4.value).toBe(0);
    expect(model.state.cells.D5.value).toBe(1);
    expect(model.state.cells.D6.value).toBe(0);
    expect(model.state.cells.D7.value).toBe(0);
    expect(model.state.cells.D8.value).toBe(0);
  });

  test("various expressions with dot", () => {
    const model = new GridModel();

    model.setValue("A1", "4.2");
    model.setValue("A2", "4.");
    model.setValue("A3", ".2");

    model.setValue("B1", "=4.2");
    model.setValue("B2", "=4.");
    model.setValue("B3", "=.2");

    model.setValue("C1", "=SUM(4.2)");
    model.setValue("C2", "=SUM(4.)");
    model.setValue("C3", "=SUM(.2)");

    model.setValue("D1", "=COUNT(4.2)");
    model.setValue("D2", "=COUNT(4.)");
    model.setValue("D3", "=COUNT(.2)");

    expect(model.state.cells.A1.value).toBe(4.2);
    expect(model.state.cells.A2.value).toBe(4);
    expect(model.state.cells.A3.value).toBe(0.2);

    expect(model.state.cells.B1.value).toBe(4.2);
    expect(model.state.cells.B2.value).toBe(4);
    expect(model.state.cells.B3.value).toBe(0.2);

    expect(model.state.cells.C1.value).toBe(4.2);
    expect(model.state.cells.C2.value).toBe(4);
    expect(model.state.cells.C3.value).toBe(0.2);

    expect(model.state.cells.D1.value).toBe(1);
    expect(model.state.cells.D2.value).toBe(1);
    expect(model.state.cells.D3.value).toBe(1);
  });

  test("various string expressions with dot", () => {
    const model = new GridModel();
    model.setValue("A1", '"4.2"');
    model.setValue("A2", '"4."');
    model.setValue("A3", '".2"');

    model.setValue("B1", '="4.2"');
    model.setValue("B2", '="4."');
    model.setValue("B3", '=".2"');

    model.setValue("C1", '=SUM("4.2")');
    model.setValue("C2", '=SUM("4.")');
    model.setValue("C3", '=SUM(".2")');

    model.setValue("D1", '=COUNT("4.2")');
    model.setValue("D2", '=COUNT("4.")');
    model.setValue("D3", '=COUNT(".2")');

    expect(model.state.cells.A1.value).toBe('"4.2"');
    expect(model.state.cells.A2.value).toBe('"4."');
    expect(model.state.cells.A3.value).toBe('".2"');

    expect(model.state.cells.B1.value).toBe("4.2");
    expect(model.state.cells.B2.value).toBe("4.");
    expect(model.state.cells.B3.value).toBe(".2");

    expect(model.state.cells.C1.value).toBe(4.2);
    expect(model.state.cells.C2.value).toBe(4);
    expect(model.state.cells.C3.value).toBe(0.2);

    expect(model.state.cells.D1.value).toBe(1);
    expect(model.state.cells.D2.value).toBe(1);
    expect(model.state.cells.D3.value).toBe(1);
  });

  test("various expressions with dot and whitespace", () => {
    const model = new GridModel();
    model.setValue("A1", "42 .24");
    model.setValue("A2", "42. 24");
    model.setValue("A3", "42 .");
    model.setValue("A4", "42. ");
    model.setValue("A5", " .24");
    model.setValue("A6", ". 24");

    model.setValue("B1", "=42 .24");
    model.setValue("B2", "=42. 24");
    model.setValue("B3", "=42 .");
    model.setValue("B4", "=42. ");
    model.setValue("B5", "= .24");
    model.setValue("B6", "=. 24");

    model.setValue("C1", "=SUM(42 .24)");
    model.setValue("C2", "=SUM(42. 24)");
    model.setValue("C3", "=SUM(42 .)");
    model.setValue("C4", "=SUM(42. )");
    model.setValue("C5", "=SUM( .24)");
    model.setValue("C6", "=SUM(. 24)");

    model.setValue("D1", "=COUNT(42 .24)");
    model.setValue("D2", "=COUNT(42. 24)");
    model.setValue("D3", "=COUNT(42 .)");
    model.setValue("D4", "=COUNT(42. )");
    model.setValue("D5", "=COUNT( .24)");
    model.setValue("D6", "=COUNT(. 24)");

    expect(model.state.cells.A1.value).toBe("42 .24");
    expect(model.state.cells.A2.value).toBe("42. 24");
    expect(model.state.cells.A3.value).toBe("42 .");
    expect(model.state.cells.A4.value).toBe(42);
    expect(model.state.cells.A5.value).toBe(0.24);
    expect(model.state.cells.A6.value).toBe(". 24");

    expect(model.state.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B4.value).toBe(42);
    expect(model.state.cells.B5.value).toBe(0.24);
    expect(model.state.cells.B6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.state.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.C2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.C3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.C4.value).toBe(42);
    expect(model.state.cells.C5.value).toBe(0.24);
    expect(model.state.cells.C6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.state.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.D2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.D3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.D4.value).toBe(1);
    expect(model.state.cells.D5.value).toBe(1);
    expect(model.state.cells.D6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with dot and whitespace", () => {
    const model = new GridModel();
    model.setValue("A1", '"42 .24"');
    model.setValue("A2", '"42. 24"');
    model.setValue("A3", '"42 ."');
    model.setValue("A4", '"42. "');
    model.setValue("A5", '" .24"');
    model.setValue("A6", '". 24"');

    model.setValue("B1", '="42 .24"');
    model.setValue("B2", '="42. 24"');
    model.setValue("B3", '="42 ."');
    model.setValue("B4", '="42. "');
    model.setValue("B5", '=" .24"');
    model.setValue("B6", '=". 24"');

    model.setValue("C1", '=SUM("42 .24")');
    model.setValue("C2", '=SUM("42. 24")');
    model.setValue("C3", '=SUM("42 .")');
    model.setValue("C4", '=SUM("42. ")');
    model.setValue("C5", '=SUM(" .24")');
    model.setValue("C6", '=SUM(". 24")');

    model.setValue("D1", '=COUNT("42 .24")');
    model.setValue("D2", '=COUNT("42. 24")');
    model.setValue("D3", '=COUNT("42 .")');
    model.setValue("D4", '=COUNT("42. ")');
    model.setValue("D5", '=COUNT(" .24")');
    model.setValue("D6", '=COUNT(". 24")');

    expect(model.state.cells.A1.value).toBe('"42 .24"');
    expect(model.state.cells.A2.value).toBe('"42. 24"');
    expect(model.state.cells.A3.value).toBe('"42 ."');
    expect(model.state.cells.A4.value).toBe('"42. "');
    expect(model.state.cells.A5.value).toBe('" .24"');
    expect(model.state.cells.A6.value).toBe('". 24"');

    expect(model.state.cells.B1.value).toBe("42 .24");
    expect(model.state.cells.B2.value).toBe("42. 24");
    expect(model.state.cells.B3.value).toBe("42 .");
    expect(model.state.cells.B4.value).toBe("42. ");
    expect(model.state.cells.B5.value).toBe(" .24");
    expect(model.state.cells.B6.value).toBe(". 24");

    expect(model.state.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C3.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C4.value).toBe(42);
    expect(model.state.cells.C5.value).toBe(0.24);
    expect(model.state.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(model.state.cells.D1.value).toBe(0);
    expect(model.state.cells.D2.value).toBe(0);
    expect(model.state.cells.D3.value).toBe(0);
    expect(model.state.cells.D4.value).toBe(1);
    expect(model.state.cells.D5.value).toBe(1);
    expect(model.state.cells.D6.value).toBe(0);
  });

  test("various expressions with percent, dot and whitespace", () => {
    const model = new GridModel();
    model.setValue("A1", "%");
    model.setValue("A2", " %");
    model.setValue("A3", "40%");
    model.setValue("A4", " 41% ");
    model.setValue("A5", "42 %");
    model.setValue("A6", " 43 % ");
    model.setValue("A7", "4.1%");
    model.setValue("A8", " 4.2% ");
    model.setValue("A9", ".1%");
    model.setValue("A10", " .2% ");
    model.setValue("A11", "3.%");
    model.setValue("A12", " 4.% ");

    model.setValue("B1", "=%");
    model.setValue("B2", "= %");
    model.setValue("B3", "=40%");
    model.setValue("B4", "= 41% ");
    model.setValue("B5", "=42 %");
    model.setValue("B6", "= 43 % ");
    model.setValue("B7", "=4.1%");
    model.setValue("B8", "= 4.2% ");
    model.setValue("B9", "=.1%");
    model.setValue("B10", "= .2% ");
    model.setValue("B11", "=3.%");
    model.setValue("B12", "= 4.% ");

    model.setValue("C1", "=SUM(%)");
    model.setValue("C2", "=SUM( %)");
    model.setValue("C3", "=SUM(40%)");
    model.setValue("C4", "=SUM( 41% )");
    model.setValue("C5", "=SUM(42 %)");
    model.setValue("C6", "=SUM( 43 % )");
    model.setValue("C7", "=SUM(4.1%)");
    model.setValue("C8", "=SUM( 4.2% )");
    model.setValue("C9", "=SUM(.1%)");
    model.setValue("C10", "=SUM( .2% )");
    model.setValue("C11", "=SUM(3.%)");
    model.setValue("C12", "=SUM( 4.% )");

    model.setValue("D1", "=COUNT(%)");
    model.setValue("D2", "=COUNT( %)");
    model.setValue("D3", "=COUNT(40%)");
    model.setValue("D4", "=COUNT( 41% )");
    model.setValue("D5", "=COUNT(42 %)");
    model.setValue("D6", "=COUNT( 43 % )");
    model.setValue("D7", "=COUNT(4.1%)");
    model.setValue("D8", "=COUNT( 4.2% )");
    model.setValue("D9", "=COUNT(.1%)");
    model.setValue("D10", "=COUNT( .2% )");
    model.setValue("D11", "=COUNT(3.%)");
    model.setValue("D12", "=COUNT( 4.% )");

    expect(model.state.cells.A1.value).toBe("%");
    expect(model.state.cells.A2.value).toBe(" %");
    expect(model.state.cells.A3.value).toBe(0.4);
    expect(model.state.cells.A4.value).toBe(0.41);
    expect(model.state.cells.A5.value).toBe("42 %");
    expect(model.state.cells.A6.value).toBe(" 43 % ");
    expect(model.state.cells.A7.value).toBeCloseTo(0.041, 3);
    expect(model.state.cells.A8.value).toBe(0.042);
    expect(model.state.cells.A9.value).toBe(0.001);
    expect(model.state.cells.A10.value).toBe(0.002);
    expect(model.state.cells.A11.value).toBe(0.03);
    expect(model.state.cells.A12.value).toBe(0.04);

    expect(model.state.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.B3.value).toBe(0.4);
    expect(model.state.cells.B4.value).toBe(0.41);
    expect(model.state.cells.B5.value).toBe(0.42);
    expect(model.state.cells.B6.value).toBe(0.43);
    expect(model.state.cells.B7.value).toBeCloseTo(0.041, 3);
    expect(model.state.cells.B8.value).toBe(0.042);
    expect(model.state.cells.B9.value).toBe(0.001);
    expect(model.state.cells.B10.value).toBe(0.002);
    expect(model.state.cells.B11.value).toBe(0.03);
    expect(model.state.cells.B12.value).toBe(0.04);

    expect(model.state.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.C2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.C3.value).toBe(0.4);
    expect(model.state.cells.C4.value).toBe(0.41);
    expect(model.state.cells.C5.value).toBe(0.42);
    expect(model.state.cells.C6.value).toBe(0.43);
    expect(model.state.cells.C7.value).toBeCloseTo(0.041, 3);
    expect(model.state.cells.C8.value).toBe(0.042);
    expect(model.state.cells.C9.value).toBe(0.001);
    expect(model.state.cells.C10.value).toBe(0.002);
    expect(model.state.cells.C11.value).toBe(0.03);
    expect(model.state.cells.C12.value).toBe(0.04);

    expect(model.state.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.D2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.state.cells.D3.value).toBe(1);
    expect(model.state.cells.D4.value).toBe(1);
    expect(model.state.cells.D5.value).toBe(1);
    expect(model.state.cells.D6.value).toBe(1);
    expect(model.state.cells.D7.value).toBe(1);
    expect(model.state.cells.D8.value).toBe(1);
    expect(model.state.cells.D9.value).toBe(1);
    expect(model.state.cells.D10.value).toBe(1);
    expect(model.state.cells.D11.value).toBe(1);
    expect(model.state.cells.D12.value).toBe(1);
  });

  test("various string expressions with percent, dot and whitespace", () => {
    const model = new GridModel();

    model.setValue("A1", '"%"');
    model.setValue("A2", '" %"');
    model.setValue("A3", '"40%"');
    model.setValue("A4", '" 41% "');
    model.setValue("A5", '"42 %"');
    model.setValue("A6", '" 43 % "');
    model.setValue("A7", '"4.1%"');
    model.setValue("A8", '" 4.2% "');
    model.setValue("A9", '".1%"');
    model.setValue("A10", '" .2% "');
    model.setValue("A11", '"3.%"');
    model.setValue("A12", '" 4.% "');

    model.setValue("B1", '="%"');
    model.setValue("B2", '=" %"');
    model.setValue("B3", '="40%"');
    model.setValue("B4", '=" 41% "');
    model.setValue("B5", '="42 %"');
    model.setValue("B6", '=" 43 % "');
    model.setValue("B7", '="4.1%"');
    model.setValue("B8", '=" 4.2% "');
    model.setValue("B9", '=".1%"');
    model.setValue("B10", '=" .2% "');
    model.setValue("B11", '="3.%"');
    model.setValue("B12", '=" 4.% "');

    model.setValue("C1", '=SUM("%")');
    model.setValue("C2", '=SUM(" %")');
    model.setValue("C3", '=SUM("40%")');
    model.setValue("C4", '=SUM(" 41% ")');
    model.setValue("C5", '=SUM("42 %")');
    model.setValue("C6", '=SUM(" 43 % ")');
    model.setValue("C7", '=SUM("4.1%")');
    model.setValue("C8", '=SUM(" 4.2% ")');
    model.setValue("C9", '=SUM(".1%")');
    model.setValue("C10", '=SUM(" .2% ")');
    model.setValue("C11", '=SUM("3.%")');
    model.setValue("C12", '=SUM(" 4.% ")');

    model.setValue("D1", '=COUNT("%")');
    model.setValue("D2", '=COUNT(" %")');
    model.setValue("D3", '=COUNT("40%")');
    model.setValue("D4", '=COUNT(" 41% ")');
    model.setValue("D5", '=COUNT("42 %")');
    model.setValue("D6", '=COUNT(" 43 % ")');
    model.setValue("D7", '=COUNT("4.1%")');
    model.setValue("D8", '=COUNT(" 4.2% ")');
    model.setValue("D9", '=COUNT(".1%")');
    model.setValue("D10", '=COUNT(" .2% ")');
    model.setValue("D11", '=COUNT("3.%")');
    model.setValue("D12", '=COUNT(" 4.% ")');

    expect(model.state.cells.A1.value).toBe('"%"');
    expect(model.state.cells.A2.value).toBe('" %"');
    expect(model.state.cells.A3.value).toBe('"40%"');
    expect(model.state.cells.A4.value).toBe('" 41% "');
    expect(model.state.cells.A5.value).toBe('"42 %"');
    expect(model.state.cells.A6.value).toBe('" 43 % "');
    expect(model.state.cells.A7.value).toBe('"4.1%"');
    expect(model.state.cells.A8.value).toBe('" 4.2% "');
    expect(model.state.cells.A9.value).toBe('".1%"');
    expect(model.state.cells.A10.value).toBe('" .2% "');
    expect(model.state.cells.A11.value).toBe('"3.%"');
    expect(model.state.cells.A12.value).toBe('" 4.% "');

    expect(model.state.cells.B1.value).toBe("%");
    expect(model.state.cells.B2.value).toBe(" %");
    expect(model.state.cells.B3.value).toBe("40%");
    expect(model.state.cells.B4.value).toBe(" 41% ");
    expect(model.state.cells.B5.value).toBe("42 %");
    expect(model.state.cells.B6.value).toBe(" 43 % ");
    expect(model.state.cells.B7.value).toBe("4.1%");
    expect(model.state.cells.B8.value).toBe(" 4.2% ");
    expect(model.state.cells.B9.value).toBe(".1%");
    expect(model.state.cells.B10.value).toBe(" .2% ");
    expect(model.state.cells.B11.value).toBe("3.%");
    expect(model.state.cells.B12.value).toBe(" 4.% ");

    expect(model.state.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C3.value).toBe(0.4);
    expect(model.state.cells.C4.value).toBe(0.41);
    expect(model.state.cells.C5.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C7.value).toBeCloseTo(0.041, 3);
    expect(model.state.cells.C8.value).toBe(0.042); // @compatibility: on google sheet, return #VALUE!
    expect(model.state.cells.C9.value).toBe(0.001);
    expect(model.state.cells.C10.value).toBe(0.002);
    expect(model.state.cells.C11.value).toBe(0.03);
    expect(model.state.cells.C12.value).toBe(0.04);

    expect(model.state.cells.D1.value).toBe(0);

    expect(model.state.cells.D2.value).toBe(0);
    expect(model.state.cells.D3.value).toBe(1);
    expect(model.state.cells.D4.value).toBe(1);
    expect(model.state.cells.D5.value).toBe(0);
    expect(model.state.cells.D6.value).toBe(0);
    expect(model.state.cells.D7.value).toBe(1);
    expect(model.state.cells.D8.value).toBe(1);
    expect(model.state.cells.D9.value).toBe(1);
    expect(model.state.cells.D10.value).toBe(1);
    expect(model.state.cells.D11.value).toBe(1);
    expect(model.state.cells.D12.value).toBe(1);
  });

  // TO DO: add tests for exp format (ex: 4E10)
  // RO DO: add tests for DATE string format (ex match: "28 02 2020")
});
