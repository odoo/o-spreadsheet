import { args, functionRegistry } from "../../src/functions";
import { Model } from "../../src/model";
import "../canvas.mock";
import { evaluateCell, evaluateGrid, getCell, waitForRecompute } from "../helpers";

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
    model.dispatch("SET_VALUE", { xc: "A1", text: '=Sum("asdf")' });

    expect(getCell(model, "A1")!.value).toBe("#ERROR");
    expect(getCell(model, "A1")!.error).toBe(
      `The function SUM expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );

    model.dispatch("SET_VALUE", { xc: "A1", text: "=DECIMAL(1,100)" });
    expect(getCell(model, "A1")!.error).toBe(
      `Function DECIMAL expects the parameter 'base' to be between 2 and 36 inclusive. Change 'base' from [100] to a value between 2 and 36.`
    );
  });

  test("error in an addition", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=A1+A2" });

    expect(getCell(model, "A3")!.value).toBe(3);
    model.dispatch("SET_VALUE", { xc: "A2", text: "asdf" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.error).toBe(
      `The function ADD expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    model.dispatch("SET_VALUE", { xc: "A1", text: "33" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A2", text: "10" });
    expect(getCell(model, "A3")!.value).toBe(43);
  });

  test("error in an subtraction", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=A1-A2" });

    expect(getCell(model, "A3")!.value).toBe(-1);
    model.dispatch("SET_VALUE", { xc: "A2", text: "asdf" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A1", text: "33" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.error).toBe(
      `The function MINUS expects a number value, but 'asdf' is a string, and cannot be coerced to a number.`
    );
    model.dispatch("SET_VALUE", { xc: "A2", text: "10" });
    expect(getCell(model, "A3")!.value).toBe(23);
  });

  test("error in a multiplication", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=A1*A2" });

    expect(getCell(model, "A3")!.value).toBe(2);
    model.dispatch("SET_VALUE", { xc: "A2", text: "asdf" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A1", text: "33" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A2", text: "10" });
    expect(getCell(model, "A3")!.value).toBe(330);
  });

  test("error in a division", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=A1/A2" });

    expect(getCell(model, "A3")!.value).toBe(0.5);
    model.dispatch("SET_VALUE", { xc: "A2", text: "asdf" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A1", text: "30" });
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A2", text: "10" });
    expect(getCell(model, "A3")!.value).toBe(3);
  });

  test("error in range vlookup", () => {
    const model = new Model();
    expect(model.getters.getNumberRows(model.getters.getActiveSheet())).toBeLessThan(200);
    model.dispatch("SET_VALUE", { xc: "A1", text: "=VLOOKUP(D12, A2:A200, 2, false)" });

    expect(getCell(model, "A1")!.error!.toString()).toBe(
      "VLOOKUP evaluates to an out of bounds range."
    );
  });

  test("range", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "D4", text: "42" });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=sum(A2:Z10)" });

    expect(getCell(model, "A1")!.value).toBe(42);
  });

  test("=Range", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A2:A3" });
    expect(getCell(model, "A1")!.value).toBe("#ERROR");
  });

  test("misc math formulas", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "42" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "2.3" });
    model.dispatch("SET_VALUE", { xc: "C1", text: "=countblank(A1:A10)" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "=sum(A1,B1)" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "=countblank(B1:A1)" });
    model.dispatch("SET_VALUE", { xc: "C4", text: "=floor(B3)" });
    model.dispatch("SET_VALUE", { xc: "C5", text: "=floor(A8)" });
    model.dispatch("SET_VALUE", { xc: "C6", text: "=sum(A1:A4,B1:B5)" });

    expect(getCell(model, "C1")!.value).toBe(8);
    expect(getCell(model, "C2")!.value).toBe(42);
    expect(getCell(model, "C3")!.value).toBe(1);
    expect(getCell(model, "C4")!.value).toBe(2);
    expect(getCell(model, "C5")!.value).toBe(0);
    expect(getCell(model, "C6")!.value).toBe(46.3);
  });

  test("priority of operations", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=1 + 2 * 3" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=-2*-2" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=-2^2" });
    model.dispatch("SET_VALUE", { xc: "A4", text: "=-2^2 + 3" });
    model.dispatch("SET_VALUE", { xc: "A5", text: "= - 1 + - 2 * - 3" });
    model.dispatch("SET_VALUE", { xc: "A6", text: "=1 & 8 + 2" });
    model.dispatch("SET_VALUE", { xc: "A7", text: "=1 & 10 - 2" });

    expect(getCell(model, "A1")!.value).toBe(7);
    expect(getCell(model, "A2")!.value).toBe(4);
    expect(getCell(model, "A3")!.value).toBe(-4);
    expect(getCell(model, "A4")!.value).toBe(-1);
    expect(getCell(model, "A5")!.value).toBe(5);
    expect(getCell(model, "A6")!.value).toBe("110");
    expect(getCell(model, "A7")!.value).toBe("18");
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

    model.dispatch("SET_VALUE", { xc: "A1", text: "FALSE" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "TRUE" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "false" });
    model.dispatch("SET_VALUE", { xc: "A4", text: "true" });
    model.dispatch("SET_VALUE", { xc: "A5", text: "FaLsE" });
    model.dispatch("SET_VALUE", { xc: "A6", text: "TrUe" });

    expect(getCell(model, "A1")!.value).toBe(false);
    expect(getCell(model, "A2")!.value).toBe(true);
    expect(getCell(model, "A3")!.value).toBe(false);
    expect(getCell(model, "A4")!.value).toBe(true);
    expect(getCell(model, "A5")!.value).toBe(false);
    expect(getCell(model, "A6")!.value).toBe(true);

    model.dispatch("SET_VALUE", { xc: "B1", text: "=FALSE" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "=TRUE" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "=false" });
    model.dispatch("SET_VALUE", { xc: "B4", text: "=true" });
    model.dispatch("SET_VALUE", { xc: "B5", text: "=FaLsE" });
    model.dispatch("SET_VALUE", { xc: "B6", text: "=TrUe" });

    expect(getCell(model, "B1")!.value).toBe(false);
    expect(getCell(model, "B2")!.value).toBe(true);
    expect(getCell(model, "B3")!.value).toBe(false);
    expect(getCell(model, "B4")!.value).toBe(true);
    expect(getCell(model, "B5")!.value).toBe(false);
    expect(getCell(model, "B6")!.value).toBe(true);

    model.dispatch("SET_VALUE", { xc: "A1", text: " FALSE " });
    model.dispatch("SET_VALUE", { xc: "A2", text: " TRUE " });
    model.dispatch("SET_VALUE", { xc: "A3", text: " false " });
    model.dispatch("SET_VALUE", { xc: "A4", text: " true " });
    model.dispatch("SET_VALUE", { xc: "A5", text: " FaLsE " });
    model.dispatch("SET_VALUE", { xc: "A6", text: " TrUe " });

    expect(getCell(model, "A1")!.value).toBe(" FALSE ");
    expect(getCell(model, "A2")!.value).toBe(" TRUE ");
    expect(getCell(model, "A3")!.value).toBe(" false ");
    expect(getCell(model, "A4")!.value).toBe(" true ");
    expect(getCell(model, "A5")!.value).toBe(" FaLsE ");
    expect(getCell(model, "A6")!.value).toBe(" TrUe ");

    model.dispatch("SET_VALUE", { xc: "B1", text: "= FALSE " });
    model.dispatch("SET_VALUE", { xc: "B2", text: "= TRUE " });
    model.dispatch("SET_VALUE", { xc: "B3", text: "= false " });
    model.dispatch("SET_VALUE", { xc: "B4", text: "= true " });
    model.dispatch("SET_VALUE", { xc: "B5", text: "= FaLsE " });
    model.dispatch("SET_VALUE", { xc: "B6", text: "= TrUe " });

    expect(getCell(model, "B1")!.value).toBe(false);
    expect(getCell(model, "B2")!.value).toBe(true);
    expect(getCell(model, "B3")!.value).toBe(false);
    expect(getCell(model, "B4")!.value).toBe(true);
    expect(getCell(model, "B5")!.value).toBe(false);
    expect(getCell(model, "B6")!.value).toBe(true);
  });

  test("various expressions with whitespace", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "," });
    model.dispatch("SET_VALUE", { xc: "A3", text: " " });
    model.dispatch("SET_VALUE", { xc: "A4", text: " , " });
    model.dispatch("SET_VALUE", { xc: "A5", text: " 42 " });
    model.dispatch("SET_VALUE", { xc: "A6", text: " 42 , 24  " });
    model.dispatch("SET_VALUE", { xc: "A7", text: " 43 ,     " });
    model.dispatch("SET_VALUE", { xc: "A8", text: " 44   45  " });

    model.dispatch("SET_VALUE", { xc: "B1", text: "=" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "=," });
    model.dispatch("SET_VALUE", { xc: "B3", text: "= " });
    model.dispatch("SET_VALUE", { xc: "B4", text: "= , " });
    model.dispatch("SET_VALUE", { xc: "B5", text: "= 42 " });
    model.dispatch("SET_VALUE", { xc: "B6", text: "= 42 , 24  " });
    model.dispatch("SET_VALUE", { xc: "B7", text: "= 43 ,     " });
    model.dispatch("SET_VALUE", { xc: "B8", text: "= 44   45  " });

    model.dispatch("SET_VALUE", { xc: "C1", text: "=SUM()" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "=SUM(,)" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "=SUM( )" });
    model.dispatch("SET_VALUE", { xc: "C4", text: "=SUM( , )" });
    model.dispatch("SET_VALUE", { xc: "C5", text: "=SUM( 42 )" });
    model.dispatch("SET_VALUE", { xc: "C6", text: "=SUM( 42 , 24  )" });
    model.dispatch("SET_VALUE", { xc: "C7", text: "=SUM( 43 ,     )" });
    model.dispatch("SET_VALUE", { xc: "C8", text: "=SUM( 44   45  )" });

    model.dispatch("SET_VALUE", { xc: "D1", text: "=COUNT()" });
    model.dispatch("SET_VALUE", { xc: "D2", text: "=COUNT(,)" });
    model.dispatch("SET_VALUE", { xc: "D3", text: "=COUNT( )" });
    model.dispatch("SET_VALUE", { xc: "D4", text: "=COUNT( , )" });
    model.dispatch("SET_VALUE", { xc: "D5", text: "=COUNT( 42 )" });
    model.dispatch("SET_VALUE", { xc: "D6", text: "=COUNT( 42 , 24  )" });
    model.dispatch("SET_VALUE", { xc: "D7", text: "=COUNT( 43 ,     )" });
    model.dispatch("SET_VALUE", { xc: "D8", text: "=COUNT( 44   45  )" });

    expect(getCell(model, "A1")!).toBe(null);
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

    model.dispatch("SET_VALUE", { xc: "A1", text: '""' });
    model.dispatch("SET_VALUE", { xc: "A2", text: '","' });
    model.dispatch("SET_VALUE", { xc: "A3", text: '" "' });
    model.dispatch("SET_VALUE", { xc: "A4", text: '" , "' });
    model.dispatch("SET_VALUE", { xc: "A5", text: '" 42  "' });
    model.dispatch("SET_VALUE", { xc: "A6", text: '" 42 , 24  "' });
    model.dispatch("SET_VALUE", { xc: "A7", text: '" 43 ,     "' });
    model.dispatch("SET_VALUE", { xc: "A8", text: '" 44   45  "' });

    model.dispatch("SET_VALUE", { xc: "B1", text: '=""' });
    model.dispatch("SET_VALUE", { xc: "B2", text: '=","' });
    model.dispatch("SET_VALUE", { xc: "B3", text: '=" "' });
    model.dispatch("SET_VALUE", { xc: "B4", text: '=" , "' });
    model.dispatch("SET_VALUE", { xc: "B5", text: '=" 42  "' });
    model.dispatch("SET_VALUE", { xc: "B6", text: '=" 42 , 24  "' });
    model.dispatch("SET_VALUE", { xc: "B7", text: '=" 43 ,     "' });
    model.dispatch("SET_VALUE", { xc: "B8", text: '=" 44   45  "' });

    model.dispatch("SET_VALUE", { xc: "C1", text: '=SUM("")' });
    model.dispatch("SET_VALUE", { xc: "C2", text: '=SUM(",")' });
    model.dispatch("SET_VALUE", { xc: "C3", text: '=SUM(" ")' });
    model.dispatch("SET_VALUE", { xc: "C4", text: '=SUM(" , ")' });
    model.dispatch("SET_VALUE", { xc: "C5", text: '=SUM(" 42  ")' });
    model.dispatch("SET_VALUE", { xc: "C6", text: '=SUM(" 42 , 24  ")' });
    model.dispatch("SET_VALUE", { xc: "C7", text: '=SUM(" 43 ,     ")' });
    model.dispatch("SET_VALUE", { xc: "C8", text: '=SUM(" 44   45  ")' });

    model.dispatch("SET_VALUE", { xc: "D1", text: '=COUNT("")' });
    model.dispatch("SET_VALUE", { xc: "D2", text: '=COUNT(",")' });
    model.dispatch("SET_VALUE", { xc: "D3", text: '=COUNT(" ")' });
    model.dispatch("SET_VALUE", { xc: "D4", text: '=COUNT(" , ")' });
    model.dispatch("SET_VALUE", { xc: "D5", text: '=COUNT(" 42  ")' });
    model.dispatch("SET_VALUE", { xc: "D6", text: '=COUNT(" 42 , 24  ")' });
    model.dispatch("SET_VALUE", { xc: "D7", text: '=COUNT(" 43 ,     ")' });
    model.dispatch("SET_VALUE", { xc: "D8", text: '=COUNT(" 44   45  ")' });

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

    model.dispatch("SET_VALUE", { xc: "A1", text: "4.2" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "4." });
    model.dispatch("SET_VALUE", { xc: "A3", text: ".2" });

    model.dispatch("SET_VALUE", { xc: "B1", text: "=4.2" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "=4." });
    model.dispatch("SET_VALUE", { xc: "B3", text: "=.2" });

    model.dispatch("SET_VALUE", { xc: "C1", text: "=SUM(4.2)" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "=SUM(4.)" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "=SUM(.2)" });

    model.dispatch("SET_VALUE", { xc: "D1", text: "=COUNT(4.2)" });
    model.dispatch("SET_VALUE", { xc: "D2", text: "=COUNT(4.)" });
    model.dispatch("SET_VALUE", { xc: "D3", text: "=COUNT(.2)" });

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
    model.dispatch("SET_VALUE", { xc: "A1", text: '"4.2"' });
    model.dispatch("SET_VALUE", { xc: "A2", text: '"4."' });
    model.dispatch("SET_VALUE", { xc: "A3", text: '".2"' });

    model.dispatch("SET_VALUE", { xc: "B1", text: '="4.2"' });
    model.dispatch("SET_VALUE", { xc: "B2", text: '="4."' });
    model.dispatch("SET_VALUE", { xc: "B3", text: '=".2"' });

    model.dispatch("SET_VALUE", { xc: "C1", text: '=SUM("4.2")' });
    model.dispatch("SET_VALUE", { xc: "C2", text: '=SUM("4.")' });
    model.dispatch("SET_VALUE", { xc: "C3", text: '=SUM(".2")' });

    model.dispatch("SET_VALUE", { xc: "D1", text: '=COUNT("4.2")' });
    model.dispatch("SET_VALUE", { xc: "D2", text: '=COUNT("4.")' });
    model.dispatch("SET_VALUE", { xc: "D3", text: '=COUNT(".2")' });

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
    model.dispatch("SET_VALUE", { xc: "A1", text: "42 .24" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "42. 24" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "42 ." });
    model.dispatch("SET_VALUE", { xc: "A4", text: "42. " });
    model.dispatch("SET_VALUE", { xc: "A5", text: " .24" });
    model.dispatch("SET_VALUE", { xc: "A6", text: ". 24" });

    model.dispatch("SET_VALUE", { xc: "B1", text: "=42 .24" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "=42. 24" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "=42 ." });
    model.dispatch("SET_VALUE", { xc: "B4", text: "=42. " });
    model.dispatch("SET_VALUE", { xc: "B5", text: "= .24" });
    model.dispatch("SET_VALUE", { xc: "B6", text: "=. 24" });

    model.dispatch("SET_VALUE", { xc: "C1", text: "=SUM(42 .24)" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "=SUM(42. 24)" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "=SUM(42 .)" });
    model.dispatch("SET_VALUE", { xc: "C4", text: "=SUM(42. )" });
    model.dispatch("SET_VALUE", { xc: "C5", text: "=SUM( .24)" });
    model.dispatch("SET_VALUE", { xc: "C6", text: "=SUM(. 24)" });

    model.dispatch("SET_VALUE", { xc: "D1", text: "=COUNT(42 .24)" });
    model.dispatch("SET_VALUE", { xc: "D2", text: "=COUNT(42. 24)" });
    model.dispatch("SET_VALUE", { xc: "D3", text: "=COUNT(42 .)" });
    model.dispatch("SET_VALUE", { xc: "D4", text: "=COUNT(42. )" });
    model.dispatch("SET_VALUE", { xc: "D5", text: "=COUNT( .24)" });
    model.dispatch("SET_VALUE", { xc: "D6", text: "=COUNT(. 24)" });

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
    model.dispatch("SET_VALUE", { xc: "A1", text: '"42 .24"' });
    model.dispatch("SET_VALUE", { xc: "A2", text: '"42. 24"' });
    model.dispatch("SET_VALUE", { xc: "A3", text: '"42 ."' });
    model.dispatch("SET_VALUE", { xc: "A4", text: '"42. "' });
    model.dispatch("SET_VALUE", { xc: "A5", text: '" .24"' });
    model.dispatch("SET_VALUE", { xc: "A6", text: '". 24"' });

    model.dispatch("SET_VALUE", { xc: "B1", text: '="42 .24"' });
    model.dispatch("SET_VALUE", { xc: "B2", text: '="42. 24"' });
    model.dispatch("SET_VALUE", { xc: "B3", text: '="42 ."' });
    model.dispatch("SET_VALUE", { xc: "B4", text: '="42. "' });
    model.dispatch("SET_VALUE", { xc: "B5", text: '=" .24"' });
    model.dispatch("SET_VALUE", { xc: "B6", text: '=". 24"' });

    model.dispatch("SET_VALUE", { xc: "C1", text: '=SUM("42 .24")' });
    model.dispatch("SET_VALUE", { xc: "C2", text: '=SUM("42. 24")' });
    model.dispatch("SET_VALUE", { xc: "C3", text: '=SUM("42 .")' });
    model.dispatch("SET_VALUE", { xc: "C4", text: '=SUM("42. ")' });
    model.dispatch("SET_VALUE", { xc: "C5", text: '=SUM(" .24")' });
    model.dispatch("SET_VALUE", { xc: "C6", text: '=SUM(". 24")' });

    model.dispatch("SET_VALUE", { xc: "D1", text: '=COUNT("42 .24")' });
    model.dispatch("SET_VALUE", { xc: "D2", text: '=COUNT("42. 24")' });
    model.dispatch("SET_VALUE", { xc: "D3", text: '=COUNT("42 .")' });
    model.dispatch("SET_VALUE", { xc: "D4", text: '=COUNT("42. ")' });
    model.dispatch("SET_VALUE", { xc: "D5", text: '=COUNT(" .24")' });
    model.dispatch("SET_VALUE", { xc: "D6", text: '=COUNT(". 24")' });

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
    model.dispatch("SET_VALUE", { xc: "A1", text: "%" });
    model.dispatch("SET_VALUE", { xc: "A2", text: " %" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "40%" });
    model.dispatch("SET_VALUE", { xc: "A4", text: " 41% " });
    model.dispatch("SET_VALUE", { xc: "A5", text: "42 %" });
    model.dispatch("SET_VALUE", { xc: "A6", text: " 43 % " });
    model.dispatch("SET_VALUE", { xc: "A7", text: "4.1%" });
    model.dispatch("SET_VALUE", { xc: "A8", text: " 4.2% " });
    model.dispatch("SET_VALUE", { xc: "A9", text: ".1%" });
    model.dispatch("SET_VALUE", { xc: "A10", text: " .2% " });
    model.dispatch("SET_VALUE", { xc: "A11", text: "3.%" });
    model.dispatch("SET_VALUE", { xc: "A12", text: " 4.% " });

    model.dispatch("SET_VALUE", { xc: "B1", text: "=%" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "= %" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "=40%" });
    model.dispatch("SET_VALUE", { xc: "B4", text: "= 41% " });
    model.dispatch("SET_VALUE", { xc: "B5", text: "=42 %" });
    model.dispatch("SET_VALUE", { xc: "B6", text: "= 43 % " });
    model.dispatch("SET_VALUE", { xc: "B7", text: "=4.1%" });
    model.dispatch("SET_VALUE", { xc: "B8", text: "= 4.2% " });
    model.dispatch("SET_VALUE", { xc: "B9", text: "=.1%" });
    model.dispatch("SET_VALUE", { xc: "B10", text: "= .2% " });
    model.dispatch("SET_VALUE", { xc: "B11", text: "=3.%" });
    model.dispatch("SET_VALUE", { xc: "B12", text: "= 4.% " });

    model.dispatch("SET_VALUE", { xc: "C1", text: "=SUM(%)" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "=SUM( %)" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "=SUM(40%)" });
    model.dispatch("SET_VALUE", { xc: "C4", text: "=SUM( 41% )" });
    model.dispatch("SET_VALUE", { xc: "C5", text: "=SUM(42 %)" });
    model.dispatch("SET_VALUE", { xc: "C6", text: "=SUM( 43 % )" });
    model.dispatch("SET_VALUE", { xc: "C7", text: "=SUM(4.1%)" });
    model.dispatch("SET_VALUE", { xc: "C8", text: "=SUM( 4.2% )" });
    model.dispatch("SET_VALUE", { xc: "C9", text: "=SUM(.1%)" });
    model.dispatch("SET_VALUE", { xc: "C10", text: "=SUM( .2% )" });
    model.dispatch("SET_VALUE", { xc: "C11", text: "=SUM(3.%)" });
    model.dispatch("SET_VALUE", { xc: "C12", text: "=SUM( 4.% )" });

    model.dispatch("SET_VALUE", { xc: "D1", text: "=COUNT(%)" });
    model.dispatch("SET_VALUE", { xc: "D2", text: "=COUNT( %)" });
    model.dispatch("SET_VALUE", { xc: "D3", text: "=COUNT(40%)" });
    model.dispatch("SET_VALUE", { xc: "D4", text: "=COUNT( 41% )" });
    model.dispatch("SET_VALUE", { xc: "D5", text: "=COUNT(42 %)" });
    model.dispatch("SET_VALUE", { xc: "D6", text: "=COUNT( 43 % )" });
    model.dispatch("SET_VALUE", { xc: "D7", text: "=COUNT(4.1%)" });
    model.dispatch("SET_VALUE", { xc: "D8", text: "=COUNT( 4.2% )" });
    model.dispatch("SET_VALUE", { xc: "D9", text: "=COUNT(.1%)" });
    model.dispatch("SET_VALUE", { xc: "D10", text: "=COUNT( .2% )" });
    model.dispatch("SET_VALUE", { xc: "D11", text: "=COUNT(3.%)" });
    model.dispatch("SET_VALUE", { xc: "D12", text: "=COUNT( 4.% )" });

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

    model.dispatch("SET_VALUE", { xc: "A1", text: '"%"' });
    model.dispatch("SET_VALUE", { xc: "A2", text: '" %"' });
    model.dispatch("SET_VALUE", { xc: "A3", text: '"40%"' });
    model.dispatch("SET_VALUE", { xc: "A4", text: '" 41% "' });
    model.dispatch("SET_VALUE", { xc: "A5", text: '"42 %"' });
    model.dispatch("SET_VALUE", { xc: "A6", text: '" 43 % "' });
    model.dispatch("SET_VALUE", { xc: "A7", text: '"4.1%"' });
    model.dispatch("SET_VALUE", { xc: "A8", text: '" 4.2% "' });
    model.dispatch("SET_VALUE", { xc: "A9", text: '".1%"' });
    model.dispatch("SET_VALUE", { xc: "A10", text: '" .2% "' });
    model.dispatch("SET_VALUE", { xc: "A11", text: '"3.%"' });
    model.dispatch("SET_VALUE", { xc: "A12", text: '" 4.% "' });

    model.dispatch("SET_VALUE", { xc: "B1", text: '="%"' });
    model.dispatch("SET_VALUE", { xc: "B2", text: '=" %"' });
    model.dispatch("SET_VALUE", { xc: "B3", text: '="40%"' });
    model.dispatch("SET_VALUE", { xc: "B4", text: '=" 41% "' });
    model.dispatch("SET_VALUE", { xc: "B5", text: '="42 %"' });
    model.dispatch("SET_VALUE", { xc: "B6", text: '=" 43 % "' });
    model.dispatch("SET_VALUE", { xc: "B7", text: '="4.1%"' });
    model.dispatch("SET_VALUE", { xc: "B8", text: '=" 4.2% "' });
    model.dispatch("SET_VALUE", { xc: "B9", text: '=".1%"' });
    model.dispatch("SET_VALUE", { xc: "B10", text: '=" .2% "' });
    model.dispatch("SET_VALUE", { xc: "B11", text: '="3.%"' });
    model.dispatch("SET_VALUE", { xc: "B12", text: '=" 4.% "' });

    model.dispatch("SET_VALUE", { xc: "C1", text: '=SUM("%")' });
    model.dispatch("SET_VALUE", { xc: "C2", text: '=SUM(" %")' });
    model.dispatch("SET_VALUE", { xc: "C3", text: '=SUM("40%")' });
    model.dispatch("SET_VALUE", { xc: "C4", text: '=SUM(" 41% ")' });
    model.dispatch("SET_VALUE", { xc: "C5", text: '=SUM("42 %")' });
    model.dispatch("SET_VALUE", { xc: "C6", text: '=SUM(" 43 % ")' });
    model.dispatch("SET_VALUE", { xc: "C7", text: '=SUM("4.1%")' });
    model.dispatch("SET_VALUE", { xc: "C8", text: '=SUM(" 4.2% ")' });
    model.dispatch("SET_VALUE", { xc: "C9", text: '=SUM(".1%")' });
    model.dispatch("SET_VALUE", { xc: "C10", text: '=SUM(" .2% ")' });
    model.dispatch("SET_VALUE", { xc: "C11", text: '=SUM("3.%")' });
    model.dispatch("SET_VALUE", { xc: "C12", text: '=SUM(" 4.% ")' });

    model.dispatch("SET_VALUE", { xc: "D1", text: '=COUNT("%")' });
    model.dispatch("SET_VALUE", { xc: "D2", text: '=COUNT(" %")' });
    model.dispatch("SET_VALUE", { xc: "D3", text: '=COUNT("40%")' });
    model.dispatch("SET_VALUE", { xc: "D4", text: '=COUNT(" 41% ")' });
    model.dispatch("SET_VALUE", { xc: "D5", text: '=COUNT("42 %")' });
    model.dispatch("SET_VALUE", { xc: "D6", text: '=COUNT(" 43 % ")' });
    model.dispatch("SET_VALUE", { xc: "D7", text: '=COUNT("4.1%")' });
    model.dispatch("SET_VALUE", { xc: "D8", text: '=COUNT(" 4.2% ")' });
    model.dispatch("SET_VALUE", { xc: "D9", text: '=COUNT(".1%")' });
    model.dispatch("SET_VALUE", { xc: "D10", text: '=COUNT(" .2% ")' });
    model.dispatch("SET_VALUE", { xc: "D11", text: '=COUNT("3.%")' });
    model.dispatch("SET_VALUE", { xc: "D12", text: '=COUNT(" 4.% ")' });

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

  test("cells in error are correctly reset", async () => {
    const model = new Model();
    let value: string | number = "LOADING...";
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: async () => value,
      async: true,
      args: args(``),
      returns: ["ANY"],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=SUM(A2)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=SUM(A3)" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=-GETVALUE()" });
    await waitForRecompute();
    expect(getCell(model, "A1")!.error).toBeDefined();
    expect(getCell(model, "A2")!.error).toBeDefined();
    expect(getCell(model, "A3")!.error).toBeDefined();
    value = 2;
    model.dispatch("EVALUATE_CELLS", {});
    await waitForRecompute();
    expect(getCell(model, "A1")!.value).toBe(-2);
    expect(getCell(model, "A2")!.value).toBe(-2);
    expect(getCell(model, "A3")!.value).toBe(-2);
  });

  // TO DO: add tests for exp format (ex: 4E10)
  // RO DO: add tests for DATE string format (ex match: "28 02 2020")
});
