import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellContent, getCellError } from "../test_helpers/getters_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  createModel,
  createModelFromGrid,
  evaluateCell,
  getRangeFormatsAsMatrix,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";
describe("FILTER function", () => {
  test("FILTER takes at least 2 arguments", async () => {
    expect(await evaluateCell("A1", { A1: "=FILTER()" })).toBe("#BAD_EXPR");
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2)" })).toBe("#BAD_EXPR");
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2)" })).toBe("#N/A");
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2, D1:D2)" })).toBe("#N/A");
  });
  test("conditions should be single cols or rows", async () => {
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:C2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });
  test("conditions should have the same dimensions", async () => {
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D2, D1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, B1:C1, B1:C3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
  });
  test("conditions should have the same dimensions as the filtered range", async () => {
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, D1:D3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
    expect(await evaluateCell("A1", { A1: "=FILTER(B1:C2, B1:D1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A!
  });
  test("FILTER with single values", async () => {
    const grid = { A1: "A1", A2: "TRUE" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1, A2)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
    await setCellContent(model, "D1", '=FILTER("A1", TRUE)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["A1"]]);
  });
  test("Can filter rows", async () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "0", B2: "0", B3: "1" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A3", 1],
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("Can filter columns", async () => {
    const grid = { A1: "A1", A2: "A2", A3: "A3", B1: "0", B2: "0", B3: "1", A6: "1", B6: "0" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1:B3, A6:B6)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A1", null],
      ["A2", null],
      ["A3", null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("Can have multiple conditions", async () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "0", C1: "1",
      A2: "A2", B2: "1", C2: "1",
      A3: "A3", B3: "1", C3: "0",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["A2", 1],
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("undefined values are converted to 0 in range, and are falsy in conditions", async () => {
    const grid = { A1: "A1", A2: "A2", A3: undefined, B1: undefined, B2: "0", B3: "1" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1:B3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      [0, 1],
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("no match: return N/A", async () => {
    const grid = { A1: "A1", B1: "0" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=FILTER(A1, B1)");
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["#N/A"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });
  test("FILTER with literals", async () => {
    const model = await createModel();
    await setCellContent(model, "D1", '=FILTER("hello", TRUE)');
    expect(getRangeValuesAsMatrix(model, "D1")).toEqual([["hello"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1")).toBeTruthy();
  });
  test("FILTER by string ignores the value", async () => {
    // prettier-ignore
    const grid = {
      A1: "Alice", B1: "yes",
      A2: "Bob",   B2: "TRUE",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A6", "=FILTER(A1:A2, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A6:A7")).toEqual([["Bob"], [null]]);
  });
  test("FILTER accepts errors in first argument", async () => {
    // prettier-ignore
    const grid = {
      A1: "=KABOUM", B1: "TRUE",
      A2: "Peter", B2: "FALSE",
      A3: "John", B3: "TRUE",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A6", "=FILTER(A1:A3, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "A6:A7")).toEqual([["#BAD_EXPR"], ["John"]]);
  });
  test("FILTER accepts errors in condition arguments", async () => {
    // prettier-ignore
    const grid = {
      A1: "Alice",  B1: "TRUE",     C1: "TRUE",
      A2: "Peter",  B2: "=KABOUM",  C2: "TRUE",
      A3: "John",   B3: "TRUE",     C3: "=KABOUM",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A6", "=FILTER(A1:A3, B1:B3, C1:C3)");
    expect(getRangeValuesAsMatrix(model, "A6:A8")).toEqual([["Alice"], [null], [null]]);
  });
});
describe("UNIQUE function", () => {
  test("UNIQUE takes 1-3 arguments", async () => {
    expect(await evaluateCell("A1", { A1: "=UNIQUE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(await evaluateCell("A1", { A1: "=UNIQUE(B1:C3)" })).toBe(0);
    expect(await evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false)" })).toBe(0);
    expect(await evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false, false)" })).toBe(0);
    expect(await evaluateCell("A1", { A1: "=UNIQUE(B1:C3, false, false, 0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });
  test("UNIQUE function with single value", async () => {
    const grid = { B1: "hey" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A1", "=UNIQUE(B1)");
    expect(getCellContent(model, "A1")).toBe("hey");
    await setCellContent(model, "A1", '=UNIQUE("ok")');
    expect(getCellContent(model, "A1")).toBe("ok");
  });
  test("UNIQUE function with single col", async () => {
    const grid = { B1: "hey", B2: "hey" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "C1", "=UNIQUE(B1:B2)");
    expect(getRangeValuesAsMatrix(model, "C1:C2")).toEqual([["hey"], [null]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "C1:C2")).toBeTruthy();
  });
  test("UNIQUE function with multidimensional array", async () => {
    // prettier-ignore
    const grid = {
      A1: "hey", B1: "olà",
      A2: "hey", B2: "olà",
      A3: "hey", B3: "bjr",
      A4: "=A1", B4: "=B1",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B4)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", "olà"],
      ["hey", "bjr"],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("UNIQUE: result format depends on range's format", async () => {
    // prettier-ignore
    const grid = {
      A1: "1%", B1: "5",
      A2: "01/10/2020", B2: "01/01",
      A3: "01/10/2020", B3: "01/01",
      A4: "5", B4: "1%"
     };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B4)");
    expect(getRangeFormatsAsMatrix(model, "D1:E3")).toEqual([
      ["0%", ""],
      ["mm/dd/yyyy", "mm/dd"],
      ["", "0%"],
    ]);
  });
  test("UNIQUE function with undefined values", async () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B3: "bjr" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", 0],
      ["hey", "bjr"],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("UNIQUE function with by_column argument to true", async () => {
    const grid = { A1: "hey", A2: "olà", B1: "hey", B2: "olà" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B2, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["hey", null],
      ["olà", null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });
  test("UNIQUE function with only_once argument to true", async () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "bjr" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B3, false, true)");
    expect(getRangeValuesAsMatrix(model, "D1:E3")).toEqual([
      ["hey", "bjr"],
      [null, null],
      [null, null],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E3")).toBeTruthy();
  });
  test("UNIQUE function with no unique rows and only_once argument", async () => {
    const grid = { A1: "hey", A2: "hey", A3: "hey", B1: "olà", B2: "olà", B3: "olà" };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "D1", "=UNIQUE(A1:B3, 0 ,1)");
    expect(getCellContent(model, "D1")).toBe("#ERROR");
    expect(getCellError(model, "D1")).toBe("No unique values found");
  });
  test("UNIQUE accepts errors in first argument", async () => {
    const grid = {
      A1: "=KABOUM",
      A2: "Peter",
      A3: "=1/0",
      A4: "=KABOUM_2",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "B1", "=UNIQUE(A1:A4)");
    expect(getRangeValuesAsMatrix(model, "B1:B4")).toEqual([
      ["#BAD_EXPR"],
      ["Peter"],
      ["#DIV/0!"],
      [null],
    ]);
  });
});
describe("SORT function", () => {
  test("SORT error messages", async () => {
    const grid = {
      A1: "=SORT()",
      A2: "=SORT(B1:B5, ,FALSE)",
      A3: "=SORT(B1:B5, C1:C5, )",
    };
    const model = await createModelFromGrid(grid);
    expect(getCellError(model, "A1")).toBe(
      "Invalid number of arguments for the SORT function. Expected 1 minimum, but got 0 instead."
    );
    expect(getCellError(model, "A2")).toBe("Value for parameter sort_column is missing in SORT.");
    expect(getCellError(model, "A3")).toBe("Value for parameter is_ascending is missing in SORT.");
  });
  test("Sorting a single column of numbers", async () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",
       A3: "3",
       A4: "1",
       A5: "4",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:A5)");
    expect(getRangeValuesAsMatrix(model, "A11:A15")).toEqual([[1], [1], [2], [3], [4]]);
  });
  test("Full sorting with multiple columns", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C9)");
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
  test("Empty cell going last no matter the ascending/descending order", async () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",
       A4: "4",
       A6: "3",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "B1", "=SORT(A1:A6, 1, TRUE)");
    expect(getRangeValuesAsMatrix(model, "B5:B6")).toEqual([[0], [0]]);
    await setCellContent(model, "B1", "=SORT(A1:A6, 1, FALSE)");
    expect(getRangeValuesAsMatrix(model, "B5:B6")).toEqual([[0], [0]]);
  });
  test("Full sorting with multiple columns of string", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:B8)");
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
  test("Full sorting with multiple columns of different data types", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:B8)");
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
  test("Sorting a column of mixed data types", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:A9)");
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
  test("Sorting a single column of string", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:A9)");
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
  test("Ascending Sorting multiple columns specifying column number", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C9,1,TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C9,2,TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C9,3,TRUE)");
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
  test("Descending Sorting multiple columns specifying column number", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C9,1,FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,2,FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,3,FALSE)");
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
  test("Sorting multiple columns specifying multiple column numbers", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C10, 1, TRUE, 2, FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10, 1, FALSE, 2, TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10, 1, FALSE, 2, TRUE, 3, TRUE)");
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
  test("Ascending Sorting multiple columns specifying range", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C10,A1:A10,TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,B1:B10,TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,C1:C10,TRUE)");
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
  test("Descending Sorting multiple columns specifying range", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C10,A1:A10,FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,B1:B10,FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10,C1:C10,FALSE)");
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
  test("Sorting columns specifying range with strings or errors", async () => {
    const grid = {
      C1: "=10",
      C2: "=0",
      C3: "=EQ(A1,4)", // FALSE
      C4: '=CONCAT("ki","kou")',
      C5: "=BADBUNNY", // #BAD_EXPR
      C6: "=0/0",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(C1:C6,C1:C6,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([
      [0],
      [10],
      ["#BAD_EXPR"],
      ["#DIV/0!"],
      ["kikou"],
      [false],
    ]);
  });
  test("Sorting multiple columns specifying multiple ranges to base to sorting on", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, TRUE, B1:B10, FALSE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, FALSE, B1:B10, TRUE)");
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
    await setCellContent(model, "A11", "=SORT(A1:C10, A1:A10, FALSE, B1:B10, TRUE, C1:C10, TRUE)");
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
  test.each(["-1", "0", "4"])("Sorting with invalid column index (%s)", async (index) => {
    //prettier-ignore
    const grid = {
       A1: "1",  B1: "1",  C1: "1",
       A2: "2",  B2: "1",  C2: "2",
       A3: "3",  B3: "2",  C3: "1",
       A4: "1",  B4: "3",  C4: "3",
       A5: "2",  B5: "3",  C5: "1",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", `=SORT(A1:C5, 5, ${index})`);
    expect(getRangeValuesAsMatrix(model, "A11:C15")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [3, 2, 1],
      [1, 3, 3],
      [2, 3, 1],
    ]);
  });
  test("Sorting with missing 'order' argument", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "=SORT(A1:A2, 1)");
    expect(getRangeValuesAsMatrix(model, "B1")).toEqual([["#BAD_EXPR"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "B1")).toBeTruthy();
  });
});
describe("SORTN function", () => {
  test("SORTN error messages", async () => {
    const grid = {
      A1: "=SORTN()",
      A2: "=SORTN(B1:B5, 5, 0, ,FALSE)",
      A3: "=SORTN(B1:B5, 5, 0, C1:C5, )",
    };
    const model = await createModelFromGrid(grid);
    expect(getCellError(model, "A1")).toBe(
      "Invalid number of arguments for the SORTN function. Expected 2 minimum, but got 0 instead."
    );
    expect(getCellError(model, "A2")).toBe("Value for parameter sort_column is missing in SORTN.");
    expect(getCellError(model, "A3")).toBe("Value for parameter is_ascending is missing in SORTN.");
  });
  test("Sorting a single column of numbers", async () => {
    //prettier-ignore
    const grid = {
       A1: "1",
       A2: "2",
       A3: "3",
       A4: "1",
       A5: "2",
       A6: "2",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:A6, 5, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([[1], [1], [2], [2], [2], [null]]);
  });
  test("Full sorting with multiple columns", async () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "1", B3: "3", C3: "3",
      A4: "2", B4: "3", C4: "1",
      A5: "2", B5: "1", C5: "1",
      A6: "2", B6: "1", C6: "1",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 2],
      [null, null, null],
    ]);
  });
  test("Accept at least two arguments", async () => {
    // @compatibility: Google Sheets requires at least one argument only.
    // Here, depending on the implementation, they couldn't have more (or equal) optional arguments than repeatable arguments.
    const grid = {
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "1",
      A5: "2",
      A6: "2",
    };
    expect(await evaluateCell("A7", { A7: "=SORTN(A1:A6)", ...grid })).toBe("#BAD_EXPR");
  });
  test("Full sorting with different display ties modes", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C10, 3, 1)");
    expect(getRangeValuesAsMatrix(model, "A11:C15")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 1],
      [null, null, null],
    ]);
    await setCellContent(model, "A11", "=SORTN(A1:C10, 5, 2)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [1, 3, 3],
      [2, 1, 1],
      [2, 1, 2],
      [2, 3, 1],
      [null, null, null],
    ]);
    await setCellContent(model, "A11", "=SORTN(A1:C10, 5, 3)");
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
  test("When 4 values supplied, the 3th value and 4th value correspond to the 4th and 5th arguments", async () => {
    // see 'argTargeting' to understand how the arguments are targeted
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C10, 5, 2, true)");
    expect(getRangeValuesAsMatrix(model, "A11:C15")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
    ]);
  });
  test("Sorting with bad n argument", async () => {
    const model = await createModel();
    await setCellContent(model, "A11", "=SORTN(A1:C10, -1, 0)");
    expect(getCellContent(model, "A11")).toEqual("#ERROR");
    expect(getCellError(model, "A11")).toBe(
      "Wrong value of 'n'. Expected a positive number. Got -1."
    );
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A11")).toBeTruthy();
  });
  test("Sorting with a too big n value returns full sorted range", async () => {
    //prettier-ignore
    const grid = {
       A1: "2",
       A2: "3",
       A3: "1",
       A4: "2",
       A5: "4",
       A6: "3",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:A6, 30, 0)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([[1], [2], [2], [3], [3], [4]]);
  });
  test.each(["-1", "4"])("Sorting with bad display ties mode argument", async (mode) => {
    const model = await createModel();
    await setCellContent(model, "A11", `=SORTN(A1:C10, 1, ${mode})`);
    expect(getCellContent(model, "A11")).toEqual("#ERROR");
    expect(getCellError(model, "A11")).toBe(
      `Wrong value of 'display_ties_mode'. Expected a positive number between 0 and 3. Got ${mode}.`
    );
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A11")).toBeTruthy();
  });
  test("Ascending Sorting multiple columns specifying column number", async () => {
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
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C10,10,0,2,TRUE)");
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
  test("Descending Sorting multiple columns specifying column number", async () => {
    //prettier-ignore
    const grid = {
      A1: "1",  B1: "1",  C1: "1",
      A2: "2",  B2: "1",  C2: "2",
      A3: "3",  B3: "2",  C3: "1",
      A4: "1",  B4: "3",  C4: "3",
      A5: "3",  B5: "4",  C5: "4",
      A6: "4",  B6: "1",  C6: "2",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6,5,0,3,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [3, 4, 4],
      [1, 3, 3],
      [2, 1, 2],
      [4, 1, 2],
      [1, 1, 1],
      [null, null, null],
    ]);
  });
  test("Sorting multiple columns specifying multiple column numbers", async () => {
    //prettier-ignore
    const grid = {
      A1: "2",  B1: "1",  C1: "2",
      A2: "3",  B2: "2",  C2: "1",
      A3: "4",  B3: "2",  C3: "1",
      A4: "3",  B4: "4",  C4: "4",
      A5: "2",  B5: "1",  C5: "1",
      A6: "4",  B6: "1",  C6: "2",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0, 1, FALSE, 2, TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [4, 1, 2],
      [4, 2, 1],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [null, null, null],
    ]);
  });
  test("Ascending Sorting multiple columns specifying range", async () => {
    //prettier-ignore
    const grid = {
      A1: "1", B1: "1", C1: "1",
      A2: "2", B2: "1", C2: "2",
      A3: "3", B3: "2", C3: "1",
      A4: "2", B4: "1", C4: "1",
      A5: "4", B5: "1", C5: "2",
      A6: "2", B6: "1", C6: "1",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6,5,0,B1:B6,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 1, 1],
      [4, 1, 2],
      [2, 1, 1],
      [null, null, null],
    ]);
  });
  test("Descending Sorting multiple columns specifying range", async () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "1", C1: "2",
      A2: "3", B2: "2", C2: "1",
      A3: "2", B3: "3", C3: "1",
      A4: "4", B4: "2", C4: "1",
      A5: "3", B5: "4", C5: "4",
      A6: "4", B6: "1", C6: "2",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6,5,0,A1:A6,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A11:C16")).toEqual([
      [4, 2, 1],
      [4, 1, 2],
      [3, 2, 1],
      [3, 4, 4],
      [2, 1, 2],
      [null, null, null],
    ]);
  });
  test("Sorting based on strings or errors", async () => {
    const grid = {
      C1: "=10",
      C2: "=0",
      C3: "=EQ(A1, 4)", // FALSE
      C4: '=CONCAT("ki","kou")',
      C5: "=BADBUNNY", // #BAD_EXPR
      C6: "=0/0",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(C1:C6,6,0,C1:C6,TRUE)");
    expect(getRangeValuesAsMatrix(model, "A11:A16")).toEqual([
      [0],
      [10],
      ["#BAD_EXPR"],
      ["#DIV/0!"],
      ["kikou"],
      [false],
    ]);
  });
  test("Sorting multiple columns specifying multiple ranges to base to sorting on", async () => {
    //prettier-ignore
    const grid = {
      A1: "2", B1: "1", C1: "2",
      A2: "3", B2: "2", C2: "1",
      A3: "4", B3: "2", C3: "1",
      A4: "3", B4: "4", C4: "4",
      A5: "4", B5: "1", C5: "2",
      A6: "2", B6: "1", C6: "1",
    };
    const model = await createModelFromGrid(grid);
    await setCellContent(model, "A11", "=SORTN(A1:C6, 5, 0, A1:A6, FALSE, B1:B6, TRUE)");
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
