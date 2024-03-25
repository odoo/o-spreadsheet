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
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("Can filter columns", () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "0", B2: "0", B3: "1", A6: "1", B6: "0" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, A6:B6)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", null],
      ["A2", null],
      ["A3", null],
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
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("undefined values are converted to 0 in range, and are falsy in conditions", () => {
    const grid = { A1: "A1", A2: "A2", A3: undefined, B1: undefined, B2: "0", B3: "1" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      [0, 1],
      [null, null],
      [null, null],
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

  test("FILTER accepts errors in first argument", () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "TRUE",
      A2: "Peter", B2: "FALSE",
      A3: "John", B3: "TRUE",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A6", "=FILTER(A1:A3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "A6:A7")).toEqual([["#BAD_EXPR"], ["John"]]);
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
    expect(getRangeValuesAsMatrix(model, "C1:C2")).toEqual([["hey"], [null]]);
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
      [null, null],
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
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("UNIQUE function with by_column argument to true", () => {
    const grid = { A1: "hey", A2: "olà", B1: "hey", B2: "olà" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B2, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["hey", null],
      ["olà", null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("UNIQUE function with only_once argument to true", () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "bjr" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B3, false, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", "bjr"],
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });

  test("UNIQUE function with no unique rows and only_once argument", () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "olà" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=UNIQUE(A1:B3, 0 ,1)");
    expect(getCellContent(model, "D1")).toBe("#ERROR");
    expect(getCellError(model, "D1")).toBe("No unique values found");
  });

  test("UNIQUE accepts errors in first argument", () => {
    const grid = {
      A1: "=KABOUM",
      A2: "Peter",
      A3: "=1/0",
      A4: "=KABOUM_2",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "B1", "=UNIQUE(A1:A4)");
    expect(getRangeValuesAsMatrix(model, "B1:B4")).toEqual([
      ["#BAD_EXPR"],
      ["Peter"],
      ["#DIV/0!"],
      [null],
    ]);
  });
});

describe("SORT function", () => {
  test("Sorting a single column of numbers", () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",
       A3: "3",
       A4: "1",
       A5: "4",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:A5)");
    expect(getRangeValuesAsMatrix(model, "A11:A15")).toEqual([[1], [1], [2], [3], [4]]);
  });

  test("Full sorting with multiple columns", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "3", B3: "2", C3: "1",
      A4: "1", B4: "3", C4: "3",
      A5: "2", B5: "3", C5: "1",
      A6: "4", B6: "2", C6: "1",
      A7: "3", B7: "4", C7: "4",
      A8: "4", B8: "1", C8: "2",
      A9: "2", B9: "1", C9: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C9)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [3, 2, 1],
      [3, 4, 4],
      [4, 1, 2],
      [4, 2, 1],
    ]);
  });

  test("Empty cell going last no matter the ascending/descending order", () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",

       A4: "4",

       A6: "3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "B1", "=SORT(A1:A6, 1, TRUE)");
    expect(getRangeValuesAsMatrix(model, "B5:B6")).toEqual([[0], [0]]);
    setCellContent(model, "B1", "=SORT(A1:A6, 1, FALSE)");
    expect(getRangeValuesAsMatrix(model, "B5:B6")).toEqual([[0], [0]]);
  });

  test("Full sorting with multiple columns of string", () => {
    //prettier-ignore
    const grid = {
      A1: "a",    B1: "yihaa",
      A2: "f",    B2: "aaaah",
      A3: "a",    B3: "hey",
      A4: "g",    B4: "coucou",
      A5: "g",    B5: "salut",
      A6: "ok",   B6: "a",
      A7: "ko",   B7: "z",
      A8: "null", B8: "yep"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:B8)");
    expect(getRangeValuesAsMatrix(model, "A11:B18")).toEqual([
      ["a", "hey"],
      ["a", "yihaa"],
      ["f", "aaaah"],
      ["g", "coucou"],
      ["g", "salut"],
      ["ko", "z"],
      ["null", "yep"],
      ["ok", "a"],
    ]);
  });

  test("Full sorting with multiple columns of different data types", () => {
    //prettier-ignore
    const grid = {
      A1: "a",    B1: "1",
      A2: "f",    B2: "1",
      A3: "a",    B3: "2",
      A4: "g",    B4: "24",
      A5: "g",    B5: "5",
      A6: "ok",   B6: "0",
      A7: "ko",   B7: "1",
      A8: "null", B8: "2"
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:B8)");
    expect(getRangeValuesAsMatrix(model, "A11:B18")).toEqual([
      ["a", 1],
      ["a", 2],
      ["f", 1],
      ["g", 5],
      ["g", 24],
      ["ko", 1],
      ["null", 2],
      ["ok", 0],
    ]);
  });

  test("Sorting a column of mixed data types", () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "f",
       A3: "10",
       A4: "=FALSE()",
       A5: "",
       A6: "22",
       A7: "=TRUE()",
       A8: "test",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:A9)");
    expect(getRangeValuesAsMatrix(model, "A11:A19")).toEqual([
      [1],
      [10],
      [22],
      ["f"],
      ["test"],
      [false],
      [true],
      [0],
      [0],
    ]);
  });

  test("Sorting a single column of string", () => {
    //prettier-ignore
    const grid = {
       A1: "a",
       A2: "f",
       A3: "aa",
       A4: "test",
       A5: "e",
       A6: "g",
       A7: "rrrr",
       A8: "ok",
       A9: "ko",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:A9)");
    expect(getRangeValuesAsMatrix(model, "A11:A19")).toEqual([
      ["a"],
      ["aa"],
      ["e"],
      ["f"],
      ["g"],
      ["ko"],
      ["ok"],
      ["rrrr"],
      ["test"],
    ]);
  });

  test("Ascending Sorting multiple columns specifying column number", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "3", B3: "2", C3: "1",
      A4: "1", B4: "3", C4: "3",
      A5: "2", B5: "3", C5: "1",
      A6: "4", B6: "2", C6: "1",
      A7: "3", B7: "4", C7: "4",
      A8: "4", B8: "1", C8: "2",
      A9: "2", B9: "1", C9: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C9,1,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 2],
      [2, 3, 1],
      [2, 1, 1],
      [3, 2, 1],
      [3, 4, 4],
      [4, 2, 1],
      [4, 1, 2],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C9,2,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [4, 1, 2],
      [2, 1, 1],
      [3, 2, 1],
      [4, 2, 1],
      [1, 3, 3],
      [2, 3, 1],
      [3, 4, 4],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C9,3,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [1, 1, 1],
      [3, 2, 1],
      [2, 3, 1],
      [4, 2, 1],
      [2, 1, 1],
      [2, 1, 2],
      [4, 1, 2],
      [1, 3, 3],
      [3, 4, 4],
    ]);
  });

  test("Descending Sorting multiple columns specifying column number", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "3", B3: "2", C3: "1",
      A4: "1", B4: "3", C4: "3",
      A5: "2", B5: "3", C5: "1",
      A6: "4", B6: "2", C6: "1",
      A7: "3", B7: "4", C7: "4",
      A8: "4", B8: "1", C8: "2",
      A9: "2", B9: "1", C9: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C9,1,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [4, 2, 1],
      [4, 1, 2],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [2, 3, 1],
      [2, 1, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,2,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 3, 1],
      [3, 2, 1],
      [4, 2, 1],
      [1, 1, 1],
      [2, 1, 2],
      [4, 1, 2],
      [2, 1, 1],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,3,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C19")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 1, 2],
      [4, 1, 2],
      [1, 1, 1],
      [3, 2, 1],
      [2, 3, 1],
      [4, 2, 1],
      [2, 1, 1],
    ]);
  });

  test("Sorting multiple columns specifying multiple column numbers", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C10, 1, TRUE, 2, FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 3, 3],
      [1, 1, 1],
      [2, 3, 1],
      [2, 1, 2],
      [2, 1, 1],
      [2, 1, 1],
      [3, 4, 4],
      [3, 2, 1],
      [4, 2, 1],
      [4, 1, 2],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10, 1, FALSE, 2, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [2, 1, 1],
      [2, 1, 1],
      [2, 3, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10, 1, FALSE, 2, TRUE, 3, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
  });

  test("Ascending Sorting multiple columns specifying range", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C10,A1:A10,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 2],
      [2, 3, 1],
      [2, 1, 1],
      [2, 1, 1],
      [3, 2, 1],
      [3, 4, 4],
      [4, 2, 1],
      [4, 1, 2],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,B1:B10,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
      [3, 2, 1],
      [4, 2, 1],
      [1, 3, 3],
      [2, 3, 1],
      [3, 4, 4],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,C1:C10,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 1, 1],
      [3, 2, 1],
      [2, 3, 1],
      [4, 2, 1],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [4, 1, 2],
      [1, 3, 3],
      [3, 4, 4],
    ]);
  });

  test("Descending Sorting multiple columns specifying range", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C10,A1:A10,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [4, 2, 1],
      [4, 1, 2],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [2, 3, 1],
      [2, 1, 1],
      [2, 1, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,B1:B10,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 3, 1],
      [3, 2, 1],
      [4, 2, 1],
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10,C1:C10,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 1, 2],
      [4, 1, 2],
      [1, 1, 1],
      [3, 2, 1],
      [2, 3, 1],
      [4, 2, 1],
      [2, 1, 1],
      [2, 1, 1],
    ]);
  });

  test("Sorting multiple columns specifying multiple ranges to base to sorting on", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, TRUE, B1:B10, FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 3, 3],
      [1, 1, 1],
      [2, 3, 1],
      [2, 1, 2],
      [2, 1, 1],
      [2, 1, 1],
      [3, 4, 4],
      [3, 2, 1],
      [4, 2, 1],
      [4, 1, 2],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, FALSE, B1:B10, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [2, 1, 1],
      [2, 1, 1],
      [2, 3, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
    setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, FALSE, B1:B10, TRUE, C1:C10, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [1, 1, 1],
      [1, 3, 3],
    ]);
  });

  test.each(["-1", "0", "4"])("Sorting with invalid column index (%s)", (index) => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", `=SORT(A1:C5, 5, ${index})`);
    expect(getRangeValuesAsMatrix(model, "A11:C15")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [3, 2, 1],
      [1, 3, 3],
      [2, 3, 1],
    ]);
  });

  test("Sorting with missing 'order' argument", () => {
    const model = new Model();
    setCellContent(model, "B1", "=SORT(A1:A2, 1)");
    expect(getRangeValuesAsMatrix(model, "B1")).toEqual([["#BAD_EXPR"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "B1")).toBeTruthy();
  });
});

describe("SORTN function", () => {
  test("Sorting a single column of numbers", () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",
       A3: "3",
       A4: "1",
       A5: "2",
       A6: "2",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:A6, 5, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([[1], [1], [2], [2], [2], [null]]);
  });

  test("Full sorting with multiple columns", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "1", B3: "3", C3: "3",
      A4: "2", B4: "3", C4: "1",
      A5: "2", B5: "1", C5: "1",
      A6: "2", B6: "1", C6: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [null, null, null],
    ]);
  });

  test("Full sorting with multiple columns using default parameters", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C10)");
    expect(getRangeValuesAsMatrix(model, "A11:C12")).toEqual([
      [1, 1, 1],
      [null, null, null],
    ]);
  });

  test("Full sorting with different display ties modes", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "2",  B6: "3",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C10, 3, 1)");
    expect(getRangeValuesAsMatrix(model, "A11:C15")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 1],
      [null, null, null],
    ]);
    setCellContent(model, "A11", "=SORTN(A1:C10, 5, 2)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [null, null, null],
    ]);
    setCellContent(model, "A11", "=SORTN(A1:C10, 5, 3)");
    expect(getRangeValuesAsMatrix(model, "A11:C18")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [2, 3, 1],
      [null, null, null],
    ]);
  });

  test("Sorting with bad n argument", () => {
    const model = new Model();
    setCellContent(model, "A11", "=SORTN(A1:C10, -1, 0)");
    expect(getCellContent(model, "A11")).toEqual("#ERROR");
    expect(getCellError(model, "A11")).toBe(
      "Wrong value of 'n'. Expected a positive number. Got -1."
    );
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A11")).toBeTruthy();
  });

  test("Sorting with a too big n value returns full sorted range", () => {
    //prettier-ignore
    const grid = {
       A1: "2",
       A2: "3",
       A3: "1",
       A4: "2",
       A5: "4",
       A6: "3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:A6, 30, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([[1], [2], [2], [3], [3], [4]]);
  });

  test.each(["-1", "4"])("Sorting with bad display ties mode argument", (mode) => {
    const model = new Model();
    setCellContent(model, "A11", `=SORTN(A1:C10, 1, ${mode})`);
    expect(getCellContent(model, "A11")).toEqual("#ERROR");
    expect(getCellError(model, "A11")).toBe(
      `Wrong value of 'display_ties_mode'. Expected a positive number between 0 and 3. Got ${mode}.`
    );
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A11")).toBeTruthy();
  });

  test("Ascending Sorting multiple columns specifying column number", () => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
       A6: "4",  B6: "2",  C6: "1",
       A7: "3",  B7: "4",  C7: "4",
       A8: "2",  B8: "1",  C8: "1",
       A9: "4",  B9: "1",  C9: "2",
      A10: "2", B10: "1", C10: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C10,10,0,2,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C20")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
      [3, 2, 1],
      [4, 2, 1],
      [1, 3, 3],
      [2, 3, 1],
      [3, 4, 4],
    ]);
  });

  test("Descending Sorting multiple columns specifying column number", () => {
    //prettier-ignore
    const grid = {
      A1: "1",  B1: "1",  C1: "1",
      A2: "2",  B2: "1",  C2: "2",
      A3: "3",  B3: "2",  C3: "1",
      A4: "1",  B4: "3",  C4: "3",
      A5: "3",  B5: "4",  C5: "4",
      A6: "4",  B6: "1",  C6: "2",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6,5,0,3,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 1, 2],
      [4, 1, 2],
      [1, 1, 1],
      [null, null, null],
    ]);
  });

  test("Sorting multiple columns specifying multiple column numbers", () => {
    //prettier-ignore
    const grid = {
      A1: "2",  B1: "1",  C1: "2",
      A2: "3",  B2: "2",  C2: "1",
      A3: "4",  B3: "2",  C3: "1",
      A4: "3",  B4: "4",  C4: "4",
      A5: "2",  B5: "1",  C5: "1",
      A6: "4",  B6: "1",  C6: "2",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0, 1, FALSE, 2, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [null, null, null],
    ]);
  });

  test("Ascending Sorting multiple columns specifying range", () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "3", B3: "2", C3: "1",
      A4: "2", B4: "1", C4: "1",
      A5: "4", B5: "1", C5: "2",
      A6: "2", B6: "1", C6: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6,5,0,B1:B6,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
      [null, null, null],
    ]);
  });

  test("Descending Sorting multiple columns specifying range", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "1", C1: "2",
      A2: "3", B2: "2", C2: "1",
      A3: "2", B3: "3", C3: "1",
      A4: "4", B4: "2", C4: "1",
      A5: "3", B5: "4", C5: "4",
      A6: "4", B6: "1", C6: "2",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6,5,0,A1:A6,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [4, 2, 1],
      [4, 1, 2],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [null, null, null],
    ]);
  });

  test("Sorting multiple columns specifying multiple ranges to base to sorting on", () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "1", C1: "2",
      A2: "3", B2: "2", C2: "1",
      A3: "4", B3: "2", C3: "1",
      A4: "3", B4: "4", C4: "4",
      A5: "4", B5: "1", C5: "2",
      A6: "2", B6: "1", C6: "1",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0, A1:A6, FALSE, B1:B6, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [null, null, null],
    ]);
  });
});
