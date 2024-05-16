import { Model } from "../../src";
import { setCellContent, setFormat } from "../test_helpers/commands_helpers";
import { getCellContent, getEvaluatedCell, getRangeValues } from "../test_helpers/getters_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  createModelFromGrid,
  evaluateCell,
  getRangeFormatsAsMatrix,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("ARRAY.CONSTRAIN function", () => {
  test("ARRAY.CONSTRAIN takes 3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 2, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 2, 2, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("rows and columns arguments must be positive numbers", () => {
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, -1, 2)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 0, 2)" })).toBe("#ERROR");

    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 1, -1)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=ARRAY.CONSTRAIN(D1:F2, 1, 0)" })).toBe("#ERROR");

    expect(evaluateCell("A1", { A1: '=ARRAY.CONSTRAIN(D1:F2, "ok", 2)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=ARRAY.CONSTRAIN(D1:F2, 1, "ok")' })).toBe("#ERROR");
  });

  test("Constraint array", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B2", C3: "C3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=ARRAY.CONSTRAIN(A1:C3, 2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      ["A1", "B1", null],
      ["A2", "B2", null],
      [null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });

  test("ARRAY.CONSTRAINT: result format depends on range's format", () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "1",
      A2: '01/10/2020',
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=ARRAY.CONSTRAIN(A1:B2, 2, 2)");
    expect(getRangeFormatsAsMatrix(model, "D1:E2")).toEqual([
      ["0%", ""],
      ["mm/dd/yyyy", ""],
    ]);
  });

  test("Constraint array returns whole array if arguments col/row are greater than the range dimensions", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1",
      A2: "A2", B2: "B2", C2: "C2",
      A3: "A3", B3: "B3", C3: "C3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=ARRAY.CONSTRAIN(A1:C3, 11, 569)");
    expect(getRangeValuesAsMatrix(model, "D1:G4")).toEqual([
      ["A1", "B1", "C1", null],
      ["A2", "B2", "C2", null],
      ["A3", "B3", "C3", null],
      [null, null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:G4")).toBeTruthy();
  });

  test("Undefined values are transformed to zeroes", () => {
    const grid = { A1: "A1", B1: "B1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=ARRAY.CONSTRAIN(A1:B2, 2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      ["A1", "B1", null],
      [0, 0, null],
      [null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });

  test("Constraint single cell", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);

    setCellContent(model, "D1", "=ARRAY.CONSTRAIN(A1, 2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);

    setCellContent(model, "D1", '=ARRAY.CONSTRAIN("oi", 2, 2)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["oi"]]);
  });

  test("ARRAY.CONSTRAIN accepts errors in the first argument", () => {
    const grid = { A1: "=KABOUM", A2: "42", B1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "C1", "=ARRAY.CONSTRAIN(A1:B3, 2, 2)");
    expect(getRangeValuesAsMatrix(model, "C1:D2")).toEqual([
      ["#BAD_EXPR", "#DIV/0!"],
      [42, 0],
    ]);
  });
});

describe("CHOOSECOLS function", () => {
  test("CHOOSECOLS takes at least 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 1, 1)" })).toBe(0);
  });

  test("Column argument bust be greater than 0 and smaller than the number of cols in the range", () => {
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Column arguments should be numbers, or convertible to number", () => {
    expect(evaluateCell("A1", { A1: '=CHOOSECOLS(B1:B5, "kamoulox")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, TRUE)" })).toBe(0); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSECOLS(B1:B5, 1)" })).toBe(0);
  });

  test("Chose a single cell", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);

    setCellContent(model, "D1", "=CHOOSECOLS(A1:B3, 1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);

    setCellContent(model, "D1", '=CHOOSECOLS("A1", 1)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
  });

  test("Chose a column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:B3, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", null],
      ["A2", null],
      ["A3", null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Chose multiple columns", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:B3, 1, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
      ["A3", "B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Chose multiple column with a range", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3", C1: "1", C2: "2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:B3, C1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
      ["A3", "B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Accept negative index", () => {
    const grid = { A1: "A1", B1: "B1", C1: "C1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:C1, -1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["C1"]]);
  });

  test("CHOOSECOLS: result format depends on range's format", () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "1.00",
      A2: "01/10/2020",  B2: "test",
      A3: "1"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:B3, 1, 2)");
    expect(getRangeFormatsAsMatrix(model, "D1:E3")).toEqual([
      ["0%", ""],
      ["mm/dd/yyyy", ""],
      ["", ""],
    ]);
  });

  test("Order of chosen column is respected (row-first for ranges)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1", D1: "1", E1: "2",
      A2: "A2", B2: "B2", C2: "C2", D2: "3", E2: "1",
      A3: "A3", B3: "B3", C3: "C3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D5", "=CHOOSECOLS(A1:C3, D1:E2, 2)");
    expect(getRangeValuesAsMatrix(model, "D5:H7")).toEqual([
      ["A1", "B1", "C1", "A1", "B1"],
      ["A2", "B2", "C2", "A2", "B2"],
      ["A3", "B3", "C3", "A3", "B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D5:H7")).toBeTruthy();
  });

  test("Undefined values are transformed to zeroes", () => {
    const grid = { A1: "A1", A2: "A2", A3: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSECOLS(A1:A3, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:D3")).toEqual([["A1"], ["A2"], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D3")).toBeTruthy();
  });

  test("CHOOSECOLS accepts errors in the first argument", () => {
    const grid = { A1: "=KABOUM", A2: "42", A3: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "B1", "=CHOOSECOLS(A1:A3, 1)");
    expect(getRangeValuesAsMatrix(model, "B1:B3")).toEqual([["#BAD_EXPR"], [42], ["#DIV/0!"]]);
  });
});

describe("CHOOSEROWS function", () => {
  test("CHOOSEROWS takes at least 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 1, 1)" })).toBe(0);
  });

  test("Column argument bust be greater than 0 and smaller than the number of rows in the range", () => {
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Column arguments should be numbers, or convertible to number", () => {
    expect(evaluateCell("A1", { A1: '=CHOOSEROWS(B1:E1, "kamoulox")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, TRUE)" })).toBe(0); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHOOSEROWS(B1:E1, 1)" })).toBe(0);
  });

  test("Chose a single cell", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);

    setCellContent(model, "D1", "=CHOOSEROWS(A1:B3, 1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);

    setCellContent(model, "D1", '=CHOOSEROWS("A1", 1)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
  });

  test("Chose a row", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:C2, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:F2")).toEqual([
      ["A1", "B1", "C1"],
      [null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F2")).toBeTruthy();
  });

  test("Chose multiple rows", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:C2, 1, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Chose multiple rows with a range", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3", C1: "1", C2: "2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:B3, C1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Accept negative index", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:A3, -1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A3"]]);
  });

  test("CHOOSEROWS: result format depends on range's format", () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "1.00",
      A2: "01/10/2020", B2: "test",
      A3: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:C2, 1, 2)");
    expect(getRangeFormatsAsMatrix(model, "D1:E3")).toEqual([
      ["0%", ""],
      ["mm/dd/yyyy", ""],
      ["", ""],
    ]);
  });

  test("Order of chosen rows is respected (row-first for ranges)", () => {
    //prettier-ignore
    const grid = {
      A1: "A1", B1: "B1", C1: "C1", D1: "1", E1: "2",
      A2: "A2", B2: "B2", C2: "C2", D2: "3", E2: "1",
      A3: "A3", B3: "B3", C3: "C3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D5", "=CHOOSEROWS(A1:C3, D1:E2, 2)");
    expect(getRangeValuesAsMatrix(model, "D5:F9")).toEqual([
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["A3", "B3", "C3"],
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D5:F9")).toBeTruthy();
  });

  test("Undefined values are transformed to zeroes", () => {
    const grid = { A1: "A1", B1: "B1", C1: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=CHOOSEROWS(A1:C1, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:F1")).toEqual([["A1", "B1", 0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F1")).toBeTruthy();
  });

  test("CHOOSEROWS accepts errors in the first argument", () => {
    const grid = { A1: "=KABOUM", B1: "42", C1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=CHOOSEROWS(A1:C1, 1)");
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["#BAD_EXPR", 42, "#DIV/0!"]]);
  });
});

describe("EXPAND function", () => {
  test("EXPAND takes 2-4 arguments", () => {
    expect(evaluateCell("A1", { A1: "=EXPAND()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 2, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 2, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("rows argument must be greater or equal to the number of rows in the range", () => {
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 1, 2, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 2, 0)" })).toBe(0);
  });

  test("columns argument must be greater or equal to the number of cols in the range", () => {
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 1, 0)" })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: "=EXPAND(B1:C2, 2, 2, 0)" })).toBe(0);
  });

  test("Expand rows", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1",
      A2: "A2", B2: "B2"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1:B2, 3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      ["A1", "B1", null],
      ["A2", "B2", null],
      [0, 0, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });

  test("Expand columns", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1",
      A2: "A2", B2: "B2"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1:B2, 2, 3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      ["A1", "B1", 0],
      ["A2", "B2", 0],
      [null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });

  test("Expand rows and columns with a default value", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1",
      A2: "A2", B2: "B2"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1:B2, 3, 3, 66)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      ["A1", "B1", 66],
      ["A2", "B2", 66],
      [66, 66, 66],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });

  test("Expand single value", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1, 2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", 0],
      [0, 0],
    ]);

    setCellContent(model, "D1", '=EXPAND("A1", 2, 2)');
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", 0],
      [0, 0],
    ]);
  });

  test("EXPAND: result format depends on arguments' format", () => {
    //prettier-ignore
    const grid = {
      A1: "1%",  B1: "1.00",
      A2: "01/10/2020", B2: "test"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1:B2, 3, 3, A1)");
    expect(getRangeFormatsAsMatrix(model, "D1:F3")).toEqual([
      ["0%", "", "0%"],
      ["mm/dd/yyyy", "", "0%"],
      ["0%", "0%", "0%"],
    ]);
  });

  test("Falsy values aren't replaced with the pad_with argument", () => {
    const grid = { A1: "0", A2: "", B1: undefined, B2: "=FALSE" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=EXPAND(A1:B2, 3, 3, 66)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [0, 0, 66],
      [0, false, 66],
      [66, 66, 66],
    ]);
  });

  test("EXPAND accepts errors in the first argument", () => {
    const grid = { A1: "=KABOUM", B1: "42", C1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=EXPAND(A1:C1, 1, 4, 24)");
    expect(getRangeValuesAsMatrix(model, "A2:D2")).toEqual([["#BAD_EXPR", 42, "#DIV/0!", 24]]);
  });

  test("EXPAND accepts error on the last argument", () => {
    const model = createModelFromGrid({ A1: "42" });
    setCellContent(model, "A2", "=EXPAND(A1, 1, 2, 1/0)");
    expect(getRangeValuesAsMatrix(model, "A2:B2")).toEqual([[42, "#DIV/0!"]]);
  });
});

describe("FLATTEN function", () => {
  test("FLATTEN takes 1 at least arguments", () => {
    expect(evaluateCell("A1", { A1: "=FLATTEN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FLATTEN(B1:C2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=FLATTEN(B1:C2, B1:C2)" })).toBe(0);
  });

  test("Flatten a column returns the column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FLATTEN(A1:A3)");
    expect(getRangeValuesAsMatrix(model, "D1:D3")).toEqual([["A1"], ["A2"], ["A3"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D3")).toBeTruthy();
  });

  test("Flatten a row", () => {
    const grid = { A1: "A1", B1: "B1", C1: "C1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FLATTEN(A1:C1)");
    expect(getRangeValuesAsMatrix(model, "D1:D3")).toEqual([["A1"], ["B1"], ["C1"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D3")).toBeTruthy();
  });

  test("FLATTEN: result format depends on range's format", () => {
    const grid = { A1: "1%", B1: "01/10/2020", C1: "1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FLATTEN(A1:C1)");
    expect(getRangeFormatsAsMatrix(model, "D1:D3")).toEqual([["0%"], ["mm/dd/yyyy"], [""]]);
  });

  test("Flatten a range goes row-first", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FLATTEN(A1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:D6")).toEqual([
      ["A1"],
      ["B1"],
      ["C1"],
      ["A2"],
      ["B2"],
      ["C2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D6")).toBeTruthy();
  });

  test("Flatten a range with undefined values transform them to zeroes", () => {
    const grid = { A1: "A1", A2: undefined, B1: undefined, B2: "B2", C1: "C1", C2: "C2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FLATTEN(A1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:D6")).toEqual([
      ["A1"],
      [0],
      ["C1"],
      [0],
      ["B2"],
      ["C2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D6")).toBeTruthy();
  });

  test("Flatten multiple ranges", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: "B2", D1: "D1", D2: "D2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", '=FLATTEN(A1:B2, D1:D2, "ok", A1)');
    expect(getRangeValuesAsMatrix(model, "E1:E8")).toEqual([
      ["A1"],
      ["B1"],
      ["A2"],
      ["B2"],
      ["D1"],
      ["D2"],
      ["ok"],
      ["A1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:E8")).toBeTruthy();
  });

  test("FLATTEN accepts errors in arguments", () => {
    const grid = { A1: "=KABOUM", B1: "42", C1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=FLATTEN(A1, B1:C1)");
    expect(getRangeValuesAsMatrix(model, "A2:A4")).toEqual([["#BAD_EXPR"], [42], ["#DIV/0!"]]);
  });
});

describe("FREQUENCY function", () => {
  test("FREQUENCY takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=FREQUENCY()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FREQUENCY(B1:B5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FREQUENCY(B1:B5, C1:C3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=FREQUENCY(B1:B5, C1:C3, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Frequency with single class test", () => {
    const grid = { A1: "1", A2: "2", A3: "3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:A3, A1)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([
      [1], // elements <= 1
      [2], // elements > 1
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();

    setCellContent(model, "D1", "=FREQUENCY(A1:A3, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([
      [1], // elements <= 1
      [2], // elements > 1
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("Simple frequency test", () => {
    //prettier-ignore
    const grid = {
      A1: "1", C1: "1",
      A2: "3", C2: "3",
      A3: "2", C3: "5",
      A4: "5",
      A5: "4",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:A6, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([
      [1], // elements <= 1
      [2], // 1 < elements <= 3
      [2], // 3 < elements <= 5
      [0], // 5 < elements
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();
  });

  test("Classes order is preserved", () => {
    //prettier-ignore
    const grid = {
      A1: "1", C1: "3",
      A2: "2", C2: "1",
      A3: "3", C3: "5",
      A4: "4",
      A5: "5",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:A6, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([[2], [1], [2], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();
  });

  test("Classes order is row-first", () => {
    //prettier-ignore
    const grid = {
      A1: "1", C1: "3", D1: "1",
      A2: "2", C2: "5",
      A3: "3",
      A4: "4",
      A5: "5",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=FREQUENCY(A1:A6, C1:D2)");
    expect(getRangeValuesAsMatrix(model, "E1:E4")).toEqual([[2], [1], [2], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:E4")).toBeTruthy();
  });

  test("Data can be multidimensional range", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "3",
      A2: "2", B2: "2", C2: "1",
      A3: "3", B3: "3", C3: "5",
      A4: "4", B4: "4",
      A5: "5", B5: "6",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:B6, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([[4], [2], [3], [1]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();
  });

  test("Non-number values are ignored", () => {
    //prettier-ignore
    const grid = {
      A1: "1",        B1: "1",    C1: "3",
      A2: "2",        B2: "2",    C2: "1",
      A3: "3",        B3: "3",    C3: "5",
      A4: "4",        B4: "4",    C4 : "geronimo",
      A5: "5",        B5: "6",    C5 : undefined,
      A6 : "hello",   B6 : "true",
      A7 : undefined, B7 : "=A6",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:B7, C1:C5)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([[4], [2], [3], [1]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();
  });

  test("Number strings and empty cells are ignored", () => {
    const grid = { A1: '="1"', A2: "2", A3: '=CONCAT(3, "")', A4: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FREQUENCY(A1:A4, 1)");
    expect(getRangeValues(model, "D1:D2")).toEqual([
      0, // elements <= 1
      1, // elements > 1
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("FREQUENCY accepts errors in the first argument", () => {
    expect(
      evaluateCell("D1", { D1: "=FREQUENCY(A1:A3, 42)", A1: "=KABOUM", A2: "42", A3: "=1/0" })
    ).toBe(1);
  });
});

describe("HSTACK function", () => {
  test("HSTACK takes at least 1 argument", () => {
    expect(evaluateCell("A1", { A1: "=HSTACK()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=HSTACK(5)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=HSTACK(5, 0)" })).toBe(5);
  });

  test("HSTACK with single values", () => {
    const grid = { E1: "hey" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A1", "=HSTACK(5, 9, E1)");
    expect(getRangeValuesAsMatrix(model, "A1:C1")).toEqual([[5, 9, "hey"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A1:C1")).toBeTruthy();
  });

  test("HSTACK with ranges of same dimensions", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=HSTACK(A1:A3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
      ["A3", "B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("HSTACK with ranges of different dimensions: padded with zeroes", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=HSTACK(A1:A3, A1:B2, 9)");
    expect(getRangeValuesAsMatrix(model, "D1:G3")).toEqual([
      ["A1", "A1", "B1", 9],
      ["A2", "A2", "B2", 0],
      ["A3", 0, 0, 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:G3")).toBeTruthy();
  });

  test("HSTACK: result format depends on range's format", () => {
    //prettier-ignore
    const grid = {
      A1: "1%", B1: "01/10/2020",
      A2: "5", B2: "01/01",
      A3: ""
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=HSTACK(A1:A3, A1:B2, 9)");
    expect(getRangeFormatsAsMatrix(model, "D1:G3")).toEqual([
      ["0%", "0%", "mm/dd/yyyy", ""],
      ["", "", "mm/dd", ""],
      ["", "", "", ""],
    ]);
  });

  test("undefined values are replaced with zeroes", () => {
    const grid = { A1: "A1", A2: undefined, B1: undefined, B2: "B2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=HSTACK(A1:A2, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", 0],
      [0, "B2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("HSTACK accepts errors in arguments", () => {
    const grid = { A1: "=KABOUM", B1: "42", B2: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "C1", "=HSTACK(A1, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "C1:D2")).toEqual([
      ["#BAD_EXPR", 42],
      [0, "#DIV/0!"],
    ]);
  });
});

describe("MDETERM function", () => {
  test("MDETERM takes 1 arguments", () => {
    expect(evaluateCell("A1", { A1: "=MDETERM()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MDETERM(1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MDETERM(1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Argument must be a square matrix", () => {
    const grid = { A1: "1", B1: "0", A2: "0", B2: "1" };
    expect(evaluateCell("D1", { D1: "=MDETERM(A1:B1)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("D1", { D1: "=MDETERM(A1:A2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Argument must only contain numbers", () => {
    expect(evaluateCell("D1", { D1: "=MDETERM(D2)", D2: "hello" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MINVERSE(D2)", D2: undefined })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MINVERSE(D2)", D2: '="5"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Determinant of 1x1 matrix", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=MDETERM(A1)", ...grid })).toEqual(5);

    expect(evaluateCell("D1", { D1: "=MDETERM(5)", ...grid })).toEqual(5);
  });

  test("Determinant of matrices", () => {
    //prettier-ignore
    let grid = {
      A1: "1", B1: "1", C1: "0",
      A2: "1", B2: "1", C2: "1",
      A3: "0", B3: "2", C3: "0",
     };
    expect(evaluateCell("D1", { D1: "=MDETERM(A1:C3)", ...grid })).toEqual(-2);

    //prettier-ignore
    grid = {
      A1: "1", B1: "1", C1: "0",
      A2: "0", B2: "2", C2: "0",
      A3: "1", B3: "1", C3: "1",
     };
    expect(evaluateCell("D1", { D1: "=MDETERM(A1:C3)", ...grid })).toEqual(2);

    //prettier-ignore
    grid = {
        A1: "-51", B1: "-1", C1: "56",
        A2: "12", B2: "-2", C2: "18",
        A3: "-100", B3: "1", C3: "25.65",
    };
    expect(evaluateCell("D1", { D1: "=MDETERM(A1:C3)", ...grid })).toBeCloseTo(-4885.9);
  });
});

describe("MINVERSE function", () => {
  test("MINVERSE takes 1 arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINVERSE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MINVERSE(1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINVERSE(1, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Argument must be a square matrix", () => {
    const grid = { A1: "1", B1: "0", A2: "0", B2: "1" };
    expect(evaluateCell("D1", { D1: "=MINVERSE(A1:B1)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("D1", { D1: "=MINVERSE(A1:A2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Argument must be an invertible matrix", () => {
    const grid = { A1: "1", B1: "1", A2: "1", B2: "1" };
    expect(evaluateCell("D1", { D1: "=MINVERSE(0)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MINVERSE(A1:B2)", ...grid })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Argument must only contain numbers", () => {
    expect(evaluateCell("D1", { D1: "=MINVERSE(D2)", D2: "hello" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MINVERSE(D2)", D2: undefined })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MINVERSE(D2)", D2: '="5"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Invert 1x1 matrix", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=MINVERSE(A1)", ...grid })).toEqual(1 / 5);

    expect(evaluateCell("D1", { D1: "=MINVERSE(5)", ...grid })).toEqual(1 / 5);
  });

  test("Invert matrices", () => {
    //prettier-ignore
    let grid = {
      A1: "1", B1: "1", C1: "0",
      A2: "1", B2: "1", C2: "1",
      A3: "0", B3: "2", C3: "0",
     };
    let model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=MINVERSE(A1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [1, 0, -0.5],
      [0, 0, 0.5],
      [-1, 1, 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();

    //prettier-ignore
    grid = {
      A1: "-5", B1: "1", C1: "0",
      A2: "1", B2: "6", C2: "1",
      A3: "0", B3: "1", C3: "0",
     };
    model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=MINVERSE(A1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [-0.2, 0, 0.2],
      [0, 0, 1],
      [0.2, 1, -6.2],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });
});

describe("MMULT function", () => {
  test("MMULT takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=MMULT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MMULT(1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MMULT(1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MMULT(1, 1, 1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Sizes of the matrices should allow for matrix multiplication", () => {
    expect(evaluateCell("D1", { D1: "=MMULT(A1:A2, A1:A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MMULT(A1:B1, A1:B1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("D1", { D1: "=MMULT(A1:A2, A1:B2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Argument must only contain number, or values convertible to number", () => {
    expect(evaluateCell("D1", { D1: "=MMULT(D2, D2)", D2: "hello" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
  });

  test("Multiply 1x1 matrices", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=MMULT(A1, A1)", ...grid })).toEqual(25);

    expect(evaluateCell("D1", { D1: "=MMULT(5, 5)", ...grid })).toEqual(25);
  });

  test("Invert matrices", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "2", C1: "3",
      A2: "4", B2: "5", C2: "6",
      A3: "7", B3: "8", C3: "9",
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=MMULT(A1:C3, A1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [30, 36, 42],
      [66, 81, 96],
      [102, 126, 150],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();

    setCellContent(model, "D1", "=MMULT(A1:C3, A1:A3)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [30, null, null],
      [66, null, null],
      [102, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();

    setCellContent(model, "D1", "=MMULT(A1:B1, A1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [9, 12, 15],
      [null, null, null],
      [null, null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();

    setCellContent(model, "D1", "=MMULT(A1:A3, A1:C1)");
    expect(getRangeValuesAsMatrix(model, "D1:F3")).toEqual([
      [1, 2, 3],
      [4, 8, 12],
      [7, 14, 21],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F3")).toBeTruthy();
  });
});

describe("SUMPRODUCT function", () => {
  test("SUMPRODUCT takes at least 1 argument", () => {
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(5)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(5, 5)" })).toBe(25);
  });

  test("Range values must have the same dimensions", () => {
    expect(evaluateCell("D1", { D1: "=SUMPRODUCT(A1:A2, A1:B1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("D1", { D1: "=SUMPRODUCT(A1:A2, A1:A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("D1", { D1: "=SUMPRODUCT(A1:A2, 5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("SUMPRODUCT with numbers arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(6)" })).toBe(6);
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(6, 5)" })).toBe(30);
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(6, 5, 10)" })).toBe(300);
    expect(evaluateCell("A1", { A1: "=SUMPRODUCT(6, 5, B1)", B1: "10" })).toBe(300);
  });

  test("SUMPRODUCT with ranges", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "2", C1: "3",
      A2: "4", B2: "5", C2: "6",
      A3: "7", B3: "8", C3: "9",
     };
    expect(evaluateCell("D1", { D1: "=SUMPRODUCT(A1:A3, B1:B3)", ...grid })).toBe(
      1 * 2 + 4 * 5 + 7 * 8
    );

    expect(evaluateCell("D1", { D1: "=SUMPRODUCT(A1:B2, B2:C3)", ...grid })).toBe(
      1 * 5 + 2 * 6 + 4 * 8 + 5 * 9
    );
  });

  test("Undefined or non-number values are replaced by zeroes", () => {
    const grid = { A1: "1", A2: "1", A3: "1", B1: '="5"', B2: undefined, B3: "hello" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=SUMPRODUCT(A1:A3, B1:B3)");
    expect(getCellContent(model, "D1")).toBe("0");

    setCellContent(model, "D1", '=SUMPRODUCT("3")');
    expect(getCellContent(model, "D1")).toBe("0");
  });

  test("SUMPRODUCT accepts errors in arguments", () => {
    // @compatibility: on google sheets and Excel errors are not accepted
    const grid = { A1: "=KABOUM", A2: "42", B1: "1", B2: "2" };
    expect(evaluateCell("C1", { C1: "=SUMPRODUCT(A1:A2, B1:B2)", ...grid })).toBe(84);
  });
});

describe("SUMX2MY2 function", () => {
  test("SUMX2MY2 takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUMX2MY2()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2MY2(5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2MY2(5, 5)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUMX2MY2(5, 5, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("2 arguments must have the same dimensions", () => {
    expect(evaluateCell("A1", { A1: "=SUMX2MY2(B1, B1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2MY2(B1:B2, B1:C1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
  });

  test("On single cell", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=SUMX2MY2(6, 4)", ...grid })).toBe(36 - 16);

    expect(evaluateCell("D1", { D1: "=SUMX2MY2(A1, 4)", ...grid })).toBe(25 - 16);
  });

  test("On range", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "4", B2: "5", B3: "6" };
    expect(evaluateCell("D1", { D1: "=SUMX2MY2(A1:A3, B1:B3)", ...grid })).toEqual(-63);
  });

  test("On multidimensional range", () => {
    const grid = { A1: "1", A2: "2", B1: "3", C1: "4", C2: "5", D1: "6" };
    expect(evaluateCell("E1", { E1: "=SUMX2MY2(A1:B2, C1:D2)", ...grid })).toEqual(-63);
  });

  test("Non-number values are ignored", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "2", B2: '="5"', B3: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=SUMX2MY2(A1:A3, B1:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual(-3);

    setCellContent(model, "E1", "=SUMX2MY2(A2:A3, B2:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual("#ERROR"); // No valid X/Y pairs
  });

  test("SUMX2MY2 accepts errors in arguments", () => {
    // @compatibility: on google sheets and Excel errors are not accepted
    const grid = { A1: "=KABOUM", A2: "42", B1: "1", B2: "2" };
    expect(evaluateCell("C1", { C1: "=SUMX2MY2(A1:A2, B1:B2)", ...grid })).toBe(1760);
  });
});

describe("SUMX2PY2 function", () => {
  test("SUMX2PY2 takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUMX2PY2()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2PY2(5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2PY2(5, 5)" })).toBe(50);
    expect(evaluateCell("A1", { A1: "=SUMX2PY2(5, 5, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("2 arguments must have the same dimensions", () => {
    expect(evaluateCell("A1", { A1: "=SUMX2PY2(B1, B1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMX2PY2(B1:B2, B1:C1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
  });

  test("On single cell", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=SUMX2PY2(6, 4)", ...grid })).toBe(36 + 16);

    expect(evaluateCell("D1", { D1: "=SUMX2PY2(A1, 4)", ...grid })).toBe(25 + 16);
  });

  test("On range", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "4", B2: "5", B3: "6" };
    expect(evaluateCell("D1", { D1: "=SUMX2PY2(A1:A3, B1:B3)", ...grid })).toEqual(91);
  });

  test("On multidimensional range", () => {
    const grid = { A1: "1", A2: "2", B1: "3", C1: "4", C2: "5", D1: "6" };
    expect(evaluateCell("E1", { E1: "=SUMX2PY2(A1:B2, C1:D2)", ...grid })).toEqual(91);
  });

  test("Non-number values are ignored", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "2", B2: '="5"', B3: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=SUMX2PY2(A1:A3, B1:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual(5);

    setCellContent(model, "E1", "=SUMX2PY2(A2:A3, B2:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual("#ERROR"); // No valid X/Y pairs
  });

  test("SUMX2PY2 accepts errors in arguments", () => {
    // @compatibility: on google sheets and Excel errors are not accepted
    const grid = { A1: "=KABOUM", A2: "42", B1: "1", B2: "2" };
    expect(evaluateCell("C1", { C1: "=SUMX2PY2(A1:A2, B1:B2)", ...grid })).toBe(1768);
  });
});

describe("SUMXMY2 function", () => {
  test("SUMXMY2 takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUMXMY2()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMXMY2(5)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMXMY2(5, 5)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SUMXMY2(5, 5, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("2 arguments must have the same dimensions", () => {
    expect(evaluateCell("A1", { A1: "=SUMXMY2(B1, B1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SUMXMY2(B1:B2, B1:C1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
  });

  test("On single cell", () => {
    const grid = { A1: "5" };
    expect(evaluateCell("D1", { D1: "=SUMXMY2(6, 4)", ...grid })).toBe((6 - 4) ** 2);
    expect(evaluateCell("D1", { D1: "=SUMXMY2(A1, 4)", ...grid })).toBe((5 - 4) ** 2);
  });

  test("On range", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "4", B2: "5", B3: "6" };
    expect(evaluateCell("D1", { D1: "=SUMXMY2(A1:A3, B1:B3)", ...grid })).toEqual(27);
  });

  test("On multidimensional range", () => {
    const grid = { A1: "1", A2: "2", B1: "3", C1: "4", C2: "5", D1: "6" };
    expect(evaluateCell("E1", { E1: "=SUMXMY2(A1:B2, C1:D2)", ...grid })).toEqual(27);
  });

  test("Non-number values are ignored", () => {
    const grid = { A1: "1", A2: "2", A3: "3", B1: "2", B2: '="5"', B3: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=SUMXMY2(A1:A3, B1:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual(1);

    setCellContent(model, "E1", "=SUMXMY2(A2:A3, B2:B3)");
    expect(getEvaluatedCell(model, "E1").value).toEqual("#ERROR"); // No valid X/Y pairs
  });

  test("SUMX2PY2 accepts errors in arguments", () => {
    // @compatibility: on google sheets and Excel errors are not accepted
    const grid = { A1: "=KABOUM", A2: "42", B1: "1", B2: "2" };
    expect(evaluateCell("C1", { C1: "=SUMXMY2(A1:A2, B1:B2)", ...grid })).toBe(1600);
  });
});

describe("TOCOL function", () => {
  test("TOCOL takes 1-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TOCOL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Argument ignore must be between 0 and 3", () => {
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 1)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 3)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=TOCOL(B1:B5, 4)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Simple TOCOL call", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOCOL(A1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:D6")).toEqual([
      ["A1"],
      ["B1"],
      ["A2"],
      ["B2"],
      ["A3"],
      ["B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D6")).toBeTruthy();
  });

  test("TOCOL: result format depends on range's format", () => {
    //prettier-ignore
    const grid = {
      A1: "1%", B1: "01/10/2020",
      A2: "5", B2: "01/01",
      A3: ""
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOCOL(A1:B3)");
    expect(getRangeFormatsAsMatrix(model, "D1:D6")).toEqual([
      ["0%"],
      ["mm/dd/yyyy"],
      [""],
      ["mm/dd"],
      [""],
      [""],
    ]);
  });

  test("TOCOL: undefined values are replaced by zeroes", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOCOL(A1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([["A1"], ["B1"], ["A2"], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();
  });

  test("Argument ignore", () => {
    const grid = { A1: "=KABOUM", B1: "B1", B2: "B2" };
    // ignore=0, keep all
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOCOL(A1:B2, 0)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([["#BAD_EXPR"], ["B1"], [0], ["B2"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D4")).toBeTruthy();

    // ignore=1, ignore empty cells
    setCellContent(model, "D1", "=TOCOL(A1:B2, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([["#BAD_EXPR"], ["B1"], ["B2"], [null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D3")).toBeTruthy();

    // ignore=2, ignore error cells
    setCellContent(model, "D1", "=TOCOL(A1:B2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([["B1"], [0], ["B2"], [null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D3")).toBeTruthy();

    // ignore=3, ignore empty cells and error cells
    setCellContent(model, "D1", "=TOCOL(A1:B2, 3)");
    expect(getRangeValuesAsMatrix(model, "D1:D4")).toEqual([["B1"], ["B2"], [null], [null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("No results returns #N/A", () => {
    const grid = { A1: undefined, A2: undefined };
    const model = createModelFromGrid(grid);

    setCellContent(model, "D1", "=TOCOL(A1:A2, 1)");
    expect(getCellContent(model, "D1")).toEqual("#N/A"); // @compatibility: on google sheets, return #REF!
  });

  test("Argument scan_by_column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOCOL(A1:B3, 0, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:D6")).toEqual([
      ["A1"],
      ["A2"],
      ["A3"],
      ["B1"],
      ["B2"],
      ["B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D6")).toBeTruthy();
  });
});

describe("TOROW function", () => {
  test("TOROW takes 1-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TOROW()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 0, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 0, 0, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("Argument ignore must be between 0 and 3", () => {
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, -1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 1)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 3)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=TOROW(B1:B5, 4)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Simple TOROW call", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOROW(A1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:I1")).toEqual([["A1", "B1", "A2", "B2", "A3", "B3"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:I1")).toBeTruthy();
  });

  test("TOROW: result format depends on range's format", () => {
    //prettier-ignore
    const grid = {
      A1: "1%", B1: "01/10/2020",
      A2: "5", B2: "01/01",
      A3: ""
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOROW(A1:B3)");
    expect(getRangeFormatsAsMatrix(model, "D1:I1")).toEqual([
      ["0%", "mm/dd/yyyy", "", "mm/dd", "", ""],
    ]);
  });

  test("TOROW: undefined values are replaced by zeroes", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOROW(A1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:G1")).toEqual([["A1", "B1", "A2", 0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:G1")).toBeTruthy();
  });

  test("Argument ignore", () => {
    const grid = { A1: "=KABOUM", B1: "B1", B2: "B2" };
    // ignore=0, keep all
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOROW(A1:B2, 0)");
    expect(getRangeValuesAsMatrix(model, "D1:G1")).toEqual([["#BAD_EXPR", "B1", 0, "B2"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:G1")).toBeTruthy();

    // ignore=1, ignore empty cells
    setCellContent(model, "D1", "=TOROW(A1:B2, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:G1")).toEqual([["#BAD_EXPR", "B1", "B2", null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F1")).toBeTruthy();

    // // ignore=2, ignore error cells
    setCellContent(model, "D1", "=TOROW(A1:B2, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:G1")).toEqual([["B1", 0, "B2", null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F1")).toBeTruthy();

    // // ignore=3, ignore empty cells and error cells
    setCellContent(model, "D1", "=TOROW(A1:B2, 3)");
    expect(getRangeValuesAsMatrix(model, "D1:G1")).toEqual([["B1", "B2", null, null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E1")).toBeTruthy();
  });

  test("No results returns #N/A", () => {
    const grid = { A1: undefined, A2: undefined };
    const model = createModelFromGrid(grid);

    setCellContent(model, "D1", "=TOROW(A1:A2, 1)");
    expect(getCellContent(model, "D1")).toEqual("#N/A"); // @compatibility: on google sheets, return #REF!
  });

  test("Argument scan_by_column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TOROW(A1:B3, 0, 1)");
    expect(getRangeValuesAsMatrix(model, "D1:I1")).toEqual([["A1", "A2", "A3", "B1", "B2", "B3"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:I1")).toBeTruthy();
  });
});

describe("TRANSPOSE function", () => {
  test("TRANSPOSE takes 1 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRANSPOSE()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=TRANSPOSE(B1:C2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=TRANSPOSE(B1:C2, 0)" })).toBe("#BAD_EXPR");
  });

  test("Transpose matrix", () => {
    const grid = { A1: "A1", A2: "A2", B1: "B1", B2: "B2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TRANSPOSE(A1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A2"],
      ["B1", "B2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("Transpose matrix with empty cells", () => {
    const grid = { A1: "A1", A2: undefined, B1: "B1", B2: undefined };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TRANSPOSE(A1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", 0],
      ["B1", 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("Transpose single cell", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=TRANSPOSE(A1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });

  test("Transpose single value", () => {
    const model = new Model();
    setCellContent(model, "D1", "=TRANSPOSE(5)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([[5]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });

  test("Format is transposed", () => {
    const grid = { A1: "1", A2: "5" };
    const model = createModelFromGrid(grid);
    setFormat(model, "A1", "0.00");
    setFormat(model, "A2", "0.000");
    setCellContent(model, "D1", "=TRANSPOSE(A1:A2)");
    expect(getRangeFormatsAsMatrix(model, "D1:E1")).toEqual([["0.00", "0.000"]]);
  });

  test("TRANSPOSE accepts errors in first arguments", () => {
    const grid = { A1: "=KABOUM", A2: "42", B1: "24", B2: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "C1", "=TRANSPOSE(A1:B2)");
    expect(getRangeValuesAsMatrix(model, "C1:D2")).toEqual([
      ["#BAD_EXPR", 42],
      [24, "#DIV/0!"],
    ]);
  });
});

describe("VSTACK function", () => {
  test("VSTACK takes at least 1 argument", () => {
    expect(evaluateCell("A1", { A1: "=VSTACK()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=VSTACK(5)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=VSTACK(5, 0)" })).toBe(5);
  });

  test("VSTACK with single values", () => {
    const grid = { E1: "oi" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A1", "=VSTACK(5, 9, E1)");
    expect(getRangeValuesAsMatrix(model, "A1:A3")).toEqual([[5], [9], ["oi"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A1:A3")).toBeTruthy();
  });

  test("VSTACK with ranges of same dimensions", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=VSTACK(A1:B1, A3:B3, A2:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", "B1"],
      ["A3", "B3"],
      ["A2", "B2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("VSTACK with ranges of different dimensions: padded with zeroes", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "B1", B2: "B2", B3: "B3" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=VSTACK(A1:B1, B2:B3, 9)");
    expect(getRangeValuesAsMatrix(model, "D1:E4")).toEqual([
      ["A1", "B1"],
      ["B2", 0],
      ["B3", 0],
      [9, 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E4")).toBeTruthy();
  });

  test("VSTACK: result format depends on range's format", () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "01/10/2020",
      A2: "5", B2: "01/01",
      A3: ""
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=VSTACK(A1:B1, B2:B3, 9)");
    expect(getRangeFormatsAsMatrix(model, "D1:E4")).toEqual([
      ["0%", "mm/dd/yyyy"],
      ["mm/dd", ""],
      ["", ""],
      ["", ""],
    ]);
  });

  test("undefined values are replaced with zeroes", () => {
    const grid = { A1: "A1", A2: undefined, B1: undefined, B2: "B2" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=VSTACK(A1:B1, A2:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", 0],
      [0, "B2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("VSTACK accepts errors in arguments", () => {
    const grid = { A1: "=KABOUM", B1: "=1/0", C1: "42" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=VSTACK(A1,B1:C1)");
    expect(getRangeValuesAsMatrix(model, "A2:B3")).toEqual([
      ["#BAD_EXPR", 0],
      ["#DIV/0!", 42],
    ]);
  });
});

describe("WRAPCOLS function", () => {
  test("WRAPCOLS takes 2-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=WRAPCOLS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=WRAPCOLS(B1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=WRAPCOLS(B1, 8)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=WRAPCOLS(B1, 8, "pad")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=WRAPCOLS(B1, 8, "pad", 0)' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("range argument must be a singe col or single row", () => {
    expect(evaluateCell("A1", { A1: '=WRAPCOLS(B1:C2, 8, "pad")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=WRAPCOLS(B3:D9, 8, "pad")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("with single cells", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPCOLS(A1, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([["A1"], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();

    setCellContent(model, "D1", "=WRAPCOLS(56, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([[56], [0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("with single column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", A4: "A4" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPCOLS(A1:A4, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A3"],
      ["A2", "A4"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("with single row", () => {
    const grid = { A1: "A1", B1: "B1", C1: "C1", D1: "D1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPCOLS(A1:D1, 2)");
    expect(getRangeValuesAsMatrix(model, "E1:F2")).toEqual([
      ["A1", "C1"],
      ["B1", "D1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:F2")).toBeTruthy();
  });

  test("WRAPCOLS: result format depends on range's format", () => {
    const grid = { A1: "1%", B1: "5", C1: "01/10/2020", D1: "01/01" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPCOLS(A1:D1, 3, A1)");
    expect(getRangeFormatsAsMatrix(model, "E1:F3")).toEqual([
      ["0%", "mm/dd"],
      ["", "0%"],
      ["mm/dd/yyyy", "0%"],
    ]);
  });

  test("array padding", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3" };

    // pad with 0 by default
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPCOLS(A1:A3, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A3"],
      ["A2", 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();

    // pad_with argument value
    setCellContent(model, "D1", '=WRAPCOLS(A1:A3, 2, "padding")');
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A3"],
      ["A2", "padding"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("undefined values are replaced by zeroes", () => {
    const grid = { A1: "A1", B1: undefined, C1: undefined, D1: "D1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPCOLS(A1:D1, 2)");
    expect(getRangeValuesAsMatrix(model, "E1:F2")).toEqual([
      ["A1", 0],
      [0, "D1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:F2")).toBeTruthy();
  });

  test("WRAPCOLS accepts errors in first argument", () => {
    const grid = { A1: "=KABOUM", B1: "42", C1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=WRAPCOLS(A1:C1, 2)");
    expect(getRangeValuesAsMatrix(model, "A2:B3")).toEqual([
      ["#BAD_EXPR", "#DIV/0!"],
      [42, 0],
    ]);
  });
});

describe("WRAPROWS function", () => {
  test("WRAPROWS takes 2-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=WRAPROWS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=WRAPROWS(B1)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=WRAPROWS(B1, 8)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=WRAPROWS(B1, 8, "pad")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=WRAPROWS(B1, 8, "pad", 0)' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("range argument must be a singe col or single row", () => {
    expect(evaluateCell("A1", { A1: '=WRAPROWS(B1:C2, 8, "pad")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=WRAPROWS(B3:D9, 8, "pad")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("with single cells", () => {
    const grid = { A1: "A1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPROWS(A1, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E1")).toEqual([["A1", 0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E1")).toBeTruthy();

    setCellContent(model, "D1", "=WRAPROWS(56, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E1")).toEqual([[56, 0]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E1")).toBeTruthy();
  });

  test("with single column", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", A4: "A4" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPROWS(A1:A4, 2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A2"],
      ["A3", "A4"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("with single row", () => {
    const grid = { A1: "A1", B1: "B1", C1: "C1", D1: "D1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPROWS(A1:D1, 2)");
    expect(getRangeValuesAsMatrix(model, "E1:F2")).toEqual([
      ["A1", "B1"],
      ["C1", "D1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:F2")).toBeTruthy();
  });

  test("WRAPROWS: result format depends on range's format", () => {
    const grid = { A1: "1%", B1: "5", C1: "01/10/2020", D1: "01/01" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPROWS(A1:D1, 3, A1)");
    expect(getRangeFormatsAsMatrix(model, "E1:G2")).toEqual([
      ["0%", "", "mm/dd/yyyy"],
      ["mm/dd", "0%", "0%"],
    ]);
  });

  test("array padding", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", A4: "A4" };

    // pad with 0 by default
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=WRAPROWS(A1:A4, 3)");
    expect(getRangeValuesAsMatrix(model, "D1:F2")).toEqual([
      ["A1", "A2", "A3"],
      ["A4", 0, 0],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F2")).toBeTruthy();

    // pad_with argument value
    setCellContent(model, "D1", '=WRAPROWS(A1:A4, 3, "padding")');
    expect(getRangeValuesAsMatrix(model, "D1:F2")).toEqual([
      ["A1", "A2", "A3"],
      ["A4", "padding", "padding"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F2")).toBeTruthy();
  });

  test("undefined values are replaced by zeroes", () => {
    const grid = { A1: "A1", B1: undefined, C1: undefined, D1: "D1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "E1", "=WRAPROWS(A1:D1, 2)");
    expect(getRangeValuesAsMatrix(model, "E1:F2")).toEqual([
      ["A1", 0],
      [0, "D1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "E1:F2")).toBeTruthy();
  });

  test("WRAPROWS accepts errors in first argument", () => {
    const grid = { A1: "=KABOUM", B1: "42", C1: "=1/0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=WRAPROWS(A1:C1, 2)");
    expect(getRangeValuesAsMatrix(model, "A2:B3")).toEqual([
      ["#BAD_EXPR", 42],
      ["#DIV/0!", 0],
    ]);
  });
});
