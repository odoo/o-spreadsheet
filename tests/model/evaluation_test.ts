import { GridModel } from "../../src/model/index";
import "../canvas.mock";

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(A1,B1)" });
    expect(model.workbook.cells["C1"].value).toEqual(3);
  });

  test("With empty content", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "" });
    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(A1,B1)" });
    expect(model.workbook.cells["C1"].value).toEqual(1);
  });

  test("With empty cell", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(A1,B1)" });
    expect(model.workbook.cells["C1"].value).toEqual(1);
  });

  test("handling some errors", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=A1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=+" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "=1 + A3" });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: "=sum('asdf')" }); // not a string!
    expect(model.workbook.cells["A1"].value).toEqual("#CYCLE");
    expect(model.workbook.cells["A2"].value).toEqual("#ERROR");
    expect(model.workbook.cells["A3"].value).toEqual("#BAD_EXPR");
    expect(model.workbook.cells["A4"].value).toEqual("#ERROR");
    expect(model.workbook.cells.A5.value).toEqual("#BAD_EXPR");
  });

  test("error in an addition", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=A1+A2" });

    expect(model.workbook.cells.A3.value).toBe(3);
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "asdf" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "33" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "10" });
    expect(model.workbook.cells.A3.value).toBe(43);
  });

  test("error in an substraction", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=A1-A2" });

    expect(model.workbook.cells.A3.value).toBe(-1);
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "asdf" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "33" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "10" });
    expect(model.workbook.cells.A3.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=A1*A2" });

    expect(model.workbook.cells.A3.value).toBe(2);
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "asdf" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "33" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "10" });
    expect(model.workbook.cells.A3.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=A1/A2" });

    expect(model.workbook.cells.A3.value).toBe(0.5);
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "asdf" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "30" });
    expect(model.workbook.cells.A3.value).toBe("#ERROR");
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "10" });
    expect(model.workbook.cells.A3.value).toBe(3);
  });

  test("range", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: "42" });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=sum(A2:Z10)" });

    expect(model.workbook.cells.A1.value).toBe(42);
  });

  test("misc math formulas", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "42" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "2" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "2.3" });
    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=countblank(A1:A10)" });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: "=sum(A1,B1)" });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: "=countblank(B1:A1)" });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: "=floor(B3)" });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: "=floor(A8)" });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: "=sum(A1:A4,B1:B5)" });

    expect(model.workbook.cells.C1.value).toBe(8);
    expect(model.workbook.cells.C2.value).toBe(42);
    expect(model.workbook.cells.C3.value).toBe(1);
    expect(model.workbook.cells.C4.value).toBe(2);
    expect(model.workbook.cells.C5.value).toBe(0);
    expect(model.workbook.cells.C6.value).toBe(46.3);
  });

  test("priority of operations", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=1 + 2 * 3" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=-2*-2" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "=-2^2" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "=-2^2 + 3" });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: "= - 1 + - 2 * - 3" });

    expect(model.workbook.cells.A1.value).toBe(7);
    expect(model.workbook.cells.A2.value).toBe(4);
    expect(model.workbook.cells.A3.value).toBe(-4);
    expect(model.workbook.cells.A4.value).toBe(-1);
    expect(model.workbook.cells.A5.value).toBe(5);
  });

  test("various expressions with boolean", () => {
    const model = new GridModel();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "FALSE" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "TRUE" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "false" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "true" });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: "FaLsE" });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: "TrUe" });

    expect(model.workbook.cells.A1.value).toBe(false);
    expect(model.workbook.cells.A2.value).toBe(true);
    expect(model.workbook.cells.A3.value).toBe(false);
    expect(model.workbook.cells.A4.value).toBe(true);
    expect(model.workbook.cells.A5.value).toBe(false);
    expect(model.workbook.cells.A6.value).toBe(true);

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "=FALSE" });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "=TRUE" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "=false" });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: "=true" });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: "=FaLsE" });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: "=TrUe" });

    expect(model.workbook.cells.B1.value).toBe(false);
    expect(model.workbook.cells.B2.value).toBe(true);
    expect(model.workbook.cells.B3.value).toBe(false);
    expect(model.workbook.cells.B4.value).toBe(true);
    expect(model.workbook.cells.B5.value).toBe(false);
    expect(model.workbook.cells.B6.value).toBe(true);

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: " FALSE " });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: " TRUE " });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: " false " });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: " true " });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: " FaLsE " });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: " TrUe " });

    expect(model.workbook.cells.A1.value).toBe(" FALSE ");
    expect(model.workbook.cells.A2.value).toBe(" TRUE ");
    expect(model.workbook.cells.A3.value).toBe(" false ");
    expect(model.workbook.cells.A4.value).toBe(" true ");
    expect(model.workbook.cells.A5.value).toBe(" FaLsE ");
    expect(model.workbook.cells.A6.value).toBe(" TrUe ");

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "= FALSE " });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "= TRUE " });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "= false " });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: "= true " });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: "= FaLsE " });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: "= TrUe " });

    expect(model.workbook.cells.B1.value).toBe(false);
    expect(model.workbook.cells.B2.value).toBe(true);
    expect(model.workbook.cells.B3.value).toBe(false);
    expect(model.workbook.cells.B4.value).toBe(true);
    expect(model.workbook.cells.B5.value).toBe(false);
    expect(model.workbook.cells.B6.value).toBe(true);
  });

  test("various expressions with whitespace", () => {
    const model = new GridModel();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "," });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: " " });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: " , " });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: " 42 " });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: " 42 , 24  " });
    model.dispatch({ type: "SET_VALUE", xc: "A7", text: " 43 ,     " });
    model.dispatch({ type: "SET_VALUE", xc: "A8", text: " 44   45  " });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "=" });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "=," });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "= " });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: "= , " });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: "= 42 " });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: "= 42 , 24  " });
    model.dispatch({ type: "SET_VALUE", xc: "B7", text: "= 43 ,     " });
    model.dispatch({ type: "SET_VALUE", xc: "B8", text: "= 44   45  " });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM()" });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: "=SUM(,)" });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: "=SUM( )" });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: "=SUM( , )" });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: "=SUM( 42 )" });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: "=SUM( 42 , 24  )" });
    model.dispatch({ type: "SET_VALUE", xc: "C7", text: "=SUM( 43 ,     )" });
    model.dispatch({ type: "SET_VALUE", xc: "C8", text: "=SUM( 44   45  )" });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: "=COUNT()" });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: "=COUNT(,)" });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: "=COUNT( )" });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: "=COUNT( , )" });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: "=COUNT( 42 )" });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: "=COUNT( 42 , 24  )" });
    model.dispatch({ type: "SET_VALUE", xc: "D7", text: "=COUNT( 43 ,     )" });
    model.dispatch({ type: "SET_VALUE", xc: "D8", text: "=COUNT( 44   45  )" });

    expect(model.workbook.cells.A1.value).toBe("");
    expect(model.workbook.cells.A2.value).toBe(",");
    expect(model.workbook.cells.A3.value).toBe(" ");
    expect(model.workbook.cells.A4.value).toBe(" , ");
    expect(model.workbook.cells.A5.value).toBe(42);
    expect(model.workbook.cells.A6.value).toBe(" 42 , 24  ");
    expect(model.workbook.cells.A7.value).toBe(" 43 ,     ");
    expect(model.workbook.cells.A8.value).toBe(" 44   45  ");

    expect(model.workbook.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.workbook.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.workbook.cells.B3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.workbook.cells.B4.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.workbook.cells.B5.value).toBe(42);
    expect(model.workbook.cells.B6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B7.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(model.workbook.cells.B8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.workbook.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.workbook.cells.C2.value).toBe(0);
    expect(model.workbook.cells.C3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.workbook.cells.C4.value).toBe(0);
    expect(model.workbook.cells.C5.value).toBe(42);
    expect(model.workbook.cells.C6.value).toBe(66);
    expect(model.workbook.cells.C7.value).toBe(43);
    expect(model.workbook.cells.C8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.workbook.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.workbook.cells.D2.value).toBe(2);
    expect(model.workbook.cells.D3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(model.workbook.cells.D4.value).toBe(2);
    expect(model.workbook.cells.D5.value).toBe(1);
    expect(model.workbook.cells.D6.value).toBe(2);
    expect(model.workbook.cells.D7.value).toBe(2);
    expect(model.workbook.cells.D8.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with whitespace", () => {
    const model = new GridModel();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: '""' });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: '","' });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: '" "' });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: '" , "' });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: '" 42  "' });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: '" 42 , 24  "' });
    model.dispatch({ type: "SET_VALUE", xc: "A7", text: '" 43 ,     "' });
    model.dispatch({ type: "SET_VALUE", xc: "A8", text: '" 44   45  "' });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: '=""' });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: '=","' });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: '=" "' });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: '=" , "' });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: '=" 42  "' });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: '=" 42 , 24  "' });
    model.dispatch({ type: "SET_VALUE", xc: "B7", text: '=" 43 ,     "' });
    model.dispatch({ type: "SET_VALUE", xc: "B8", text: '=" 44   45  "' });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: '=SUM("")' });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: '=SUM(",")' });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: '=SUM(" ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: '=SUM(" , ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: '=SUM(" 42  ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: '=SUM(" 42 , 24  ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C7", text: '=SUM(" 43 ,     ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C8", text: '=SUM(" 44   45  ")' });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: '=COUNT("")' });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: '=COUNT(",")' });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: '=COUNT(" ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: '=COUNT(" , ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: '=COUNT(" 42  ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: '=COUNT(" 42 , 24  ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D7", text: '=COUNT(" 43 ,     ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D8", text: '=COUNT(" 44   45  ")' });

    expect(model.workbook.cells.A1.value).toBe('""');
    expect(model.workbook.cells.A2.value).toBe('","');
    expect(model.workbook.cells.A3.value).toBe('" "');
    expect(model.workbook.cells.A4.value).toBe('" , "');
    expect(model.workbook.cells.A5.value).toBe('" 42  "');
    expect(model.workbook.cells.A6.value).toBe('" 42 , 24  "');
    expect(model.workbook.cells.A7.value).toBe('" 43 ,     "');
    expect(model.workbook.cells.A8.value).toBe('" 44   45  "');

    expect(model.workbook.cells.B1.value).toBe("");
    expect(model.workbook.cells.B2.value).toBe(",");
    expect(model.workbook.cells.B3.value).toBe(" ");
    expect(model.workbook.cells.B4.value).toBe(" , ");
    expect(model.workbook.cells.B5.value).toBe(" 42  ");
    expect(model.workbook.cells.B6.value).toBe(" 42 , 24  ");
    expect(model.workbook.cells.B7.value).toBe(" 43 ,     ");
    expect(model.workbook.cells.B8.value).toBe(" 44   45  ");

    expect(model.workbook.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C3.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C4.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C5.value).toBe(42);
    expect(model.workbook.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C7.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C8.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(model.workbook.cells.D1.value).toBe(0);
    expect(model.workbook.cells.D2.value).toBe(0);
    expect(model.workbook.cells.D3.value).toBe(0);
    expect(model.workbook.cells.D4.value).toBe(0);
    expect(model.workbook.cells.D5.value).toBe(1);
    expect(model.workbook.cells.D6.value).toBe(0);
    expect(model.workbook.cells.D7.value).toBe(0);
    expect(model.workbook.cells.D8.value).toBe(0);
  });

  test("various expressions with dot", () => {
    const model = new GridModel();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "4.2" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "4." });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: ".2" });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "=4.2" });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "=4." });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "=.2" });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(4.2)" });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: "=SUM(4.)" });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: "=SUM(.2)" });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: "=COUNT(4.2)" });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: "=COUNT(4.)" });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: "=COUNT(.2)" });

    expect(model.workbook.cells.A1.value).toBe(4.2);
    expect(model.workbook.cells.A2.value).toBe(4);
    expect(model.workbook.cells.A3.value).toBe(0.2);

    expect(model.workbook.cells.B1.value).toBe(4.2);
    expect(model.workbook.cells.B2.value).toBe(4);
    expect(model.workbook.cells.B3.value).toBe(0.2);

    expect(model.workbook.cells.C1.value).toBe(4.2);
    expect(model.workbook.cells.C2.value).toBe(4);
    expect(model.workbook.cells.C3.value).toBe(0.2);

    expect(model.workbook.cells.D1.value).toBe(1);
    expect(model.workbook.cells.D2.value).toBe(1);
    expect(model.workbook.cells.D3.value).toBe(1);
  });

  test("various string expressions with dot", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: '"4.2"' });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: '"4."' });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: '".2"' });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: '="4.2"' });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: '="4."' });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: '=".2"' });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: '=SUM("4.2")' });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: '=SUM("4.")' });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: '=SUM(".2")' });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: '=COUNT("4.2")' });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: '=COUNT("4.")' });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: '=COUNT(".2")' });

    expect(model.workbook.cells.A1.value).toBe('"4.2"');
    expect(model.workbook.cells.A2.value).toBe('"4."');
    expect(model.workbook.cells.A3.value).toBe('".2"');

    expect(model.workbook.cells.B1.value).toBe("4.2");
    expect(model.workbook.cells.B2.value).toBe("4.");
    expect(model.workbook.cells.B3.value).toBe(".2");

    expect(model.workbook.cells.C1.value).toBe(4.2);
    expect(model.workbook.cells.C2.value).toBe(4);
    expect(model.workbook.cells.C3.value).toBe(0.2);

    expect(model.workbook.cells.D1.value).toBe(1);
    expect(model.workbook.cells.D2.value).toBe(1);
    expect(model.workbook.cells.D3.value).toBe(1);
  });

  test("various expressions with dot and whitespace", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "42 .24" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "42. 24" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "42 ." });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "42. " });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: " .24" });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: ". 24" });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "=42 .24" });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "=42. 24" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "=42 ." });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: "=42. " });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: "= .24" });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: "=. 24" });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(42 .24)" });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: "=SUM(42. 24)" });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: "=SUM(42 .)" });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: "=SUM(42. )" });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: "=SUM( .24)" });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: "=SUM(. 24)" });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: "=COUNT(42 .24)" });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: "=COUNT(42. 24)" });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: "=COUNT(42 .)" });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: "=COUNT(42. )" });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: "=COUNT( .24)" });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: "=COUNT(. 24)" });

    expect(model.workbook.cells.A1.value).toBe("42 .24");
    expect(model.workbook.cells.A2.value).toBe("42. 24");
    expect(model.workbook.cells.A3.value).toBe("42 .");
    expect(model.workbook.cells.A4.value).toBe(42);
    expect(model.workbook.cells.A5.value).toBe(0.24);
    expect(model.workbook.cells.A6.value).toBe(". 24");

    expect(model.workbook.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B4.value).toBe(42);
    expect(model.workbook.cells.B5.value).toBe(0.24);
    expect(model.workbook.cells.B6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.workbook.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.C2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.C3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.C4.value).toBe(42);
    expect(model.workbook.cells.C5.value).toBe(0.24);
    expect(model.workbook.cells.C6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(model.workbook.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.D2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.D3.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.D4.value).toBe(1);
    expect(model.workbook.cells.D5.value).toBe(1);
    expect(model.workbook.cells.D6.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with dot and whitespace", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: '"42 .24"' });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: '"42. 24"' });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: '"42 ."' });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: '"42. "' });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: '" .24"' });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: '". 24"' });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: '="42 .24"' });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: '="42. 24"' });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: '="42 ."' });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: '="42. "' });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: '=" .24"' });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: '=". 24"' });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: '=SUM("42 .24")' });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: '=SUM("42. 24")' });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: '=SUM("42 .")' });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: '=SUM("42. ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: '=SUM(" .24")' });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: '=SUM(". 24")' });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: '=COUNT("42 .24")' });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: '=COUNT("42. 24")' });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: '=COUNT("42 .")' });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: '=COUNT("42. ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: '=COUNT(" .24")' });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: '=COUNT(". 24")' });

    expect(model.workbook.cells.A1.value).toBe('"42 .24"');
    expect(model.workbook.cells.A2.value).toBe('"42. 24"');
    expect(model.workbook.cells.A3.value).toBe('"42 ."');
    expect(model.workbook.cells.A4.value).toBe('"42. "');
    expect(model.workbook.cells.A5.value).toBe('" .24"');
    expect(model.workbook.cells.A6.value).toBe('". 24"');

    expect(model.workbook.cells.B1.value).toBe("42 .24");
    expect(model.workbook.cells.B2.value).toBe("42. 24");
    expect(model.workbook.cells.B3.value).toBe("42 .");
    expect(model.workbook.cells.B4.value).toBe("42. ");
    expect(model.workbook.cells.B5.value).toBe(" .24");
    expect(model.workbook.cells.B6.value).toBe(". 24");

    expect(model.workbook.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C3.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C4.value).toBe(42);
    expect(model.workbook.cells.C5.value).toBe(0.24);
    expect(model.workbook.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(model.workbook.cells.D1.value).toBe(0);
    expect(model.workbook.cells.D2.value).toBe(0);
    expect(model.workbook.cells.D3.value).toBe(0);
    expect(model.workbook.cells.D4.value).toBe(1);
    expect(model.workbook.cells.D5.value).toBe(1);
    expect(model.workbook.cells.D6.value).toBe(0);
  });

  test("various expressions with percent, dot and whitespace", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "%" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: " %" });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: "40%" });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: " 41% " });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: "42 %" });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: " 43 % " });
    model.dispatch({ type: "SET_VALUE", xc: "A7", text: "4.1%" });
    model.dispatch({ type: "SET_VALUE", xc: "A8", text: " 4.2% " });
    model.dispatch({ type: "SET_VALUE", xc: "A9", text: ".1%" });
    model.dispatch({ type: "SET_VALUE", xc: "A10", text: " .2% " });
    model.dispatch({ type: "SET_VALUE", xc: "A11", text: "3.%" });
    model.dispatch({ type: "SET_VALUE", xc: "A12", text: " 4.% " });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "=%" });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "= %" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "=40%" });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: "= 41% " });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: "=42 %" });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: "= 43 % " });
    model.dispatch({ type: "SET_VALUE", xc: "B7", text: "=4.1%" });
    model.dispatch({ type: "SET_VALUE", xc: "B8", text: "= 4.2% " });
    model.dispatch({ type: "SET_VALUE", xc: "B9", text: "=.1%" });
    model.dispatch({ type: "SET_VALUE", xc: "B10", text: "= .2% " });
    model.dispatch({ type: "SET_VALUE", xc: "B11", text: "=3.%" });
    model.dispatch({ type: "SET_VALUE", xc: "B12", text: "= 4.% " });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: "=SUM(%)" });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: "=SUM( %)" });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: "=SUM(40%)" });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: "=SUM( 41% )" });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: "=SUM(42 %)" });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: "=SUM( 43 % )" });
    model.dispatch({ type: "SET_VALUE", xc: "C7", text: "=SUM(4.1%)" });
    model.dispatch({ type: "SET_VALUE", xc: "C8", text: "=SUM( 4.2% )" });
    model.dispatch({ type: "SET_VALUE", xc: "C9", text: "=SUM(.1%)" });
    model.dispatch({ type: "SET_VALUE", xc: "C10", text: "=SUM( .2% )" });
    model.dispatch({ type: "SET_VALUE", xc: "C11", text: "=SUM(3.%)" });
    model.dispatch({ type: "SET_VALUE", xc: "C12", text: "=SUM( 4.% )" });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: "=COUNT(%)" });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: "=COUNT( %)" });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: "=COUNT(40%)" });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: "=COUNT( 41% )" });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: "=COUNT(42 %)" });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: "=COUNT( 43 % )" });
    model.dispatch({ type: "SET_VALUE", xc: "D7", text: "=COUNT(4.1%)" });
    model.dispatch({ type: "SET_VALUE", xc: "D8", text: "=COUNT( 4.2% )" });
    model.dispatch({ type: "SET_VALUE", xc: "D9", text: "=COUNT(.1%)" });
    model.dispatch({ type: "SET_VALUE", xc: "D10", text: "=COUNT( .2% )" });
    model.dispatch({ type: "SET_VALUE", xc: "D11", text: "=COUNT(3.%)" });
    model.dispatch({ type: "SET_VALUE", xc: "D12", text: "=COUNT( 4.% )" });

    expect(model.workbook.cells.A1.value).toBe("%");
    expect(model.workbook.cells.A2.value).toBe(" %");
    expect(model.workbook.cells.A3.value).toBe(0.4);
    expect(model.workbook.cells.A4.value).toBe(0.41);
    expect(model.workbook.cells.A5.value).toBe("42 %");
    expect(model.workbook.cells.A6.value).toBe(" 43 % ");
    expect(model.workbook.cells.A7.value).toBeCloseTo(0.041, 3);
    expect(model.workbook.cells.A8.value).toBe(0.042);
    expect(model.workbook.cells.A9.value).toBe(0.001);
    expect(model.workbook.cells.A10.value).toBe(0.002);
    expect(model.workbook.cells.A11.value).toBe(0.03);
    expect(model.workbook.cells.A12.value).toBe(0.04);

    expect(model.workbook.cells.B1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.B3.value).toBe(0.4);
    expect(model.workbook.cells.B4.value).toBe(0.41);
    expect(model.workbook.cells.B5.value).toBe(0.42);
    expect(model.workbook.cells.B6.value).toBe(0.43);
    expect(model.workbook.cells.B7.value).toBeCloseTo(0.041, 3);
    expect(model.workbook.cells.B8.value).toBe(0.042);
    expect(model.workbook.cells.B9.value).toBe(0.001);
    expect(model.workbook.cells.B10.value).toBe(0.002);
    expect(model.workbook.cells.B11.value).toBe(0.03);
    expect(model.workbook.cells.B12.value).toBe(0.04);

    expect(model.workbook.cells.C1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.C2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.C3.value).toBe(0.4);
    expect(model.workbook.cells.C4.value).toBe(0.41);
    expect(model.workbook.cells.C5.value).toBe(0.42);
    expect(model.workbook.cells.C6.value).toBe(0.43);
    expect(model.workbook.cells.C7.value).toBeCloseTo(0.041, 3);
    expect(model.workbook.cells.C8.value).toBe(0.042);
    expect(model.workbook.cells.C9.value).toBe(0.001);
    expect(model.workbook.cells.C10.value).toBe(0.002);
    expect(model.workbook.cells.C11.value).toBe(0.03);
    expect(model.workbook.cells.C12.value).toBe(0.04);

    expect(model.workbook.cells.D1.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.D2.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(model.workbook.cells.D3.value).toBe(1);
    expect(model.workbook.cells.D4.value).toBe(1);
    expect(model.workbook.cells.D5.value).toBe(1);
    expect(model.workbook.cells.D6.value).toBe(1);
    expect(model.workbook.cells.D7.value).toBe(1);
    expect(model.workbook.cells.D8.value).toBe(1);
    expect(model.workbook.cells.D9.value).toBe(1);
    expect(model.workbook.cells.D10.value).toBe(1);
    expect(model.workbook.cells.D11.value).toBe(1);
    expect(model.workbook.cells.D12.value).toBe(1);
  });

  test("various string expressions with percent, dot and whitespace", () => {
    const model = new GridModel();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: '"%"' });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: '" %"' });
    model.dispatch({ type: "SET_VALUE", xc: "A3", text: '"40%"' });
    model.dispatch({ type: "SET_VALUE", xc: "A4", text: '" 41% "' });
    model.dispatch({ type: "SET_VALUE", xc: "A5", text: '"42 %"' });
    model.dispatch({ type: "SET_VALUE", xc: "A6", text: '" 43 % "' });
    model.dispatch({ type: "SET_VALUE", xc: "A7", text: '"4.1%"' });
    model.dispatch({ type: "SET_VALUE", xc: "A8", text: '" 4.2% "' });
    model.dispatch({ type: "SET_VALUE", xc: "A9", text: '".1%"' });
    model.dispatch({ type: "SET_VALUE", xc: "A10", text: '" .2% "' });
    model.dispatch({ type: "SET_VALUE", xc: "A11", text: '"3.%"' });
    model.dispatch({ type: "SET_VALUE", xc: "A12", text: '" 4.% "' });

    model.dispatch({ type: "SET_VALUE", xc: "B1", text: '="%"' });
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: '=" %"' });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: '="40%"' });
    model.dispatch({ type: "SET_VALUE", xc: "B4", text: '=" 41% "' });
    model.dispatch({ type: "SET_VALUE", xc: "B5", text: '="42 %"' });
    model.dispatch({ type: "SET_VALUE", xc: "B6", text: '=" 43 % "' });
    model.dispatch({ type: "SET_VALUE", xc: "B7", text: '="4.1%"' });
    model.dispatch({ type: "SET_VALUE", xc: "B8", text: '=" 4.2% "' });
    model.dispatch({ type: "SET_VALUE", xc: "B9", text: '=".1%"' });
    model.dispatch({ type: "SET_VALUE", xc: "B10", text: '=" .2% "' });
    model.dispatch({ type: "SET_VALUE", xc: "B11", text: '="3.%"' });
    model.dispatch({ type: "SET_VALUE", xc: "B12", text: '=" 4.% "' });

    model.dispatch({ type: "SET_VALUE", xc: "C1", text: '=SUM("%")' });
    model.dispatch({ type: "SET_VALUE", xc: "C2", text: '=SUM(" %")' });
    model.dispatch({ type: "SET_VALUE", xc: "C3", text: '=SUM("40%")' });
    model.dispatch({ type: "SET_VALUE", xc: "C4", text: '=SUM(" 41% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C5", text: '=SUM("42 %")' });
    model.dispatch({ type: "SET_VALUE", xc: "C6", text: '=SUM(" 43 % ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C7", text: '=SUM("4.1%")' });
    model.dispatch({ type: "SET_VALUE", xc: "C8", text: '=SUM(" 4.2% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C9", text: '=SUM(".1%")' });
    model.dispatch({ type: "SET_VALUE", xc: "C10", text: '=SUM(" .2% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "C11", text: '=SUM("3.%")' });
    model.dispatch({ type: "SET_VALUE", xc: "C12", text: '=SUM(" 4.% ")' });

    model.dispatch({ type: "SET_VALUE", xc: "D1", text: '=COUNT("%")' });
    model.dispatch({ type: "SET_VALUE", xc: "D2", text: '=COUNT(" %")' });
    model.dispatch({ type: "SET_VALUE", xc: "D3", text: '=COUNT("40%")' });
    model.dispatch({ type: "SET_VALUE", xc: "D4", text: '=COUNT(" 41% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D5", text: '=COUNT("42 %")' });
    model.dispatch({ type: "SET_VALUE", xc: "D6", text: '=COUNT(" 43 % ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D7", text: '=COUNT("4.1%")' });
    model.dispatch({ type: "SET_VALUE", xc: "D8", text: '=COUNT(" 4.2% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D9", text: '=COUNT(".1%")' });
    model.dispatch({ type: "SET_VALUE", xc: "D10", text: '=COUNT(" .2% ")' });
    model.dispatch({ type: "SET_VALUE", xc: "D11", text: '=COUNT("3.%")' });
    model.dispatch({ type: "SET_VALUE", xc: "D12", text: '=COUNT(" 4.% ")' });

    expect(model.workbook.cells.A1.value).toBe('"%"');
    expect(model.workbook.cells.A2.value).toBe('" %"');
    expect(model.workbook.cells.A3.value).toBe('"40%"');
    expect(model.workbook.cells.A4.value).toBe('" 41% "');
    expect(model.workbook.cells.A5.value).toBe('"42 %"');
    expect(model.workbook.cells.A6.value).toBe('" 43 % "');
    expect(model.workbook.cells.A7.value).toBe('"4.1%"');
    expect(model.workbook.cells.A8.value).toBe('" 4.2% "');
    expect(model.workbook.cells.A9.value).toBe('".1%"');
    expect(model.workbook.cells.A10.value).toBe('" .2% "');
    expect(model.workbook.cells.A11.value).toBe('"3.%"');
    expect(model.workbook.cells.A12.value).toBe('" 4.% "');

    expect(model.workbook.cells.B1.value).toBe("%");
    expect(model.workbook.cells.B2.value).toBe(" %");
    expect(model.workbook.cells.B3.value).toBe("40%");
    expect(model.workbook.cells.B4.value).toBe(" 41% ");
    expect(model.workbook.cells.B5.value).toBe("42 %");
    expect(model.workbook.cells.B6.value).toBe(" 43 % ");
    expect(model.workbook.cells.B7.value).toBe("4.1%");
    expect(model.workbook.cells.B8.value).toBe(" 4.2% ");
    expect(model.workbook.cells.B9.value).toBe(".1%");
    expect(model.workbook.cells.B10.value).toBe(" .2% ");
    expect(model.workbook.cells.B11.value).toBe("3.%");
    expect(model.workbook.cells.B12.value).toBe(" 4.% ");

    expect(model.workbook.cells.C1.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C2.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C3.value).toBe(0.4);
    expect(model.workbook.cells.C4.value).toBe(0.41);
    expect(model.workbook.cells.C5.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C6.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C7.value).toBeCloseTo(0.041, 3);
    expect(model.workbook.cells.C8.value).toBe(0.042); // @compatibility: on google sheet, return #VALUE!
    expect(model.workbook.cells.C9.value).toBe(0.001);
    expect(model.workbook.cells.C10.value).toBe(0.002);
    expect(model.workbook.cells.C11.value).toBe(0.03);
    expect(model.workbook.cells.C12.value).toBe(0.04);

    expect(model.workbook.cells.D1.value).toBe(0);

    expect(model.workbook.cells.D2.value).toBe(0);
    expect(model.workbook.cells.D3.value).toBe(1);
    expect(model.workbook.cells.D4.value).toBe(1);
    expect(model.workbook.cells.D5.value).toBe(0);
    expect(model.workbook.cells.D6.value).toBe(0);
    expect(model.workbook.cells.D7.value).toBe(1);
    expect(model.workbook.cells.D8.value).toBe(1);
    expect(model.workbook.cells.D9.value).toBe(1);
    expect(model.workbook.cells.D10.value).toBe(1);
    expect(model.workbook.cells.D11.value).toBe(1);
    expect(model.workbook.cells.D12.value).toBe(1);
  });

  // TO DO: add tests for exp format (ex: 4E10)
  // RO DO: add tests for DATE string format (ex match: "28 02 2020")
});
