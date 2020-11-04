import { Model } from "../../src/model";
import "../canvas.mock";
import { evaluateCell, evaluateGrid, getCell, setCellContent } from "../helpers";

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const grid = { A1: "1", B1: "2", C1: "=SUM(A1,B1)" };
    expect(evaluateCell("C1", grid)).toBe(3);
  });

  test("Various numbers representations", () => {
    const grid = {
      A1: "1",
      A2: "1.1",
      A3: "1,234",
      A4: "1,234.43",
      A5: ".3",
      B1: "1%",
      B2: "1.5%",
      B3: "-3.3%",
      C1: "1.2e4",
      C2: "1e5",
      C3: "-1e3",
      D1: "1.1.1", // not a number
    };
    expect(evaluateGrid(grid)).toEqual({
      A1: 1,
      A2: 1.1,
      A3: 1234,
      A4: 1234.43,
      A5: 0.3,
      B1: 0.01,
      B2: 0.015,
      B3: -0.033,
      C1: 12000,
      C2: 100000,
      C3: -1000,
      D1: "1.1.1",
    });
  });

  test("Various numbers representations in formulas", () => {
    const grid = {
      A1: "=1",
      A2: "=1.1",
      A3: "=1,234",
      A4: "=1,234.43",
      A5: "=.3",
      B1: "=1%",
      B2: "=1.5%",
      B3: "=-3.3%",
      C1: "=1.2e4",
      C2: "=1e5",
      C3: "=-1e3",
      D1: "=1.1.1", // not a number
    };
    expect(evaluateGrid(grid)).toEqual({
      A1: 1,
      A2: 1.1,
      A3: "#BAD_EXPR", // commas are not allowed as thousand separator in formulas
      A4: "#BAD_EXPR",
      A5: 0.3,
      B1: 0.01,
      B2: 0.015,
      B3: -0.033,
      C1: 12000,
      C2: 100000,
      C3: -1000,
      D1: "#BAD_EXPR",
    });
  });

  test("With empty content", () => {
    const grid = { A1: "1", B1: "", C1: "=SUM(A1,B1)" };
    expect(evaluateCell("C1", grid)).toBe(1);
  });

  test("With empty cell", () => {
    const grid = { A1: "1", C1: "=SUM(A1,B1)" };
    expect(evaluateCell("C1", grid)).toBe(1);
  });

  test("handling some errors", () => {
    const grid = { A1: "=A1", A2: "=A1", A3: "=+", A4: "=1 + A3", A5: "=sum('asdf')" };
    const result = evaluateGrid(grid);
    expect(result.A1).toBe("#CYCLE");
    expect(result.A2).toBe("#ERROR");
    expect(result.A3).toBe("#BAD_EXPR");
    expect(result.A4).toBe("#ERROR");
    expect(result.A5).toBe("#BAD_EXPR");
  });

  test("error in some function calls", () => {
    const model = new Model();
    setCellContent(model, "A1", '=Sum("asdf")');

    expect(getCell(model, "A1")!.value).toBe("#ERROR");
    expect(getCell(model, "A1")!.error).toBe(
      `The function SUM expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );

    setCellContent(model, "A1", "=DECIMAL(1,100)");
    expect(getCell(model, "A1")!.error).toBe(
      `Function DECIMAL expects the parameter 'base' to be between 2 and 36 inclusive. Change 'base' from [100] to a value between 2 and 36.`
    );
  });

  test("error in an addition", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1+A2");

    expect(getCell(model, "A3")!.value).toBe(3);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.error).toBe(
      `The function ADD expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.value).toBe(43);
  });

  test("error in an subtraction", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1-A2");

    expect(getCell(model, "A3")!.value).toBe(-1);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.error).toBe(
      `The function MINUS expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1*A2");

    expect(getCell(model, "A3")!.value).toBe(2);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1/A2");

    expect(getCell(model, "A3")!.value).toBe(0.5);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A1", "30");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.value).toBe(3);
  });

  test("error in range vlookup", () => {
    const model = new Model();
    expect(model.getters.getActiveSheet().rowNumber).toBeLessThan(200);
    setCellContent(model, "A1", "=VLOOKUP(D12, A2:A200, 2, false)");

    expect(getCell(model, "A1")!.error!.toString()).toBe(
      "VLOOKUP evaluates to an out of bounds range."
    );
  });

  test("range", () => {
    const model = new Model();
    setCellContent(model, "D4", "42");
    setCellContent(model, "A1", "=sum(A2:Z10)");

    expect(getCell(model, "A1")!.value).toBe(42);
  });

  test("=Range", () => {
    const model = new Model();
    setCellContent(model, "A1", "=A2:A3");
    expect(getCell(model, "A1")!.value).toBe("#ERROR");
  });

  test("misc math formulas", () => {
    const model = new Model();
    setCellContent(model, "A1", "42");
    setCellContent(model, "A2", "2");
    setCellContent(model, "B3", "2.3");
    setCellContent(model, "C1", "=countblank(A1:A10)");
    setCellContent(model, "C2", "=sum(A1,B1)");
    setCellContent(model, "C3", "=countblank(B1:A1)");
    setCellContent(model, "C4", "=floor(B3)");
    setCellContent(model, "C5", "=floor(A8)");
    setCellContent(model, "C6", "=sum(A1:A4,B1:B5)");

    expect(getCell(model, "C1")!.value).toBe(8);
    expect(getCell(model, "C2")!.value).toBe(42);
    expect(getCell(model, "C3")!.value).toBe(1);
    expect(getCell(model, "C4")!.value).toBe(2);
    expect(getCell(model, "C5")!.value).toBe(0);
    expect(getCell(model, "C6")!.value).toBe(46.3);
  });

  test("priority of operations", () => {
    const model = new Model();
    setCellContent(model, "A1", "=1 + 2 * 3");
    setCellContent(model, "A2", "=-2*-2");
    setCellContent(model, "A3", "=-2^2");
    setCellContent(model, "A4", "=-2^2 + 3");
    setCellContent(model, "A5", "= - 1 + - 2 * - 3");

    expect(getCell(model, "A1")!.value).toBe(7);
    expect(getCell(model, "A2")!.value).toBe(4);
    expect(getCell(model, "A3")!.value).toBe(-4);
    expect(getCell(model, "A4")!.value).toBe(-1);
    expect(getCell(model, "A5")!.value).toBe(5);
  });

  test("& operator", () => {
    expect(evaluateCell("A1", { A1: "=A2&A3", A2: "abc", A3: "def" })).toBe("abcdef");
  });

  test("<> operator", () => {
    expect(evaluateCell("A1", { A1: "=A2<>A3", A2: "abc", A3: "def" })).toBe(true);
  });

  test("if with sub expressions", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2>0,1,2)", A2: "0" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2>0,1,2)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(AND(A2>0,A3>0),1,2)", A2: "1", A3: "0" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(AND(A2>0,A3>0),1,2)", A2: "1", A3: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(A2>=SUM(A2,A3),1,2)", A2: "1", A3: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(A2>SUM(A2,A3),1,2)", A2: "1", A3: "1" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2=0,1+1,sum(A2,A3))", A2: "0", A3: "10" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2<>0,1+1,sum(A2,A3))", A2: "0", A3: "10" })).toBe(10);
  });

  test("various expressions with boolean", () => {
    const model = new Model();

    setCellContent(model, "A1", "FALSE");
    setCellContent(model, "A2", "TRUE");
    setCellContent(model, "A3", "false");
    setCellContent(model, "A4", "true");
    setCellContent(model, "A5", "FaLsE");
    setCellContent(model, "A6", "TrUe");

    expect(getCell(model, "A1")!.value).toBe(false);
    expect(getCell(model, "A2")!.value).toBe(true);
    expect(getCell(model, "A3")!.value).toBe(false);
    expect(getCell(model, "A4")!.value).toBe(true);
    expect(getCell(model, "A5")!.value).toBe(false);
    expect(getCell(model, "A6")!.value).toBe(true);

    setCellContent(model, "B1", "=FALSE");
    setCellContent(model, "B2", "=TRUE");
    setCellContent(model, "B3", "=false");
    setCellContent(model, "B4", "=true");
    setCellContent(model, "B5", "=FaLsE");
    setCellContent(model, "B6", "=TrUe");

    expect(getCell(model, "B1")!.value).toBe(false);
    expect(getCell(model, "B2")!.value).toBe(true);
    expect(getCell(model, "B3")!.value).toBe(false);
    expect(getCell(model, "B4")!.value).toBe(true);
    expect(getCell(model, "B5")!.value).toBe(false);
    expect(getCell(model, "B6")!.value).toBe(true);

    setCellContent(model, "A1", " FALSE ");
    setCellContent(model, "A2", " TRUE ");
    setCellContent(model, "A3", " false ");
    setCellContent(model, "A4", " true ");
    setCellContent(model, "A5", " FaLsE ");
    setCellContent(model, "A6", " TrUe ");

    expect(getCell(model, "A1")!.value).toBe(" FALSE ");
    expect(getCell(model, "A2")!.value).toBe(" TRUE ");
    expect(getCell(model, "A3")!.value).toBe(" false ");
    expect(getCell(model, "A4")!.value).toBe(" true ");
    expect(getCell(model, "A5")!.value).toBe(" FaLsE ");
    expect(getCell(model, "A6")!.value).toBe(" TrUe ");

    setCellContent(model, "B1", "= FALSE ");
    setCellContent(model, "B2", "= TRUE ");
    setCellContent(model, "B3", "= false ");
    setCellContent(model, "B4", "= true ");
    setCellContent(model, "B5", "= FaLsE ");
    setCellContent(model, "B6", "= TrUe ");

    expect(getCell(model, "B1")!.value).toBe(false);
    expect(getCell(model, "B2")!.value).toBe(true);
    expect(getCell(model, "B3")!.value).toBe(false);
    expect(getCell(model, "B4")!.value).toBe(true);
    expect(getCell(model, "B5")!.value).toBe(false);
    expect(getCell(model, "B6")!.value).toBe(true);
  });

  test("various expressions with whitespace", () => {
    const model = new Model();

    setCellContent(model, "A1", "");
    setCellContent(model, "A2", ",");
    setCellContent(model, "A3", " ");
    setCellContent(model, "A4", " , ");
    setCellContent(model, "A5", " 42 ");
    setCellContent(model, "A6", " 42 , 24  ");
    setCellContent(model, "A7", " 43 ,     ");
    setCellContent(model, "A8", " 44   45  ");

    setCellContent(model, "B1", "=");
    setCellContent(model, "B2", "=,");
    setCellContent(model, "B3", "= ");
    setCellContent(model, "B4", "= , ");
    setCellContent(model, "B5", "= 42 ");
    setCellContent(model, "B6", "= 42 , 24  ");
    setCellContent(model, "B7", "= 43 ,     ");
    setCellContent(model, "B8", "= 44   45  ");

    setCellContent(model, "C1", "=SUM()");
    setCellContent(model, "C2", "=SUM(,)");
    setCellContent(model, "C3", "=SUM( )");
    setCellContent(model, "C4", "=SUM( , )");
    setCellContent(model, "C5", "=SUM( 42 )");
    setCellContent(model, "C6", "=SUM( 42 , 24  )");
    setCellContent(model, "C7", "=SUM( 43 ,     )");
    setCellContent(model, "C8", "=SUM( 44   45  )");

    setCellContent(model, "D1", "=COUNT()");
    setCellContent(model, "D2", "=COUNT(,)");
    setCellContent(model, "D3", "=COUNT( )");
    setCellContent(model, "D4", "=COUNT( , )");
    setCellContent(model, "D5", "=COUNT( 42 )");
    setCellContent(model, "D6", "=COUNT( 42 , 24  )");
    setCellContent(model, "D7", "=COUNT( 43 ,     )");
    setCellContent(model, "D8", "=COUNT( 44   45  )");

    expect(getCell(model, "A1")!).toBeUndefined();
    expect(getCell(model, "A2")!.value).toBe(",");
    expect(getCell(model, "A3")!.value).toBe(" ");
    expect(getCell(model, "A4")!.value).toBe(" , ");
    expect(getCell(model, "A5")!.value).toBe(42);
    expect(getCell(model, "A6")!.value).toBe(" 42 , 24  ");
    expect(getCell(model, "A7")!.value).toBe(" 43 ,     ");
    expect(getCell(model, "A8")!.value).toBe(" 44   45  ");

    expect(getCell(model, "B1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B4")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B5")!.value).toBe(42);
    expect(getCell(model, "B6")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B7")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B8")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "C1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "C2")!.value).toBe(0);
    expect(getCell(model, "C3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "C4")!.value).toBe(0);
    expect(getCell(model, "C5")!.value).toBe(42);
    expect(getCell(model, "C6")!.value).toBe(66);
    expect(getCell(model, "C7")!.value).toBe(43);
    expect(getCell(model, "C8")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "D1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "D2")!.value).toBe(2);
    expect(getCell(model, "D3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "D4")!.value).toBe(2);
    expect(getCell(model, "D5")!.value).toBe(1);
    expect(getCell(model, "D6")!.value).toBe(2);
    expect(getCell(model, "D7")!.value).toBe(2);
    expect(getCell(model, "D8")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with whitespace", () => {
    const model = new Model();

    setCellContent(model, "A1", '""');
    setCellContent(model, "A2", '","');
    setCellContent(model, "A3", '" "');
    setCellContent(model, "A4", '" , "');
    setCellContent(model, "A5", '" 42  "');
    setCellContent(model, "A6", '" 42 , 24  "');
    setCellContent(model, "A7", '" 43 ,     "');
    setCellContent(model, "A8", '" 44   45  "');

    setCellContent(model, "B1", '=""');
    setCellContent(model, "B2", '=","');
    setCellContent(model, "B3", '=" "');
    setCellContent(model, "B4", '=" , "');
    setCellContent(model, "B5", '=" 42  "');
    setCellContent(model, "B6", '=" 42 , 24  "');
    setCellContent(model, "B7", '=" 43 ,     "');
    setCellContent(model, "B8", '=" 44   45  "');

    setCellContent(model, "C1", '=SUM("")');
    setCellContent(model, "C2", '=SUM(",")');
    setCellContent(model, "C3", '=SUM(" ")');
    setCellContent(model, "C4", '=SUM(" , ")');
    setCellContent(model, "C5", '=SUM(" 42  ")');
    setCellContent(model, "C6", '=SUM(" 42 , 24  ")');
    setCellContent(model, "C7", '=SUM(" 43 ,     ")');
    setCellContent(model, "C8", '=SUM(" 44   45  ")');

    setCellContent(model, "D1", '=COUNT("")');
    setCellContent(model, "D2", '=COUNT(",")');
    setCellContent(model, "D3", '=COUNT(" ")');
    setCellContent(model, "D4", '=COUNT(" , ")');
    setCellContent(model, "D5", '=COUNT(" 42  ")');
    setCellContent(model, "D6", '=COUNT(" 42 , 24  ")');
    setCellContent(model, "D7", '=COUNT(" 43 ,     ")');
    setCellContent(model, "D8", '=COUNT(" 44   45  ")');

    expect(getCell(model, "A1")!.value).toBe('""');
    expect(getCell(model, "A2")!.value).toBe('","');
    expect(getCell(model, "A3")!.value).toBe('" "');
    expect(getCell(model, "A4")!.value).toBe('" , "');
    expect(getCell(model, "A5")!.value).toBe('" 42  "');
    expect(getCell(model, "A6")!.value).toBe('" 42 , 24  "');
    expect(getCell(model, "A7")!.value).toBe('" 43 ,     "');
    expect(getCell(model, "A8")!.value).toBe('" 44   45  "');

    expect(getCell(model, "B1")!.value).toBe("");
    expect(getCell(model, "B2")!.value).toBe(",");
    expect(getCell(model, "B3")!.value).toBe(" ");
    expect(getCell(model, "B4")!.value).toBe(" , ");
    expect(getCell(model, "B5")!.value).toBe(" 42  ");
    expect(getCell(model, "B6")!.value).toBe(" 42 , 24  ");
    expect(getCell(model, "B7")!.value).toBe(" 43 ,     ");
    expect(getCell(model, "B8")!.value).toBe(" 44   45  ");

    expect(getCell(model, "C1")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C4")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C5")!.value).toBe(42);
    expect(getCell(model, "C6")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C7")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C8")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(getCell(model, "D1")!.value).toBe(0);
    expect(getCell(model, "D2")!.value).toBe(0);
    expect(getCell(model, "D3")!.value).toBe(0);
    expect(getCell(model, "D4")!.value).toBe(0);
    expect(getCell(model, "D5")!.value).toBe(1);
    expect(getCell(model, "D6")!.value).toBe(0);
    expect(getCell(model, "D7")!.value).toBe(0);
    expect(getCell(model, "D8")!.value).toBe(0);
  });

  test("various expressions with dot", () => {
    const model = new Model();

    setCellContent(model, "A1", "4.2");
    setCellContent(model, "A2", "4.");
    setCellContent(model, "A3", ".2");

    setCellContent(model, "B1", "=4.2");
    setCellContent(model, "B2", "=4.");
    setCellContent(model, "B3", "=.2");

    setCellContent(model, "C1", "=SUM(4.2)");
    setCellContent(model, "C2", "=SUM(4.)");
    setCellContent(model, "C3", "=SUM(.2)");

    setCellContent(model, "D1", "=COUNT(4.2)");
    setCellContent(model, "D2", "=COUNT(4.)");
    setCellContent(model, "D3", "=COUNT(.2)");

    expect(getCell(model, "A1")!.value).toBe(4.2);
    expect(getCell(model, "A2")!.value).toBe(4);
    expect(getCell(model, "A3")!.value).toBe(0.2);

    expect(getCell(model, "B1")!.value).toBe(4.2);
    expect(getCell(model, "B2")!.value).toBe(4);
    expect(getCell(model, "B3")!.value).toBe(0.2);

    expect(getCell(model, "C1")!.value).toBe(4.2);
    expect(getCell(model, "C2")!.value).toBe(4);
    expect(getCell(model, "C3")!.value).toBe(0.2);

    expect(getCell(model, "D1")!.value).toBe(1);
    expect(getCell(model, "D2")!.value).toBe(1);
    expect(getCell(model, "D3")!.value).toBe(1);
  });

  test("various string expressions with dot", () => {
    const model = new Model();
    setCellContent(model, "A1", '"4.2"');
    setCellContent(model, "A2", '"4."');
    setCellContent(model, "A3", '".2"');

    setCellContent(model, "B1", '="4.2"');
    setCellContent(model, "B2", '="4."');
    setCellContent(model, "B3", '=".2"');

    setCellContent(model, "C1", '=SUM("4.2")');
    setCellContent(model, "C2", '=SUM("4.")');
    setCellContent(model, "C3", '=SUM(".2")');

    setCellContent(model, "D1", '=COUNT("4.2")');
    setCellContent(model, "D2", '=COUNT("4.")');
    setCellContent(model, "D3", '=COUNT(".2")');

    expect(getCell(model, "A1")!.value).toBe('"4.2"');
    expect(getCell(model, "A2")!.value).toBe('"4."');
    expect(getCell(model, "A3")!.value).toBe('".2"');

    expect(getCell(model, "B1")!.value).toBe("4.2");
    expect(getCell(model, "B2")!.value).toBe("4.");
    expect(getCell(model, "B3")!.value).toBe(".2");

    expect(getCell(model, "C1")!.value).toBe(4.2);
    expect(getCell(model, "C2")!.value).toBe(4);
    expect(getCell(model, "C3")!.value).toBe(0.2);

    expect(getCell(model, "D1")!.value).toBe(1);
    expect(getCell(model, "D2")!.value).toBe(1);
    expect(getCell(model, "D3")!.value).toBe(1);
  });

  test("various expressions with dot and whitespace", () => {
    const model = new Model();
    setCellContent(model, "A1", "42 .24");
    setCellContent(model, "A2", "42. 24");
    setCellContent(model, "A3", "42 .");
    setCellContent(model, "A4", "42. ");
    setCellContent(model, "A5", " .24");
    setCellContent(model, "A6", ". 24");

    setCellContent(model, "B1", "=42 .24");
    setCellContent(model, "B2", "=42. 24");
    setCellContent(model, "B3", "=42 .");
    setCellContent(model, "B4", "=42. ");
    setCellContent(model, "B5", "= .24");
    setCellContent(model, "B6", "=. 24");

    setCellContent(model, "C1", "=SUM(42 .24)");
    setCellContent(model, "C2", "=SUM(42. 24)");
    setCellContent(model, "C3", "=SUM(42 .)");
    setCellContent(model, "C4", "=SUM(42. )");
    setCellContent(model, "C5", "=SUM( .24)");
    setCellContent(model, "C6", "=SUM(. 24)");

    setCellContent(model, "D1", "=COUNT(42 .24)");
    setCellContent(model, "D2", "=COUNT(42. 24)");
    setCellContent(model, "D3", "=COUNT(42 .)");
    setCellContent(model, "D4", "=COUNT(42. )");
    setCellContent(model, "D5", "=COUNT( .24)");
    setCellContent(model, "D6", "=COUNT(. 24)");

    expect(getCell(model, "A1")!.value).toBe("42 .24");
    expect(getCell(model, "A2")!.value).toBe("42. 24");
    expect(getCell(model, "A3")!.value).toBe("42 .");
    expect(getCell(model, "A4")!.value).toBe(42);
    expect(getCell(model, "A5")!.value).toBe(0.24);
    expect(getCell(model, "A6")!.value).toBe(". 24");

    expect(getCell(model, "B1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B4")!.value).toBe(42);
    expect(getCell(model, "B5")!.value).toBe(0.24);
    expect(getCell(model, "B6")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "C1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C4")!.value).toBe(42);
    expect(getCell(model, "C5")!.value).toBe(0.24);
    expect(getCell(model, "C6")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "D1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D3")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D4")!.value).toBe(1);
    expect(getCell(model, "D5")!.value).toBe(1);
    expect(getCell(model, "D6")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
  });

  test("various string expressions with dot and whitespace", () => {
    const model = new Model();
    setCellContent(model, "A1", '"42 .24"');
    setCellContent(model, "A2", '"42. 24"');
    setCellContent(model, "A3", '"42 ."');
    setCellContent(model, "A4", '"42. "');
    setCellContent(model, "A5", '" .24"');
    setCellContent(model, "A6", '". 24"');

    setCellContent(model, "B1", '="42 .24"');
    setCellContent(model, "B2", '="42. 24"');
    setCellContent(model, "B3", '="42 ."');
    setCellContent(model, "B4", '="42. "');
    setCellContent(model, "B5", '=" .24"');
    setCellContent(model, "B6", '=". 24"');

    setCellContent(model, "C1", '=SUM("42 .24")');
    setCellContent(model, "C2", '=SUM("42. 24")');
    setCellContent(model, "C3", '=SUM("42 .")');
    setCellContent(model, "C4", '=SUM("42. ")');
    setCellContent(model, "C5", '=SUM(" .24")');
    setCellContent(model, "C6", '=SUM(". 24")');

    setCellContent(model, "D1", '=COUNT("42 .24")');
    setCellContent(model, "D2", '=COUNT("42. 24")');
    setCellContent(model, "D3", '=COUNT("42 .")');
    setCellContent(model, "D4", '=COUNT("42. ")');
    setCellContent(model, "D5", '=COUNT(" .24")');
    setCellContent(model, "D6", '=COUNT(". 24")');

    expect(getCell(model, "A1")!.value).toBe('"42 .24"');
    expect(getCell(model, "A2")!.value).toBe('"42. 24"');
    expect(getCell(model, "A3")!.value).toBe('"42 ."');
    expect(getCell(model, "A4")!.value).toBe('"42. "');
    expect(getCell(model, "A5")!.value).toBe('" .24"');
    expect(getCell(model, "A6")!.value).toBe('". 24"');

    expect(getCell(model, "B1")!.value).toBe("42 .24");
    expect(getCell(model, "B2")!.value).toBe("42. 24");
    expect(getCell(model, "B3")!.value).toBe("42 .");
    expect(getCell(model, "B4")!.value).toBe("42. ");
    expect(getCell(model, "B5")!.value).toBe(" .24");
    expect(getCell(model, "B6")!.value).toBe(". 24");

    expect(getCell(model, "C1")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C4")!.value).toBe(42);
    expect(getCell(model, "C5")!.value).toBe(0.24);
    expect(getCell(model, "C6")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(getCell(model, "D1")!.value).toBe(0);
    expect(getCell(model, "D2")!.value).toBe(0);
    expect(getCell(model, "D3")!.value).toBe(0);
    expect(getCell(model, "D4")!.value).toBe(1);
    expect(getCell(model, "D5")!.value).toBe(1);
    expect(getCell(model, "D6")!.value).toBe(0);
  });

  test("various expressions with percent, dot and whitespace", () => {
    const model = new Model();
    setCellContent(model, "A1", "%");
    setCellContent(model, "A2", " %");
    setCellContent(model, "A3", "40%");
    setCellContent(model, "A4", " 41% ");
    setCellContent(model, "A5", "42 %");
    setCellContent(model, "A6", " 43 % ");
    setCellContent(model, "A7", "4.1%");
    setCellContent(model, "A8", " 4.2% ");
    setCellContent(model, "A9", ".1%");
    setCellContent(model, "A10", " .2% ");
    setCellContent(model, "A11", "3.%");
    setCellContent(model, "A12", " 4.% ");

    setCellContent(model, "B1", "=%");
    setCellContent(model, "B2", "= %");
    setCellContent(model, "B3", "=40%");
    setCellContent(model, "B4", "= 41% ");
    setCellContent(model, "B5", "=42 %");
    setCellContent(model, "B6", "= 43 % ");
    setCellContent(model, "B7", "=4.1%");
    setCellContent(model, "B8", "= 4.2% ");
    setCellContent(model, "B9", "=.1%");
    setCellContent(model, "B10", "= .2% ");
    setCellContent(model, "B11", "=3.%");
    setCellContent(model, "B12", "= 4.% ");

    setCellContent(model, "C1", "=SUM(%)");
    setCellContent(model, "C2", "=SUM( %)");
    setCellContent(model, "C3", "=SUM(40%)");
    setCellContent(model, "C4", "=SUM( 41% )");
    setCellContent(model, "C5", "=SUM(42 %)");
    setCellContent(model, "C6", "=SUM( 43 % )");
    setCellContent(model, "C7", "=SUM(4.1%)");
    setCellContent(model, "C8", "=SUM( 4.2% )");
    setCellContent(model, "C9", "=SUM(.1%)");
    setCellContent(model, "C10", "=SUM( .2% )");
    setCellContent(model, "C11", "=SUM(3.%)");
    setCellContent(model, "C12", "=SUM( 4.% )");

    setCellContent(model, "D1", "=COUNT(%)");
    setCellContent(model, "D2", "=COUNT( %)");
    setCellContent(model, "D3", "=COUNT(40%)");
    setCellContent(model, "D4", "=COUNT( 41% )");
    setCellContent(model, "D5", "=COUNT(42 %)");
    setCellContent(model, "D6", "=COUNT( 43 % )");
    setCellContent(model, "D7", "=COUNT(4.1%)");
    setCellContent(model, "D8", "=COUNT( 4.2% )");
    setCellContent(model, "D9", "=COUNT(.1%)");
    setCellContent(model, "D10", "=COUNT( .2% )");
    setCellContent(model, "D11", "=COUNT(3.%)");
    setCellContent(model, "D12", "=COUNT( 4.% )");

    expect(getCell(model, "A1")!.value).toBe("%");
    expect(getCell(model, "A2")!.value).toBe(" %");
    expect(getCell(model, "A3")!.value).toBe(0.4);
    expect(getCell(model, "A4")!.value).toBe(0.41);
    expect(getCell(model, "A5")!.value).toBe(0.42);
    expect(getCell(model, "A6")!.value).toBe(0.43);
    expect(getCell(model, "A7")!.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "A8")!.value).toBe(0.042);
    expect(getCell(model, "A9")!.value).toBe(0.001);
    expect(getCell(model, "A10")!.value).toBe(0.002);
    expect(getCell(model, "A11")!.value).toBe(0.03);
    expect(getCell(model, "A12")!.value).toBe(0.04);

    expect(getCell(model, "B1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B3")!.value).toBe(0.4);
    expect(getCell(model, "B4")!.value).toBe(0.41);
    expect(getCell(model, "B5")!.value).toBe(0.42);
    expect(getCell(model, "B6")!.value).toBe(0.43);
    expect(getCell(model, "B7")!.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "B8")!.value).toBe(0.042);
    expect(getCell(model, "B9")!.value).toBe(0.001);
    expect(getCell(model, "B10")!.value).toBe(0.002);
    expect(getCell(model, "B11")!.value).toBe(0.03);
    expect(getCell(model, "B12")!.value).toBe(0.04);

    expect(getCell(model, "C1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C3")!.value).toBe(0.4);
    expect(getCell(model, "C4")!.value).toBe(0.41);
    expect(getCell(model, "C5")!.value).toBe(0.42);
    expect(getCell(model, "C6")!.value).toBe(0.43);
    expect(getCell(model, "C7")!.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "C8")!.value).toBe(0.042);
    expect(getCell(model, "C9")!.value).toBe(0.001);
    expect(getCell(model, "C10")!.value).toBe(0.002);
    expect(getCell(model, "C11")!.value).toBe(0.03);
    expect(getCell(model, "C12")!.value).toBe(0.04);

    expect(getCell(model, "D1")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D2")!.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D3")!.value).toBe(1);
    expect(getCell(model, "D4")!.value).toBe(1);
    expect(getCell(model, "D5")!.value).toBe(1);
    expect(getCell(model, "D6")!.value).toBe(1);
    expect(getCell(model, "D7")!.value).toBe(1);
    expect(getCell(model, "D8")!.value).toBe(1);
    expect(getCell(model, "D9")!.value).toBe(1);
    expect(getCell(model, "D10")!.value).toBe(1);
    expect(getCell(model, "D11")!.value).toBe(1);
    expect(getCell(model, "D12")!.value).toBe(1);
  });

  test("various string expressions with percent, dot and whitespace", () => {
    const model = new Model();

    setCellContent(model, "A1", '"%"');
    setCellContent(model, "A2", '" %"');
    setCellContent(model, "A3", '"40%"');
    setCellContent(model, "A4", '" 41% "');
    setCellContent(model, "A5", '"42 %"');
    setCellContent(model, "A6", '" 43 % "');
    setCellContent(model, "A7", '"4.1%"');
    setCellContent(model, "A8", '" 4.2% "');
    setCellContent(model, "A9", '".1%"');
    setCellContent(model, "A10", '" .2% "');
    setCellContent(model, "A11", '"3.%"');
    setCellContent(model, "A12", '" 4.% "');

    setCellContent(model, "B1", '="%"');
    setCellContent(model, "B2", '=" %"');
    setCellContent(model, "B3", '="40%"');
    setCellContent(model, "B4", '=" 41% "');
    setCellContent(model, "B5", '="42 %"');
    setCellContent(model, "B6", '=" 43 % "');
    setCellContent(model, "B7", '="4.1%"');
    setCellContent(model, "B8", '=" 4.2% "');
    setCellContent(model, "B9", '=".1%"');
    setCellContent(model, "B10", '=" .2% "');
    setCellContent(model, "B11", '="3.%"');
    setCellContent(model, "B12", '=" 4.% "');

    setCellContent(model, "C1", '=SUM("%")');
    setCellContent(model, "C2", '=SUM(" %")');
    setCellContent(model, "C3", '=SUM("40%")');
    setCellContent(model, "C4", '=SUM(" 41% ")');
    setCellContent(model, "C5", '=SUM("42 %")');
    setCellContent(model, "C6", '=SUM(" 43 % ")');
    setCellContent(model, "C7", '=SUM("4.1%")');
    setCellContent(model, "C8", '=SUM(" 4.2% ")');
    setCellContent(model, "C9", '=SUM(".1%")');
    setCellContent(model, "C10", '=SUM(" .2% ")');
    setCellContent(model, "C11", '=SUM("3.%")');
    setCellContent(model, "C12", '=SUM(" 4.% ")');

    setCellContent(model, "D1", '=COUNT("%")');
    setCellContent(model, "D2", '=COUNT(" %")');
    setCellContent(model, "D3", '=COUNT("40%")');
    setCellContent(model, "D4", '=COUNT(" 41% ")');
    setCellContent(model, "D5", '=COUNT("42 %")');
    setCellContent(model, "D6", '=COUNT(" 43 % ")');
    setCellContent(model, "D7", '=COUNT("4.1%")');
    setCellContent(model, "D8", '=COUNT(" 4.2% ")');
    setCellContent(model, "D9", '=COUNT(".1%")');
    setCellContent(model, "D10", '=COUNT(" .2% ")');
    setCellContent(model, "D11", '=COUNT("3.%")');
    setCellContent(model, "D12", '=COUNT(" 4.% ")');

    expect(getCell(model, "A1")!.value).toBe('"%"');
    expect(getCell(model, "A2")!.value).toBe('" %"');
    expect(getCell(model, "A3")!.value).toBe('"40%"');
    expect(getCell(model, "A4")!.value).toBe('" 41% "');
    expect(getCell(model, "A5")!.value).toBe('"42 %"');
    expect(getCell(model, "A6")!.value).toBe('" 43 % "');
    expect(getCell(model, "A7")!.value).toBe('"4.1%"');
    expect(getCell(model, "A8")!.value).toBe('" 4.2% "');
    expect(getCell(model, "A9")!.value).toBe('".1%"');
    expect(getCell(model, "A10")!.value).toBe('" .2% "');
    expect(getCell(model, "A11")!.value).toBe('"3.%"');
    expect(getCell(model, "A12")!.value).toBe('" 4.% "');

    expect(getCell(model, "B1")!.value).toBe("%");
    expect(getCell(model, "B2")!.value).toBe(" %");
    expect(getCell(model, "B3")!.value).toBe("40%");
    expect(getCell(model, "B4")!.value).toBe(" 41% ");
    expect(getCell(model, "B5")!.value).toBe("42 %");
    expect(getCell(model, "B6")!.value).toBe(" 43 % ");
    expect(getCell(model, "B7")!.value).toBe("4.1%");
    expect(getCell(model, "B8")!.value).toBe(" 4.2% ");
    expect(getCell(model, "B9")!.value).toBe(".1%");
    expect(getCell(model, "B10")!.value).toBe(" .2% ");
    expect(getCell(model, "B11")!.value).toBe("3.%");
    expect(getCell(model, "B12")!.value).toBe(" 4.% ");

    expect(getCell(model, "C1")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.value).toBe(0.4);
    expect(getCell(model, "C4")!.value).toBe(0.41);
    expect(getCell(model, "C5")!.value).toBe(0.42); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C6")!.value).toBe(0.43); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C7")!.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "C8")!.value).toBe(0.042); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C9")!.value).toBe(0.001);
    expect(getCell(model, "C10")!.value).toBe(0.002);
    expect(getCell(model, "C11")!.value).toBe(0.03);
    expect(getCell(model, "C12")!.value).toBe(0.04);

    expect(getCell(model, "D1")!.value).toBe(0);

    expect(getCell(model, "D2")!.value).toBe(0);
    expect(getCell(model, "D3")!.value).toBe(1);
    expect(getCell(model, "D4")!.value).toBe(1);
    expect(getCell(model, "D5")!.value).toBe(1); // @compatibility: google sheet returns 0 and excel 1... Excel is right
    expect(getCell(model, "D6")!.value).toBe(1); // @compatibility: google sheet returns 0 and excel 1... Excel is right
    expect(getCell(model, "D7")!.value).toBe(1);
    expect(getCell(model, "D8")!.value).toBe(1);
    expect(getCell(model, "D9")!.value).toBe(1);
    expect(getCell(model, "D10")!.value).toBe(1);
    expect(getCell(model, "D11")!.value).toBe(1);
    expect(getCell(model, "D12")!.value).toBe(1);
  });

  // TO DO: add tests for exp format (ex: 4E10)
  // RO DO: add tests for DATE string format (ex match: "28 02 2020")
});
