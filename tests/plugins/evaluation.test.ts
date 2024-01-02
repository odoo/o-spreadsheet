import { args, functionRegistry } from "../../src/functions";
import { Model } from "../../src/model";
import { ArgRange, CellValueType, InvalidEvaluation } from "../../src/types";
import {
  activateSheet,
  addColumns,
  createSheet,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellError } from "../test_helpers/getters_helpers";
import { evaluateCell, evaluateGrid, target } from "../test_helpers/helpers";
import resetAllMocks = jest.resetAllMocks;

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

  test("With cell outside of sheet", () => {
    const grid = { C1: "=SUM(A11111,AAA1)" };
    expect(evaluateCell("C1", grid)).toBe(0);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe("#ERROR");
    expect(getCellError(model, "A1")).toBe(
      `The function SUM expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );

    setCellContent(model, "A1", "=DECIMAL(1,100)");
    expect(getCellError(model, "A1")).toBe(`The base (100) must be between 2 and 36 inclusive.`);
  });

  test("error in an addition", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1+A2");

    expect(getCell(model, "A3")!.evaluated.value).toBe(3);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    expect(getCellError(model, "A3")).toBe(
      `The function ADD expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.evaluated.value).toBe(43);
  });

  test("error in an subtraction", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1-A2");

    expect(getCell(model, "A3")!.evaluated.value).toBe(-1);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    expect(getCellError(model, "A3")).toBe(
      `The function MINUS expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.evaluated.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1*A2");

    expect(getCell(model, "A3")!.evaluated.value).toBe(2);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A1", "33");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.evaluated.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "=A1/A2");

    expect(getCell(model, "A3")!.evaluated.value).toBe(0.5);
    setCellContent(model, "A2", "asdf");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A1", "30");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    setCellContent(model, "A2", "10");
    expect(getCell(model, "A3")!.evaluated.value).toBe(3);
  });

  test("error in range vlookup", () => {
    const model = new Model();
    expect(model.getters.getActiveSheet().rows.length).toBeLessThan(200);
    setCellContent(model, "A1", "=VLOOKUP(D12, A2:A200, 2, false)");

    expect(getCellError(model, "A1")).toBe("VLOOKUP evaluates to an out of bounds range.");
  });

  test.each([
    "=1/0", // bad evaluation
    "=", // bad expression
  ])("setting a format on an error cell keeps the error", (formula) => {
    const model = new Model();
    setCellContent(model, "A1", formula);
    let evaluation = getCell(model, "A1")?.evaluated as InvalidEvaluation;
    const error = evaluation.error;
    const value = evaluation.value;
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
      format: "#,##0",
    });
    evaluation = getCell(model, "A1")?.evaluated as InvalidEvaluation;
    expect(evaluation.type).toBe(CellValueType.error);
    expect(evaluation.error).toBe(error);
    expect(evaluation.value).toBe(value);
  });

  test("range", () => {
    const model = new Model();
    setCellContent(model, "D4", "42");
    setCellContent(model, "A1", "=sum(A2:Z10)");

    expect(getCell(model, "A1")!.evaluated.value).toBe(42);
  });

  test("Evaluate only existing cells from a range partially outside of sheet", () => {
    functionRegistry.add("RANGE.COUNT.FUNCTION", {
      description: "any function",
      compute: (range: ArgRange) => range.flat().length,
      args: [{ name: "arg", description: "", type: ["RANGE"] }],
      returns: ["NUMBER"],
    });
    const model = new Model();
    setCellContent(model, "D4", "42");
    setCellContent(model, "A1", "=RANGE.COUNT.FUNCTION(A2:AZ999)");
    setCellContent(model, "A2", "=RANGE.COUNT.FUNCTION(B2:AZ2)");

    expect(getCell(model, "A1")!.evaluated.value).toBe(2574);
    expect(getCell(model, "A2")!.evaluated.value).toBe(25);
    addColumns(model, "after", "Z", 1);
    expect(getCell(model, "A2")!.evaluated.value).toBe(26);
  });

  test("range totally outside of sheet", () => {
    const model = new Model();
    setCellContent(model, "A1", "=sum(AB1:AZ999)");

    expect(getCell(model, "A1")!.evaluated.value).toBe(0);
  });

  test("=Range", () => {
    const model = new Model();
    setCellContent(model, "A1", "=A2:A3");
    expect(getCell(model, "A1")!.evaluated.value).toBe("#ERROR");
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

    expect(getCell(model, "C1")!.evaluated.value).toBe(8);
    expect(getCell(model, "C2")!.evaluated.value).toBe(42);
    expect(getCell(model, "C3")!.evaluated.value).toBe(1);
    expect(getCell(model, "C4")!.evaluated.value).toBe(2);
    expect(getCell(model, "C5")!.evaluated.value).toBe(0);
    expect(getCell(model, "C6")!.evaluated.value).toBe(46.3);
  });

  test("priority of operations", () => {
    const model = new Model();
    setCellContent(model, "A1", "=1 + 2 * 3");
    setCellContent(model, "A2", "=-2*-2");
    setCellContent(model, "A3", "=-2^2");
    setCellContent(model, "A4", "=-2^2 + 3");
    setCellContent(model, "A5", "= - 1 + - 2 * - 3");
    setCellContent(model, "A6", "=1 & 8 + 2");
    setCellContent(model, "A7", "=1 & 10 - 2");

    expect(getCell(model, "A1")!.evaluated.value).toBe(7);
    expect(getCell(model, "A2")!.evaluated.value).toBe(4);
    expect(getCell(model, "A3")!.evaluated.value).toBe(-4);
    expect(getCell(model, "A4")!.evaluated.value).toBe(-1);
    expect(getCell(model, "A5")!.evaluated.value).toBe(5);
    expect(getCell(model, "A6")!.evaluated.value).toBe("110");
    expect(getCell(model, "A7")!.evaluated.value).toBe("18");
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

  test("evaluate formula returns the cell error value when we pass an invalid formula", () => {
    let model = new Model();
    expect(model.getters.evaluateFormula("=min(abc)")).toBe("#ERROR");
  });

  test("various expressions with boolean", () => {
    const model = new Model();

    setCellContent(model, "A1", "FALSE");
    setCellContent(model, "A2", "TRUE");
    setCellContent(model, "A3", "false");
    setCellContent(model, "A4", "true");
    setCellContent(model, "A5", "FaLsE");
    setCellContent(model, "A6", "TrUe");

    expect(getCell(model, "A1")!.evaluated.value).toBe(false);
    expect(getCell(model, "A2")!.evaluated.value).toBe(true);
    expect(getCell(model, "A3")!.evaluated.value).toBe(false);
    expect(getCell(model, "A4")!.evaluated.value).toBe(true);
    expect(getCell(model, "A5")!.evaluated.value).toBe(false);
    expect(getCell(model, "A6")!.evaluated.value).toBe(true);

    setCellContent(model, "B1", "=FALSE");
    setCellContent(model, "B2", "=TRUE");
    setCellContent(model, "B3", "=false");
    setCellContent(model, "B4", "=true");
    setCellContent(model, "B5", "=FaLsE");
    setCellContent(model, "B6", "=TrUe");

    expect(getCell(model, "B1")!.evaluated.value).toBe(false);
    expect(getCell(model, "B2")!.evaluated.value).toBe(true);
    expect(getCell(model, "B3")!.evaluated.value).toBe(false);
    expect(getCell(model, "B4")!.evaluated.value).toBe(true);
    expect(getCell(model, "B5")!.evaluated.value).toBe(false);
    expect(getCell(model, "B6")!.evaluated.value).toBe(true);

    setCellContent(model, "A1", " FALSE ");
    setCellContent(model, "A2", " TRUE ");
    setCellContent(model, "A3", " false ");
    setCellContent(model, "A4", " true ");
    setCellContent(model, "A5", " FaLsE ");
    setCellContent(model, "A6", " TrUe ");

    expect(getCell(model, "A1")!.evaluated.value).toBe(" FALSE ");
    expect(getCell(model, "A2")!.evaluated.value).toBe(" TRUE ");
    expect(getCell(model, "A3")!.evaluated.value).toBe(" false ");
    expect(getCell(model, "A4")!.evaluated.value).toBe(" true ");
    expect(getCell(model, "A5")!.evaluated.value).toBe(" FaLsE ");
    expect(getCell(model, "A6")!.evaluated.value).toBe(" TrUe ");

    setCellContent(model, "B1", "= FALSE ");
    setCellContent(model, "B2", "= TRUE ");
    setCellContent(model, "B3", "= false ");
    setCellContent(model, "B4", "= true ");
    setCellContent(model, "B5", "= FaLsE ");
    setCellContent(model, "B6", "= TrUe ");

    expect(getCell(model, "B1")!.evaluated.value).toBe(false);
    expect(getCell(model, "B2")!.evaluated.value).toBe(true);
    expect(getCell(model, "B3")!.evaluated.value).toBe(false);
    expect(getCell(model, "B4")!.evaluated.value).toBe(true);
    expect(getCell(model, "B5")!.evaluated.value).toBe(false);
    expect(getCell(model, "B6")!.evaluated.value).toBe(true);
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
    expect(getCell(model, "A2")!.evaluated.value).toBe(",");
    expect(getCell(model, "A3")!.evaluated.value).toBe(" ");
    expect(getCell(model, "A4")!.evaluated.value).toBe(" , ");
    expect(getCell(model, "A5")!.evaluated.value).toBe(42);
    expect(getCell(model, "A6")!.evaluated.value).toBe(" 42 , 24  ");
    expect(getCell(model, "A7")!.evaluated.value).toBe(" 43 ,     ");
    expect(getCell(model, "A8")!.evaluated.value).toBe(" 44   45  ");

    expect(getCell(model, "B1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B4")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B5")!.evaluated.value).toBe(42);
    expect(getCell(model, "B6")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B7")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return "There was a problem"
    expect(getCell(model, "B8")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "C1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "C2")!.evaluated.value).toBe(0);
    expect(getCell(model, "C3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "C4")!.evaluated.value).toBe(0);
    expect(getCell(model, "C5")!.evaluated.value).toBe(42);
    expect(getCell(model, "C6")!.evaluated.value).toBe(66);
    expect(getCell(model, "C7")!.evaluated.value).toBe(43);
    expect(getCell(model, "C8")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "D1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "D2")!.evaluated.value).toBe(2);
    expect(getCell(model, "D3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #N/A
    expect(getCell(model, "D4")!.evaluated.value).toBe(2);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1);
    expect(getCell(model, "D6")!.evaluated.value).toBe(2);
    expect(getCell(model, "D7")!.evaluated.value).toBe(2);
    expect(getCell(model, "D8")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
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

    expect(getCell(model, "A1")!.evaluated.value).toBe('""');
    expect(getCell(model, "A2")!.evaluated.value).toBe('","');
    expect(getCell(model, "A3")!.evaluated.value).toBe('" "');
    expect(getCell(model, "A4")!.evaluated.value).toBe('" , "');
    expect(getCell(model, "A5")!.evaluated.value).toBe('" 42  "');
    expect(getCell(model, "A6")!.evaluated.value).toBe('" 42 , 24  "');
    expect(getCell(model, "A7")!.evaluated.value).toBe('" 43 ,     "');
    expect(getCell(model, "A8")!.evaluated.value).toBe('" 44   45  "');

    expect(getCell(model, "B1")!.evaluated.value).toBe("");
    expect(getCell(model, "B2")!.evaluated.value).toBe(",");
    expect(getCell(model, "B3")!.evaluated.value).toBe(" ");
    expect(getCell(model, "B4")!.evaluated.value).toBe(" , ");
    expect(getCell(model, "B5")!.evaluated.value).toBe(" 42  ");
    expect(getCell(model, "B6")!.evaluated.value).toBe(" 42 , 24  ");
    expect(getCell(model, "B7")!.evaluated.value).toBe(" 43 ,     ");
    expect(getCell(model, "B8")!.evaluated.value).toBe(" 44   45  ");

    expect(getCell(model, "C1")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C4")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C5")!.evaluated.value).toBe(42);
    expect(getCell(model, "C6")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C7")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C8")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(getCell(model, "D1")!.evaluated.value).toBe(0);
    expect(getCell(model, "D2")!.evaluated.value).toBe(0);
    expect(getCell(model, "D3")!.evaluated.value).toBe(0);
    expect(getCell(model, "D4")!.evaluated.value).toBe(0);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1);
    expect(getCell(model, "D6")!.evaluated.value).toBe(0);
    expect(getCell(model, "D7")!.evaluated.value).toBe(0);
    expect(getCell(model, "D8")!.evaluated.value).toBe(0);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe(4.2);
    expect(getCell(model, "A2")!.evaluated.value).toBe(4);
    expect(getCell(model, "A3")!.evaluated.value).toBe(0.2);

    expect(getCell(model, "B1")!.evaluated.value).toBe(4.2);
    expect(getCell(model, "B2")!.evaluated.value).toBe(4);
    expect(getCell(model, "B3")!.evaluated.value).toBe(0.2);

    expect(getCell(model, "C1")!.evaluated.value).toBe(4.2);
    expect(getCell(model, "C2")!.evaluated.value).toBe(4);
    expect(getCell(model, "C3")!.evaluated.value).toBe(0.2);

    expect(getCell(model, "D1")!.evaluated.value).toBe(1);
    expect(getCell(model, "D2")!.evaluated.value).toBe(1);
    expect(getCell(model, "D3")!.evaluated.value).toBe(1);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe('"4.2"');
    expect(getCell(model, "A2")!.evaluated.value).toBe('"4."');
    expect(getCell(model, "A3")!.evaluated.value).toBe('".2"');

    expect(getCell(model, "B1")!.evaluated.value).toBe("4.2");
    expect(getCell(model, "B2")!.evaluated.value).toBe("4.");
    expect(getCell(model, "B3")!.evaluated.value).toBe(".2");

    expect(getCell(model, "C1")!.evaluated.value).toBe(4.2);
    expect(getCell(model, "C2")!.evaluated.value).toBe(4);
    expect(getCell(model, "C3")!.evaluated.value).toBe(0.2);

    expect(getCell(model, "D1")!.evaluated.value).toBe(1);
    expect(getCell(model, "D2")!.evaluated.value).toBe(1);
    expect(getCell(model, "D3")!.evaluated.value).toBe(1);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe("42 .24");
    expect(getCell(model, "A2")!.evaluated.value).toBe("42. 24");
    expect(getCell(model, "A3")!.evaluated.value).toBe("42 .");
    expect(getCell(model, "A4")!.evaluated.value).toBe(42);
    expect(getCell(model, "A5")!.evaluated.value).toBe(0.24);
    expect(getCell(model, "A6")!.evaluated.value).toBe(". 24");

    expect(getCell(model, "B1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B4")!.evaluated.value).toBe(42);
    expect(getCell(model, "B5")!.evaluated.value).toBe(0.24);
    expect(getCell(model, "B6")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "C1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C4")!.evaluated.value).toBe(42);
    expect(getCell(model, "C5")!.evaluated.value).toBe(0.24);
    expect(getCell(model, "C6")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!

    expect(getCell(model, "D1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D3")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D4")!.evaluated.value).toBe(1);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1);
    expect(getCell(model, "D6")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
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

    expect(getCell(model, "A1")!.evaluated.value).toBe('"42 .24"');
    expect(getCell(model, "A2")!.evaluated.value).toBe('"42. 24"');
    expect(getCell(model, "A3")!.evaluated.value).toBe('"42 ."');
    expect(getCell(model, "A4")!.evaluated.value).toBe('"42. "');
    expect(getCell(model, "A5")!.evaluated.value).toBe('" .24"');
    expect(getCell(model, "A6")!.evaluated.value).toBe('". 24"');

    expect(getCell(model, "B1")!.evaluated.value).toBe("42 .24");
    expect(getCell(model, "B2")!.evaluated.value).toBe("42. 24");
    expect(getCell(model, "B3")!.evaluated.value).toBe("42 .");
    expect(getCell(model, "B4")!.evaluated.value).toBe("42. ");
    expect(getCell(model, "B5")!.evaluated.value).toBe(" .24");
    expect(getCell(model, "B6")!.evaluated.value).toBe(". 24");

    expect(getCell(model, "C1")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C4")!.evaluated.value).toBe(42);
    expect(getCell(model, "C5")!.evaluated.value).toBe(0.24);
    expect(getCell(model, "C6")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!

    expect(getCell(model, "D1")!.evaluated.value).toBe(0);
    expect(getCell(model, "D2")!.evaluated.value).toBe(0);
    expect(getCell(model, "D3")!.evaluated.value).toBe(0);
    expect(getCell(model, "D4")!.evaluated.value).toBe(1);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1);
    expect(getCell(model, "D6")!.evaluated.value).toBe(0);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe("%");
    expect(getCell(model, "A2")!.evaluated.value).toBe(" %");
    expect(getCell(model, "A3")!.evaluated.value).toBe(0.4);
    expect(getCell(model, "A4")!.evaluated.value).toBe(0.41);
    expect(getCell(model, "A5")!.evaluated.value).toBe(0.42);
    expect(getCell(model, "A6")!.evaluated.value).toBe(0.43);
    expect(getCell(model, "A7")!.evaluated.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "A8")!.evaluated.value).toBe(0.042);
    expect(getCell(model, "A9")!.evaluated.value).toBe(0.001);
    expect(getCell(model, "A10")!.evaluated.value).toBe(0.002);
    expect(getCell(model, "A11")!.evaluated.value).toBe(0.03);
    expect(getCell(model, "A12")!.evaluated.value).toBe(0.04);

    expect(getCell(model, "B1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "B3")!.evaluated.value).toBe(0.4);
    expect(getCell(model, "B4")!.evaluated.value).toBe(0.41);
    expect(getCell(model, "B5")!.evaluated.value).toBe(0.42);
    expect(getCell(model, "B6")!.evaluated.value).toBe(0.43);
    expect(getCell(model, "B7")!.evaluated.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "B8")!.evaluated.value).toBe(0.042);
    expect(getCell(model, "B9")!.evaluated.value).toBe(0.001);
    expect(getCell(model, "B10")!.evaluated.value).toBe(0.002);
    expect(getCell(model, "B11")!.evaluated.value).toBe(0.03);
    expect(getCell(model, "B12")!.evaluated.value).toBe(0.04);

    expect(getCell(model, "C1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "C3")!.evaluated.value).toBe(0.4);
    expect(getCell(model, "C4")!.evaluated.value).toBe(0.41);
    expect(getCell(model, "C5")!.evaluated.value).toBe(0.42);
    expect(getCell(model, "C6")!.evaluated.value).toBe(0.43);
    expect(getCell(model, "C7")!.evaluated.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "C8")!.evaluated.value).toBe(0.042);
    expect(getCell(model, "C9")!.evaluated.value).toBe(0.001);
    expect(getCell(model, "C10")!.evaluated.value).toBe(0.002);
    expect(getCell(model, "C11")!.evaluated.value).toBe(0.03);
    expect(getCell(model, "C12")!.evaluated.value).toBe(0.04);

    expect(getCell(model, "D1")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D2")!.evaluated.value).toBe("#BAD_EXPR"); // @compatibility: on google sheet, return #ERROR!
    expect(getCell(model, "D3")!.evaluated.value).toBe(1);
    expect(getCell(model, "D4")!.evaluated.value).toBe(1);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1);
    expect(getCell(model, "D6")!.evaluated.value).toBe(1);
    expect(getCell(model, "D7")!.evaluated.value).toBe(1);
    expect(getCell(model, "D8")!.evaluated.value).toBe(1);
    expect(getCell(model, "D9")!.evaluated.value).toBe(1);
    expect(getCell(model, "D10")!.evaluated.value).toBe(1);
    expect(getCell(model, "D11")!.evaluated.value).toBe(1);
    expect(getCell(model, "D12")!.evaluated.value).toBe(1);
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

    expect(getCell(model, "A1")!.evaluated.value).toBe('"%"');
    expect(getCell(model, "A2")!.evaluated.value).toBe('" %"');
    expect(getCell(model, "A3")!.evaluated.value).toBe('"40%"');
    expect(getCell(model, "A4")!.evaluated.value).toBe('" 41% "');
    expect(getCell(model, "A5")!.evaluated.value).toBe('"42 %"');
    expect(getCell(model, "A6")!.evaluated.value).toBe('" 43 % "');
    expect(getCell(model, "A7")!.evaluated.value).toBe('"4.1%"');
    expect(getCell(model, "A8")!.evaluated.value).toBe('" 4.2% "');
    expect(getCell(model, "A9")!.evaluated.value).toBe('".1%"');
    expect(getCell(model, "A10")!.evaluated.value).toBe('" .2% "');
    expect(getCell(model, "A11")!.evaluated.value).toBe('"3.%"');
    expect(getCell(model, "A12")!.evaluated.value).toBe('" 4.% "');

    expect(getCell(model, "B1")!.evaluated.value).toBe("%");
    expect(getCell(model, "B2")!.evaluated.value).toBe(" %");
    expect(getCell(model, "B3")!.evaluated.value).toBe("40%");
    expect(getCell(model, "B4")!.evaluated.value).toBe(" 41% ");
    expect(getCell(model, "B5")!.evaluated.value).toBe("42 %");
    expect(getCell(model, "B6")!.evaluated.value).toBe(" 43 % ");
    expect(getCell(model, "B7")!.evaluated.value).toBe("4.1%");
    expect(getCell(model, "B8")!.evaluated.value).toBe(" 4.2% ");
    expect(getCell(model, "B9")!.evaluated.value).toBe(".1%");
    expect(getCell(model, "B10")!.evaluated.value).toBe(" .2% ");
    expect(getCell(model, "B11")!.evaluated.value).toBe("3.%");
    expect(getCell(model, "B12")!.evaluated.value).toBe(" 4.% ");

    expect(getCell(model, "C1")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C2")!.evaluated.value).toBe("#ERROR"); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C3")!.evaluated.value).toBe(0.4);
    expect(getCell(model, "C4")!.evaluated.value).toBe(0.41);
    expect(getCell(model, "C5")!.evaluated.value).toBe(0.42); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C6")!.evaluated.value).toBe(0.43); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C7")!.evaluated.value).toBeCloseTo(0.041, 3);
    expect(getCell(model, "C8")!.evaluated.value).toBe(0.042); // @compatibility: on google sheet, return #VALUE!
    expect(getCell(model, "C9")!.evaluated.value).toBe(0.001);
    expect(getCell(model, "C10")!.evaluated.value).toBe(0.002);
    expect(getCell(model, "C11")!.evaluated.value).toBe(0.03);
    expect(getCell(model, "C12")!.evaluated.value).toBe(0.04);

    expect(getCell(model, "D1")!.evaluated.value).toBe(0);

    expect(getCell(model, "D2")!.evaluated.value).toBe(0);
    expect(getCell(model, "D3")!.evaluated.value).toBe(1);
    expect(getCell(model, "D4")!.evaluated.value).toBe(1);
    expect(getCell(model, "D5")!.evaluated.value).toBe(1); // @compatibility: google sheet returns 0 and excel 1... Excel is right
    expect(getCell(model, "D6")!.evaluated.value).toBe(1); // @compatibility: google sheet returns 0 and excel 1... Excel is right
    expect(getCell(model, "D7")!.evaluated.value).toBe(1);
    expect(getCell(model, "D8")!.evaluated.value).toBe(1);
    expect(getCell(model, "D9")!.evaluated.value).toBe(1);
    expect(getCell(model, "D10")!.evaluated.value).toBe(1);
    expect(getCell(model, "D11")!.evaluated.value).toBe(1);
    expect(getCell(model, "D12")!.evaluated.value).toBe(1);
  });

  test("evaluate empty colored cell", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A2", "=A1");
    expect(getCell(model, "A2")!.evaluated.value).toBe(null);
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: {
        fillColor: "#a7d08c",
      },
    });
    setCellContent(model, "A12", "this re-evaluates cells");
    expect(getCellContent(model, "A2")).toBe("0");
    expect(getCell(model, "A2")!.evaluated.value).toBe(null);
  });

  test("evaluation follows dependencies", () => {
    const model = new Model({
      sheets: [
        {
          id: "sheet1",
          colNumber: 4,
          rowNumber: 4,
          cells: {
            A1: { content: "old" },
            A2: { content: "=a1" },
            A3: { content: "=a2" },
          },
        },
      ],
    });

    expect(getCell(model, "A3")!.evaluated.value).toBe("old");
    setCellContent(model, "A1", "new");
    expect(getCell(model, "A3")!.evaluated.value).toBe("new");
  });

  // TO DO: add tests for exp format (ex: 4E10)
  // RO DO: add tests for DATE string format (ex match: "28 02 2020")
});

describe("evaluate formula getter", () => {
  let model: Model = new Model();

  beforeEach(() => {
    model = new Model();
  });

  test("a ref in the current sheet", () => {
    setCellContent(model, "A1", "12");
    expect(model.getters.evaluateFormula("=A1")).toBe(12);
  });

  test("in another sheet", () => {
    createSheet(model, { sheetId: "42" });
    const sheet2 = model.getters.getVisibleSheets()[1];
    setCellContent(model, "A1", "11", sheet2);
    expect(model.getters.evaluateFormula("=Sheet2!A1")).toBe(11);
  });

  test("in a not existing sheet", () => {
    expect(model.getters.evaluateFormula("=Sheet99!A1")).toBe("#ERROR");
  });

  test("evaluate a cell in error", () => {
    setCellContent(model, "A1", "=mqsdlkjfqsdf(((--");
    expect(model.getters.evaluateFormula("=A1")).toBe("#ERROR");
  });

  test("evaluate an invalid formula", () => {
    setCellContent(model, "A1", "=min(abc)");
    expect(model.getters.evaluateFormula("=A1")).toBe("#ERROR");
  });

  test("EVALUATE_CELLS with no argument re-evaluate all the cells", () => {
    let value = 1;
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: args(``),
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "=GETVALUE()");
    expect(getCell(model, "A1")!.evaluated.value).toBe(1);
    value = 2;
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(getCell(model, "A1")!.evaluated.value).toBe(2);
  });

  test("using cells in other sheets", () => {
    createSheet(model, { sheetId: "42" });
    const s = model.getters.getSheets();
    activateSheet(model, s[0].id);
    setCellContent(model, "A1", "12", s[1].id);
    setCellContent(model, "A2", "=A1", s[1].id);
    setCellContent(model, "A2", "=Sheet2!A1", s[0].id);
    expect(getCell(model, "A2", s[0].id)!.evaluated.value).toBe(12);
  });

  test.skip("EVALUATE_CELLS with no argument re-evaluates do not reevaluate the cells if they are not modified", () => {
    const mockCompute = jest.fn();

    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: mockCompute,
      args: args(``),
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "=GETVALUE()");
    expect(mockCompute).toHaveBeenCalledTimes(1);
    resetAllMocks();
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(mockCompute).toHaveBeenCalledTimes(0);
  });
  test("cells are re-evaluated if one of their dependency changes", () => {
    const mockCompute = jest.fn();

    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: mockCompute,
      args: args(`value (any) bla`),
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "=GETVALUE(A2)");

    expect(mockCompute).toHaveBeenCalledTimes(1);
    resetAllMocks();
    setCellContent(model, "A2", "1");
    expect(mockCompute).toHaveBeenCalledTimes(1);
  });

  test("cells in error are correctly reset", () => {
    let value: string | number = "LOADING...";
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: args(``),
      returns: ["ANY"],
    });
    setCellContent(model, "A1", "=SUM(A2)");
    setCellContent(model, "A2", "=-GETVALUE()");
    expect(getCell(model, "A1")!.evaluated.type).toBe(CellValueType.error);
    expect(getCell(model, "A2")!.evaluated.type).toBe(CellValueType.error);
    value = 2;
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(getCell(model, "A1")!.evaluated.value).toBe(-2);
    expect(getCell(model, "A2")!.evaluated.value).toBe(-2);
    functionRegistry.remove("GETVALUE");
  });

  test("cells in error and in another sheet are correctly reset", () => {
    let value: string | number = "LOADING...";
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: args(``),
      returns: ["ANY"],
    });
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "A1", "=SUM(Sheet2!A2)");
    setCellContent(model, "A2", "=-GETVALUE()", "sheet2");
    expect(getCell(model, "A1")!.evaluated.type).toBe(CellValueType.error);
    value = 2;
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(getCell(model, "A1")!.evaluated.value).toBe(-2);
    expect(getCell(model, "A2", "sheet2")!.evaluated.value).toBe(-2);
    functionRegistry.remove("GETVALUE");
  });

  test("cell is evaluated when changing sheet and coming back", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "A3", "=5");
    activateSheet(model, "sheet2");
    activateSheet(model, firstSheetId);
    expect(getCell(model, "A3", firstSheetId)!.evaluated.value).toBe(5);
  });

  test("cells with two consecutive error are correctly evaluated", () => {
    let value: number = 1;
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => {
        throw new Error(`Error${value}`);
      },
      args: args(``),
      returns: ["ANY"],
    });
    setCellContent(model, "A1", "=GETVALUE()");
    expect(getCell(model, "A1")!.evaluated.type).toBe(CellValueType.error);
    expect((getCell(model, "A1")!.evaluated as InvalidEvaluation).error).toBe("Error1");
    value = 2;
    model.dispatch("EVALUATE_ALL_SHEETS");
    expect(getCell(model, "A1")!.evaluated.type).toBe(CellValueType.error);
    expect((getCell(model, "A1")!.evaluated as InvalidEvaluation).error).toBe("Error2");
    functionRegistry.remove("GETVALUE");
  });
});
