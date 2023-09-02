import { Model } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellContent, getCellError } from "../test_helpers/getters_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  createModelFromGrid,
  evaluateCell,
  getRangeFormatsAsMatrix,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("FILTER function", () => {
  test("FILTER takes at least 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=FILTER()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2, D1:D2)" })).toBe("#N/A");
  });

  test("conditions should be single cols or rows", () => {
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:C2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("conditions should have the same dimensions", () => {
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2, D1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, B1:C1, B1:C3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
  });

  test("conditions should have the same dimensions as the filtered range", () => {
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
    expect(evaluateCell("A1", { A1: "=FILTER(B1:C2, B1:D1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
  });

  test("FILTER with single values", () => {
    const grid = { A1: "A1", A2: "TRUE" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1, A2)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);

    setCellContent(model, "D1", '=FILTER("A1", TRUE)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
  });

  test("Can filter rows", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "0", B2: "0", B3: "1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A3", 1],
      ["", ""],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Can filter columns", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "0", B2: "0", B3: "1", A6: "1", B6: "0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, A6:B6)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", ""],
      ["A2", ""],
      ["A3", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Can have multiple conditions", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "0", C1: "1",
      A2: "A2", B2: "1", C2: "1",
      A3: "A3", B3: "1", C3: "0",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A2", 1],
      ["", ""],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("undefined values are converted to 0 in range, and are falsy in conditions", () => {
    const grid = { A1: "A1", A2: "A2", A3: undefined, B1: undefined, B2: "0", B3: "1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      [0, 1],
      ["", ""],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("no match: return N/A", () => {
    const grid = { A1: "A1", B1: "0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1, B1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["#N/A"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });

  test("FILTER with literals", () => {
    const model = new Model();
    setCellContent(model, "D1", '=FILTER("hello", TRUE)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["hello"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });
});

describe("UNIQUE function", () => {
  test("UNIQUE takes 1-3 arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNIQUE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UNIQUE(B1:C3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false, false)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false, false, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("UNIQUE function with single value", () => {
    const grid = { B1: "hey" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A1", "=UNIQUE(B1)");
    expect(getCellContent(model, "A1")).toBe("hey");

    setCellContent(model, "A1", '=UNIQUE("ok")');
    expect(getCellContent(model, "A1")).toBe("ok");
  });

  test("UNIQUE function with single col", () => {
    const grid = { B1: "hey", B2: "hey" };

    const model = createModelFromGrid(grid);
    setCellContent(model, "C1", "=UNIQUE(B1:B2)");
    expect(getRangeValuesAsMatrix(model, "C1:C2")).toEqual([["hey"], [""]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "C1:C2")).toBeTruthy();
  });

  test("UNIQUE function with multidimensional array", () => {
    // prettier-ignore
    const grid = {
      A1: "hey", B1: "olà",
      A2: "hey", B2: "olà",
      A3: "hey", B3: "bjr",
      A4: "=A1", B4: "=B1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B4)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", "olà"],
      ["hey", "bjr"],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("UNIQUE: result format depends on range's format", () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "5",
      A2: "01/10/2020", B2: "01/01",
      A3: "01/10/2020", B3: "01/01",
      A4: "5", B4: "1%"
     };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B4)");
    expect(getRangeFormatsAsMatrix(model, "D1:E3")).toEqual([
      ["0%", ""],
      ["mm/dd/yyyy", "mm/dd"],
      ["", "0%"],
    ]);
  });

  test("UNIQUE function with undefined values", () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B3: "bjr" };

    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", 0],
      ["hey", "bjr"],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("UNIQUE function with by_column argument to true", () => {
    const grid = { A1: "hey", A2: "olà", B1: "hey", B2: "olà" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B2, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["hey", ""],
      ["olà", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("UNIQUE function with only_once argument to true", () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "bjr" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B3, false, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", "bjr"],
      ["", ""],
      ["", ""],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("UNIQUE function with no unique rows and only_once argument", () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "olà" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B3, 0 ,1)");
    expect(getCellContent(model, "D1")).toBe("#ERROR");
    expect(getCellError(model, "D1")?.message).toBe("No unique values found");
  });
});
