import { DEFAULT_BORDER_DESC, DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { lettersToNumber, toCartesian, toXC, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { Border, CommandResult } from "../../src/types";
import { CellErrorType } from "../../src/types/errors";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteCells,
  deleteColumns,
  deleteRows,
  freezeColumns,
  freezeRows,
  insertCells,
  merge,
  redo,
  selectCell,
  setCellContent,
  setSelection,
  setStyle,
  setZoneBorders,
  undo,
  unfreezeColumns,
  unfreezeRows,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getCellText,
  getMerges,
} from "../test_helpers/getters_helpers";
import {
  XCToMergeCellMap,
  getCellsObject,
  getMergeCellMap,
  makeTestFixture,
  testUndoRedo,
} from "../test_helpers/helpers";
let model: Model;
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

function clearColumns(indexes: string[]) {
  const sheetId = model.getters.getActiveSheetId();
  const target = indexes
    .map((index) => lettersToNumber(index))
    .map((index) => {
      return model.getters.getColsZone(sheetId, index, index);
    });
  model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: model.getters.getActiveSheetId(),
  });
}

function clearRows(indexes: number[]) {
  const sheetId = model.getters.getActiveSheetId();
  const target = indexes.map((index) => {
    return model.getters.getRowsZone(sheetId, index, index);
  });
  model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: model.getters.getActiveSheetId(),
  });
}

const fullData = {
  sheets: [
    {
      colNumber: 5,
      rowNumber: 4,
      cells: {
        A1: { content: "1", style: 1, border: 1 },
        A2: { content: "2", style: 1, border: 1 },
        A3: { content: "3", style: 1, border: 1 },
        A4: { content: "4", style: 1, border: 1 },
        B1: { content: "1", style: 1, border: 1 },
        B2: { content: "2", style: 1 },
        B3: { content: "3", border: 1 },
        C1: { content: "1" },
        C3: { content: "3" },
      },
      merges: ["A4:D4", "C1:D2"],
      cols: { 1: { size: 42 } },
      rows: { 1: { size: 42 } },
    },
  ],
  styles: { 1: { textColor: "#fe0000" } },
  borders: { 1: { top: { style: "thin", color: "#000" } } },
};

//------------------------------------------------------------------------------
// Clear
//------------------------------------------------------------------------------

describe("Clear columns", () => {
  test("Can clear multiple column", () => {
    const border = { right: { style: "thin", color: "#000" } };
    model = new Model({
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "A1" },
            A2: { content: "A2" },
            A3: { content: "A3" },
            B1: { content: "B1", style: 1, border: 1 },
            B2: { content: "B2" },
            C1: { content: "C1", style: 1 },
            C2: { content: "C2", border: 1 },
          },
        },
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: border },
      merges: ["A3:B3"],
    });
    clearColumns(["B", "C"]);
    const style = { textColor: "#fe0000" };
    expect(getCell(model, "B2")).toBeUndefined();
    expect(
      Object.keys(model.getters.getEvaluatedCells(model.getters.getActiveSheetId()))
    ).toHaveLength(5);
    expect(getCell(model, "A1")).toMatchObject({ content: "A1" });
    expect(getCell(model, "A2")).toMatchObject({ content: "A2" });
    expect(getCell(model, "A3")).toMatchObject({ content: "A3" });
    expect(getCell(model, "B1")).toMatchObject({ style });
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getCell(model, "C1")).toMatchObject({ style });
    expect(getBorder(model, "C2")).toEqual(border);
  });
  test("cannot delete column in invalid sheet", () => {
    model = new Model();
    expect(deleteColumns(model, ["A"], "INVALID")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });
});

describe("Clear rows", () => {
  test("Can clear multiple rows", () => {
    const border = { right: { style: "thin", color: "#000" } };
    model = new Model({
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "A1" },
            A2: { content: "A2", style: 1, border: 1 },
            A3: { content: "A3", border: 1 },
            B1: { content: "B1" },
            B2: { content: "B2" },
            C1: { content: "C1" },
            C2: { content: "C2", style: 1 },
          },
        },
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: border },
      merges: ["C1:C2"],
    });

    clearRows([1, 2]);
    const style = { textColor: "#fe0000" };
    expect(getCell(model, "B2")).toBeUndefined();
    expect(
      Object.keys(model.getters.getEvaluatedCells(model.getters.getActiveSheetId()))
    ).toHaveLength(5);
    expect(getCell(model, "A1")).toMatchObject({ content: "A1" });
    expect(getCell(model, "A2")).toMatchObject({ style });
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toEqual(border);
    expect(getCell(model, "B1")).toMatchObject({ content: "B1" });
    expect(getCell(model, "C1")).toMatchObject({ content: "C1" });
    expect(getCell(model, "C2")).toMatchObject({ style });
  });
  test("cannot delete row in invalid sheet", () => {
    model = new Model();
    expect(deleteRows(model, [0], "INVALID")).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });
});

//------------------------------------------------------------------------------
// Columns
//------------------------------------------------------------------------------

describe("Columns", () => {
  beforeAll(() => {
    makeTestFixture();
  });
  describe("Correctly update size, name, order and number", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [{ colNumber: 4, rowNumber: 1, cols: { 1: { size: 10 }, 2: { size: 20 } } }],
      });
    });
    test("On deletion", () => {
      deleteColumns(model, ["A", "C"]);
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getColSize(sheetId, 0)).toBe(10);
      expect(model.getters.getColSize(sheetId, 1)).toBe(DEFAULT_CELL_WIDTH);
      expect(model.getters.getActiveSheet().numberOfCols).toBe(2);
    });
    test("On delete cols in inactive sheet", () => {
      model = new Model({
        sheets: [
          { id: "s1", colNumber: 3, rowNumber: 3, cells: { B2: { content: "B2 in sheet1" } } },
          { id: "s2", colNumber: 3, rowNumber: 3, cells: { B2: { content: "B2 in sheet2" } } },
        ],
      });
      const [sheet1Id, sheet2Id] = model.getters.getSheetIds();
      expect(sheet2Id).not.toBe(model.getters.getActiveSheetId());
      deleteColumns(model, ["A"], sheet2Id);
      expect(getCellContent(model, "B2", sheet1Id)).toBe("B2 in sheet1");
      expect(getCellContent(model, "A2", sheet2Id)).toBe("B2 in sheet2");
    });
    test("On addition before first", () => {
      addColumns(model, "before", "A", 1);
      expect(model.getters.getActiveSheet().numberOfCols).toBe(5);
      expect(model.getters.getActiveSheet().rows).toHaveLength(1);
    });
    test("On addition before", () => {
      addColumns(model, "before", "B", 2);
      const size = DEFAULT_CELL_WIDTH;
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getColSize(sheetId, 0)).toBe(size);
      expect(model.getters.getColSize(sheetId, 1)).toBe(10);
      expect(model.getters.getColSize(sheetId, 2)).toBe(10);
      expect(model.getters.getColSize(sheetId, 3)).toBe(10);
      expect(model.getters.getColSize(sheetId, 4)).toBe(20);
      expect(model.getters.getColSize(sheetId, 5)).toBe(size);
      expect(model.getters.getActiveSheet().numberOfCols).toBe(6);
    });
    test("On addition after", () => {
      addColumns(model, "after", "C", 2);
      const size = DEFAULT_CELL_WIDTH;
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getColSize(sheetId, 0)).toBe(size);
      expect(model.getters.getColSize(sheetId, 1)).toBe(10);
      expect(model.getters.getColSize(sheetId, 2)).toBe(20);
      expect(model.getters.getColSize(sheetId, 3)).toBe(20);
      expect(model.getters.getColSize(sheetId, 4)).toBe(20);
      expect(model.getters.getColSize(sheetId, 5)).toBe(size);

      expect(model.getters.getActiveSheet().numberOfCols).toBe(6);
    });

    test("On addition in invalid sheet", () => {
      const sheetId = "invalid";
      expect(addColumns(model, "after", "A", 1, sheetId)).toBeCancelledBecause(
        CommandResult.InvalidSheetId
      );
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [{ colNumber: 5, rowNumber: 4, merges: ["A1:E1", "B2:E2", "C3:E3", "B4:D4"] }],
      });
    });

    test("On deletion", () => {
      deleteColumns(model, ["B", "D"]);
      expect(getMerges(model)).toEqual({
        1: { id: 1, topLeft: toCartesian("A1"), top: 0, bottom: 0, left: 0, right: 2 },
        2: { id: 2, topLeft: toCartesian("B2"), top: 1, bottom: 1, left: 1, right: 2 },
        3: { id: 3, topLeft: toCartesian("B3"), top: 2, bottom: 2, left: 1, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, ["A1", "B1", "C1", "B2", "C2", "B3", "C3"])
      );
    });

    test("On addition", () => {
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "A", 1);
      expect(getMerges(model)).toEqual({
        1: { id: 1, topLeft: toCartesian("A1"), top: 0, bottom: 0, left: 0, right: 6 },
        2: { id: 2, topLeft: toCartesian("D2"), top: 1, bottom: 1, left: 3, right: 6 },
        3: { id: 3, topLeft: toCartesian("E3"), top: 2, bottom: 2, left: 4, right: 6 },
        4: { id: 4, topLeft: toCartesian("D4"), top: 3, bottom: 3, left: 3, right: 5 },
      });
      // prettier-ignore
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, [
          "A1", "B1", "C1", "D1", "E1", "F1", "G1",
                            "D2", "E2", "F2", "G2",
                                  "E3", "F3", "G3",
                            "D4", "E4", "F4",
        ])
      );
    });
  });

  describe("Correctly update borders", () => {
    test("Add columns with simple border", () => {
      const s = { style: "thin", color: "#000" };
      model = new Model({
        sheets: [
          {
            cells: {
              A2: { border: 1 },
            },
          },
        ],
        borders: { 1: { top: s } },
      });
      expect(getBorder(model, "A1")).toEqual({ bottom: s });
      expect(getBorder(model, "A2")).toEqual({ top: s });
      addColumns(model, "before", "A", 1);
      expect(getBorder(model, "A1")).toBeNull();
      expect(getBorder(model, "A2")).toBeNull();
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toBeNull();
      expect(getBorder(model, "C2")).toBeNull();
      addColumns(model, "after", "B", 1);
      expect(getBorder(model, "A1")).toBeNull();
      expect(getBorder(model, "A2")).toBeNull();
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toBeNull();
      expect(getBorder(model, "C2")).toBeNull();
    });
    test("Add columns with two consecutive borders", () => {
      const s = { style: "thin", color: "#000" };
      model = new Model({
        sheets: [
          {
            cells: {
              A2: { border: 1 },
              B2: { border: 1 },
              A4: { border: 2 },
              B4: { border: 2 },
              C4: { border: 2 },
            },
          },
        ],
        borders: { 1: { top: s }, 2: { left: s } },
      });
      expect(getBorder(model, "A1")).toEqual({ bottom: s });
      expect(getBorder(model, "A2")).toEqual({ top: s });
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s });
      expect(getBorder(model, "A4")).toEqual({ left: s, right: s });
      expect(getBorder(model, "B4")).toEqual({ left: s, right: s });
      expect(getBorder(model, "C4")).toEqual({ left: s });
      addColumns(model, "before", "A", 1);
      expect(getBorder(model, "A1")).toBeNull();
      expect(getBorder(model, "A2")).toBeNull();
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toEqual({ bottom: s });
      expect(getBorder(model, "C2")).toEqual({ top: s });
      expect(getBorder(model, "A4")).toEqual({ right: s });
      expect(getBorder(model, "B4")).toEqual({ left: s, right: s });
      expect(getBorder(model, "C4")).toEqual({ left: s, right: s });
      expect(getBorder(model, "C4")).toEqual({ left: s, right: s });
      addColumns(model, "after", "B", 1);
      expect(getBorder(model, "A1")).toBeNull();
      expect(getBorder(model, "A2")).toBeNull();
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toEqual({ bottom: s });
      expect(getBorder(model, "C2")).toEqual({ top: s });
      expect(getBorder(model, "D1")).toEqual({ bottom: s });
      expect(getBorder(model, "D2")).toEqual({ top: s });
    });

    test("insert column after cell with external border", () => {
      const model = new Model();
      setZoneBorders(model, { position: "external" }, ["B2"]);
      addColumns(model, "after", "B", 1);
      expect(getBorder(model, "B2")).toEqual({
        top: DEFAULT_BORDER_DESC,
        bottom: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
      expect(getBorder(model, "C2")).toEqual({ left: DEFAULT_BORDER_DESC });
    });

    test("insert column before cell with external border", () => {
      const model = new Model();
      setZoneBorders(model, { position: "external" }, ["B2"]);
      addColumns(model, "before", "B", 1);
      expect(getBorder(model, "C2")).toEqual({
        top: DEFAULT_BORDER_DESC,
        bottom: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
      expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    });

    test("delete column after cell with external border", () => {
      const model = new Model();
      setZoneBorders(model, { position: "external" }, ["B2"]);
      deleteColumns(model, ["C"]);
      expect(getBorder(model, "B2")).toEqual({
        top: DEFAULT_BORDER_DESC,
        bottom: DEFAULT_BORDER_DESC,
        left: DEFAULT_BORDER_DESC,
        right: DEFAULT_BORDER_DESC,
      });
    });
  });

  describe("Correctly update border and style", () => {
    let border: Border;
    beforeEach(() => {
      border = { top: { style: "thin", color: "#000000" } };
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 4,
            rowNumber: 4,
            cells: {
              A1: { style: 1 },
              A2: { border: 1 },
              A3: { style: 1, border: 1 },
              B1: { style: 1 },
              B2: { border: 1 },
              B3: { style: 1, border: 1, format: 1 },
              B4: { style: 1, border: 1 },
              D1: { style: 1 },
              D2: { border: 1 },
              D3: { style: 1, border: 1 },
            },
            merges: ["B4:C4"],
          },
        ],
        styles: { 1: { textColor: "#fe0000" } },
        formats: { 1: "0.00%" },
        borders: { 1: border },
      });
    });
    test("On deletion", () => {
      deleteColumns(model, ["B"]);
      const style = { textColor: "#fe0000" };
      const s = { style: "thin", color: "#000000" };
      expect(getCell(model, "B1")).toBeUndefined();
      expect(getCell(model, "B2")).toBeUndefined();
      expect(getCell(model, "B3")).toBeUndefined();
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { style },
        A3: { style },
        B4: { style },
        C1: { style },
        C3: { style },
      });
      expect(getBorder(model, "A2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "A3")).toEqual({ top: s });
      expect(getBorder(model, "B4")).toEqual({ top: s });
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C3")).toEqual({ top: s });
    });
    test("On addition", () => {
      const s = { style: "thin", color: "#000000" };
      const style = { textColor: "#fe0000" };
      expect(getBorder(model, "A1")).toEqual({ bottom: s });
      expect(getBorder(model, "A2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "A3")).toEqual({ top: s });
      expect(getBorder(model, "B1")).toEqual({ bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B4")).toEqual({ top: s });
      expect(getBorder(model, "D1")).toEqual({ bottom: s });
      expect(getBorder(model, "D2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "D3")).toEqual({ top: s });
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "C", 2);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { style },
        A3: { style },
        B1: { style },
        B3: { style, format: "0.00%" },
        B4: { style },
        C1: { style },
        C3: { style, format: "0.00%" },
        C4: { style },
        E1: { style },
      });
      expect(getBorder(model, "A2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "A3")).toEqual({ top: s });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
      expect(getBorder(model, "B4")).toBeNull();
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C3")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C4")).toEqual({ top: s });
      expect(getBorder(model, "D1")).toBeNull();
      expect(getBorder(model, "D2")).toBeNull();
      expect(getBorder(model, "D3")).toEqual({ bottom: s });
      expect(getBorder(model, "D4")).toEqual({ top: s });
      expect(getBorder(model, "E1")).toBeNull();
      expect(getBorder(model, "E2")).toBeNull();
      expect(getBorder(model, "E3")).toEqual({ bottom: s });
      expect(getBorder(model, "E4")).toEqual({ top: s });
      expect(getBorder(model, "F2")).toBeNull();
      expect(getBorder(model, "F3")).toEqual({ bottom: s });
      expect(getBorder(model, "F4")).toEqual({ top: s });
      expect(getBorder(model, "G1")).toEqual({ bottom: s });
      expect(getBorder(model, "G2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "G3")).toEqual({ top: s });
      expect(Object.values(getMerges(model))[0]).toMatchObject({
        left: 2,
        right: 5,
        topLeft: toCartesian("C4"),
      });
    });
  });

  describe("Correctly update references", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 7,
            rowNumber: 7,
            cells: {
              A1: { content: "=B1" },
              A2: { content: "=Sheet1!B1" },
              A3: { content: "=Sheet2!B1" },
              D1: { content: "=A1" },
              D2: { content: "=B1" },
              D3: { content: "=$E1" },
              D4: { content: "=D3" },
              A5: { content: "=SUM(A1:D1)" },
              A6: { content: "=SUM(C1:D1)" },
              A7: { content: "=SUM(B1:B2)" },
            },
          },
          {
            id: "sheet2",
            colNumber: 1,
            rowNumber: 3,
            cells: {
              A1: { content: "=B1" },
              A2: { content: "=Sheet1!B1" },
              A3: { content: "=Sheet2!B1" },
            },
          },
        ],
      });
    });
    test("On deletion", () => {
      deleteColumns(model, ["B", "C"]);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
    });
    test("delete col on inactive sheet", () => {
      const model = new Model({
        sheets: [
          {
            id: "s1",
            colNumber: 4,
            rowNumber: 7,
            cells: { B2: { content: "=Sheet1!B3" }, C1: { content: "=Sheet2!B3" } },
          },
          {
            id: "s2",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              A2: { content: "=B2" },
              B2: { content: "=Sheet1!B2" },
              C2: { content: "=Sheet2!B2" },
            },
          },
        ],
      });
      const [sheet1Id, sheet2Id] = model.getters.getSheetIds();
      expect(sheet2Id).not.toBe(model.getters.getActiveSheetId());
      deleteColumns(model, ["A"], sheet2Id);
      expect(getCellsObject(model, sheet1Id)).toMatchObject({
        B2: { content: "=Sheet1!B3" },
        C1: { content: "=Sheet2!A3" },
      });
      expect(getCellsObject(model, sheet2Id)).toMatchObject({
        A2: { content: "=Sheet1!B2" },
        B2: { content: "=Sheet2!A2" },
      });
    });
    test("On first col deletion", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 3, cells: { B2: { content: "=SUM(A1:C1)" } } },
        ],
      });
      deleteColumns(model, ["A"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On multiple col deletion including the first one", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 3, cells: { C2: { content: "=SUM(A1:D1)" } } },
        ],
      });
      deleteColumns(model, ["A", "B"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On last col deletion", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 3, cells: { A2: { content: "=SUM(A1:C1)" } } },
        ],
      });
      deleteColumns(model, ["C"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("delete almost all columns of a range", () => {
      model = new Model({
        sheets: [
          { id: "s1", colNumber: 9, rowNumber: 9, cells: { A1: { content: "=SUM(A2:E5)" } } },
        ],
      });
      deleteColumns(model, ["B", "C", "D", "E"]);
      expect(getCellText(model, "A1", "s1")).toBe("=SUM(A2:A5)");
    });

    test("delete all columns of a range", () => {
      model = new Model({
        sheets: [
          {
            id: "s1",
            colNumber: 9,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(B2:E5)" },
              A2: { content: "=SUM(F1:F2)" }, // single column range
            },
          },
        ],
      });
      deleteColumns(model, ["F"]);
      expect(getCellText(model, "A2")).toBe("=SUM(#REF)");
      deleteColumns(model, ["B", "C", "D", "E"]);
      expect(getCellText(model, "A1", "s1")).toBe(`=SUM(${CellErrorType.InvalidReference})`);
    });
    test("update cross sheet range on column deletion", () => {
      model = new Model({
        sheets: [
          { name: "Sheet1", colNumber: 5, rowNumber: 5 },
          {
            name: "Sheet2",
            id: "42",
            colNumber: 3,
            rowNumber: 9,
            cells: { A1: { content: "=SUM(Sheet1!B1:D3)" } },
          },
        ],
      });
      deleteColumns(model, ["A"]);
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:C3)");
    });
    test("update cross sheet range on column deletion in inactive sheet", () => {
      model = new Model({
        sheets: [
          { name: "Sheet0", colNumber: 1, rowNumber: 1 }, // <-- less column than Sheet1
          { name: "Sheet1", id: "sheet1", colNumber: 5, rowNumber: 5 },
          {
            name: "Sheet2",
            id: "42",
            colNumber: 5,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(Sheet1!B1:D3)" },
            },
          },
        ],
      });
      deleteColumns(model, ["A"], "sheet1");
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:C3)");
    });
    test("On multiple col deletion including the last one", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 4, rowNumber: 4, cells: { A2: { content: "=SUM(A1:D1)" } } },
        ],
      });
      deleteColumns(model, ["C", "D"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On addition", () => {
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "A", 1);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
    });
  });

  describe("Correctly update hidden elements", () => {
    const sheetId = "sheet1";

    beforeEach(() => {
      model = new Model({
        sheets: [{ id: sheetId, colNumber: 5, rowNumber: 1, cols: { 2: { isHidden: true } } }],
      });
    });
    test("On addition before hidden col", () => {
      addColumns(model, "before", "B", 2);
      const hiddenColsGroups = model.getters.getHiddenColsGroups(sheetId);
      expect(hiddenColsGroups).toEqual([[4]]);
    });
    test("On addition after hidden col", () => {
      addColumns(model, "before", "E", 2);
      const hiddenColsGroups = model.getters.getHiddenColsGroups(sheetId);
      expect(hiddenColsGroups).toEqual([[2]]);
    });
    test("On deletion before hidden col", () => {
      deleteColumns(model, ["A"]);
      const hiddenColsGroups = model.getters.getHiddenColsGroups(sheetId);
      expect(hiddenColsGroups).toEqual([[1]]);
    });
    test("On deletion after hidden col", () => {
      deleteColumns(model, ["D"]);
      const hiddenColsGroups = model.getters.getHiddenColsGroups(sheetId);
      expect(hiddenColsGroups).toEqual([[2]]);
    });
  });

  describe("Correctly handle undo/redo", () => {
    test("On deletion", () => {
      model = new Model(fullData);
      const beforeRemove = model.exportData();
      deleteColumns(model, ["A", "C"]);
      const afterRemove = model.exportData();
      undo(model);
      expect(model).toExport(beforeRemove);
      redo(model);
      expect(model).toExport(afterRemove);
    });
    test("On addition", () => {
      model = new Model(fullData);
      const beforeAdd = model.exportData();
      addColumns(model, "before", "B", 4);
      const afterAdd1 = model.exportData();
      addColumns(model, "after", "E", 4);
      const afterAdd2 = model.exportData();
      undo(model);
      expect(model).toExport(afterAdd1);
      redo(model);
      expect(model).toExport(afterAdd2);
      undo(model);
      undo(model);
      expect(model).toExport(beforeAdd);
    });
  });

  describe("Correctly update selection", () => {
    test("On add left 1", () => {
      model = new Model(fullData);
      const zoneXC = "B1:D3";
      setSelection(model, [zoneXC]);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      setSelection(model, ["B1:D3"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:D3"));
      addColumns(model, "before", "B", 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:E3"));
    });
    test("On add left 3", () => {
      model = new Model(fullData);
      setSelection(model, ["B1:D3"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:D3"));
      addColumns(model, "before", "B", 3);
      expect(model.getters.getSelectedZone()).toEqual(toZone("E1:G3"));
    });
    test("On add right 1", () => {
      model = new Model(fullData);
      setSelection(model, ["B1:D3"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:D3"));
      addColumns(model, "after", "B", 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:E3"));
    });
    test("On add right 3", () => {
      model = new Model(fullData);
      setSelection(model, ["B1:D3"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:D3"));
      addColumns(model, "after", "B", 3);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:G3"));
    });
  });
});

//------------------------------------------------------------------------------
// Rows
//------------------------------------------------------------------------------

describe("Rows", () => {
  beforeAll(() => {
    makeTestFixture();
  });
  describe("Correctly update size, name, order and number", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [{ colNumber: 1, rowNumber: 4, rows: { 1: { size: 10 }, 2: { size: 20 } } }],
      });
    });
    test("On deletion", () => {
      deleteRows(model, [0, 2]);
      const size = DEFAULT_CELL_HEIGHT;
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getRowSize(sheetId, 0)).toBe(10);
      expect(model.getters.getRowSize(sheetId, 1)).toBe(size);
      expect(model.getters.getNumberRows(sheetId)).toBe(2);
    });
    test("On delete row in inactive sheet", () => {
      model = new Model({
        sheets: [
          { colNumber: 3, rowNumber: 3, cells: { B2: { content: "B2 in sheet1" } } },
          { colNumber: 3, rowNumber: 3, cells: { B2: { content: "B2 in sheet2" } } },
        ],
      });
      const [sheet1Id, sheet2Id] = model.getters.getSheetIds();
      expect(sheet2Id).not.toBe(model.getters.getActiveSheetId());
      deleteRows(model, [0], sheet2Id);
      expect(getCellContent(model, "B2", sheet1Id)).toBe("B2 in sheet1");
      expect(getCellContent(model, "B1", sheet2Id)).toBe("B2 in sheet2");
    });
    test("On deletion batch", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 4,
            cells: {
              A1: { content: "A1" },
              A2: { content: "A2" },
              A3: { content: "A3" },
              A4: { content: "A4" },
            },
          },
        ],
      });
      deleteRows(model, [0, 2, 3]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { content: "A2" },
      });
    });
    test("delete all rows of a range", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 5,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(A2:A5)" },
              B1: { content: "=SUM(B6:C6)" }, // single line range
            },
          },
        ],
      });
      deleteRows(model, [5]);
      expect(getCellText(model, "B1")).toBe("=SUM(#REF)");
      deleteRows(model, [1, 2, 3, 4]);
      expect(getCellText(model, "A1")).toBe(`=SUM(${CellErrorType.InvalidReference})`);
    });
    test("update cross sheet range on row deletion", () => {
      model = new Model({
        sheets: [
          { name: "Sheet1", colNumber: 5, rowNumber: 5 },
          {
            name: "Sheet2",
            id: "42",
            colNumber: 3,
            rowNumber: 9,
            cells: { A1: { content: "=SUM(Sheet1!A2:A3)" } },
          },
        ],
      });
      deleteRows(model, [0]);
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:A2)");
    });
    test("update cross sheet range on row deletion in inactive sheet", () => {
      model = new Model({
        sheets: [
          { name: "Sheet0", colNumber: 1, rowNumber: 1 }, // <-- less rows than Sheet1
          { name: "Sheet1", id: "sheet1", colNumber: 5, rowNumber: 5 },
          {
            name: "Sheet2",
            id: "42",
            colNumber: 5,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(Sheet1!A2:A3)" },
            },
          },
        ],
      });
      deleteRows(model, [0], "sheet1");
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:A2)");
    });
    test("On addition before first", () => {
      addRows(model, "before", 0, 1);
      expect(model.getters.getActiveSheet().numberOfCols).toBe(1);
      expect(model.getters.getActiveSheet().rows).toHaveLength(5);
    });
    test("On addition before", () => {
      addRows(model, "before", 1, 2);
      const size = DEFAULT_CELL_HEIGHT;
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getRowSize(sheetId, 0)).toBe(size);
      expect(model.getters.getRowSize(sheetId, 1)).toBe(10);
      expect(model.getters.getRowSize(sheetId, 2)).toBe(10);
      expect(model.getters.getRowSize(sheetId, 3)).toBe(10);
      expect(model.getters.getRowSize(sheetId, 4)).toBe(20);
      expect(model.getters.getRowSize(sheetId, 5)).toBe(size);
      expect(model.getters.getNumberRows(sheetId)).toBe(6);
      const dimensions = model.getters.getMainViewportRect();
      expect(dimensions).toMatchObject({ width: 1000, height: 1000 });
      model.dispatch("RESIZE_SHEETVIEW", {
        width: DEFAULT_CELL_WIDTH,
        height: DEFAULT_CELL_HEIGHT,
      });
      const newDimensions = model.getters.getMainViewportRect();
      expect(newDimensions).toMatchObject({
        width: 192, // col size + 1 DEFAULT_CELL_WIDTH for spacing
        height: 170, // sum of row sizes + 1 DEFAULT_CELL_HEIGHT + 5px for spacing + 46px for adding rows footer
      });
    });
    test("On addition after", () => {
      addRows(model, "after", 2, 2);
      const size = DEFAULT_CELL_HEIGHT;
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getRowSize(sheetId, 0)).toBe(size);
      expect(model.getters.getRowSize(sheetId, 1)).toBe(10);
      expect(model.getters.getRowSize(sheetId, 2)).toBe(20);
      expect(model.getters.getRowSize(sheetId, 3)).toBe(20);
      expect(model.getters.getRowSize(sheetId, 4)).toBe(20);
      expect(model.getters.getRowSize(sheetId, 5)).toBe(size);
      const dimensions = model.getters.getMainViewportRect();
      expect(dimensions).toMatchObject({ width: 1000, height: 1000 });
      model.dispatch("RESIZE_SHEETVIEW", {
        width: DEFAULT_CELL_WIDTH,
        height: DEFAULT_CELL_HEIGHT,
      });
      const newDimensions = model.getters.getMainViewportRect();
      expect(newDimensions).toMatchObject({
        width: 192, // col size + 1 DEFAULT_CELL_WIDTH for spacing
        height: 190, // sum of row sizes + 1 DEFAULT_CELL_HEIGHT  and 5px for spacing + 46px for adding rows footer
      });
      expect(model.getters.getNumberRows(sheetId)).toBe(6);
    });
    test("cannot delete column in invalid sheet", () => {
      const sheetId = "invalid";
      expect(addRows(model, "after", 0, 1, sheetId)).toBeCancelledBecause(
        CommandResult.InvalidSheetId
      );
    });

    test("activate Sheet: same size", () => {
      addRows(model, "after", 2, 1);
      model.dispatch("RESIZE_SHEETVIEW", {
        width: DEFAULT_CELL_WIDTH,
        height: DEFAULT_CELL_HEIGHT,
      });
      let dimensions = model.getters.getMainViewportRect();
      expect(dimensions).toMatchObject({
        width: 192, // col size + 1 DEFAULT_CELL_WIDTH for spacing
        height: 170, // sum of row sizes + 1 DEFAULT_CELL_HEIGHT  and 5px for spacing + 46px for adding rows footer
      });
      const to = model.getters.getActiveSheetId();
      createSheet(model, { activate: true, sheetId: "42" });
      activateSheet(model, to);
      dimensions = model.getters.getMainViewportRect();
      expect(dimensions).toMatchObject({
        width: 192, // col size + 1 DEFAULT_CELL_WIDTH for spacing
        height: 170, // sum of row sizes + 1 DEFAULT_CELL_HEIGHT  and 5px for spacing + 46px for adding rows footer
      });
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [{ colNumber: 4, rowNumber: 5, merges: ["A1:A5", "B2:B5", "C3:C5", "D2:D4"] }],
      });
    });
    test("On deletion", () => {
      deleteRows(model, [1, 3]);
      expect(getMerges(model)).toEqual({
        1: { id: 1, topLeft: toCartesian("A1"), top: 0, bottom: 2, left: 0, right: 0 },
        2: { id: 2, topLeft: toCartesian("B2"), top: 1, bottom: 2, left: 1, right: 1 },
        3: { id: 3, topLeft: toCartesian("C2"), top: 1, bottom: 2, left: 2, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, ["A1", "A2", "A3", "B2", "B3", "C2", "C3"])
      );
    });
    test("On addition", () => {
      addRows(model, "before", 1, 1);
      addRows(model, "after", 0, 1);
      expect(getMerges(model)).toEqual({
        1: { id: 1, topLeft: toCartesian("A1"), top: 0, bottom: 6, left: 0, right: 0 },
        2: { id: 2, topLeft: toCartesian("B4"), top: 3, bottom: 6, left: 1, right: 1 },
        3: { id: 3, topLeft: toCartesian("C5"), top: 4, bottom: 6, left: 2, right: 2 },
        4: { id: 4, topLeft: toCartesian("D4"), top: 3, bottom: 5, left: 3, right: 3 },
      });
      // prettier-ignore
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, [
          "A1",
          "A3",
          "A2",
          "A4", "B4",       "D4",
          "A5", "B5", "C5", "D5",
          "A6", "B6", "C6", "D6",
          "A7", "B7", "C7",
        ])
      );
    });
  });

  describe("Correctly update border and style", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 4,
            rowNumber: 4,
            cells: {
              A1: { style: 1 },
              A2: { style: 1 },
              A4: { style: 1 },
              B1: { border: 1 },
              B2: { border: 1 },
              B4: { border: 1 },
              C1: { style: 1, border: 1 },
              C2: { style: 1, border: 1, format: 1 },
              C4: { style: 1, border: 1 },
              D2: { style: 1, border: 1 },
            },
            merges: ["D2:D3"],
          },
        ],
        styles: { 1: { textColor: "#fe0000" } },
        formats: { 1: "0.00%" },
        borders: { 1: { top: { style: "thin", color: "#000000" } } },
      });
    });
    test("On deletion", () => {
      const s = { style: "thin", color: "#000000" };
      const style = { textColor: "#fe0000" };
      const sheetId = model.getters.getActiveSheetId();
      expect(Object.keys(model.getters.getEvaluatedCells(sheetId))).toHaveLength(8); // 7 NumberCells + 1 emptyCell in merge with style
      deleteRows(model, [1]);
      expect(getCell(model, "A2")).toBeUndefined();
      expect(getCell(model, "B2")).toBeUndefined();
      expect(getCell(model, "C2")).toBeUndefined();
      expect(Object.values(model.getters.getEvaluatedCells(sheetId))).toHaveLength(5); // 4 NumberCells +1 emptyCell with no merge, but with style
      expect(getCell(model, "A1")).toMatchObject({ style });
      expect(getCell(model, "A3")).toMatchObject({ style });
      expect(getBorder(model, "B1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
      expect(getCell(model, "C1")).toMatchObject({ style });
      expect(getCell(model, "C3")).toMatchObject({ style });
      expect(getCell(model, "D2")).toMatchObject({ style });
      expect(getBorder(model, "C1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C3")).toEqual({ top: s });
      expect(getBorder(model, "D2")).toEqual({ top: s });
    });

    test("On addition", () => {
      const s = { style: "thin", color: "#000000" };
      addRows(model, "before", 1, 1);
      const style = { textColor: "#fe0000" };
      expect(getBorder(model, "B1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
      expect(getBorder(model, "B4")).toEqual({ bottom: s });
      expect(getBorder(model, "B5")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C3")).toEqual({ top: s });
      expect(getBorder(model, "C4")).toEqual({ bottom: s });
      expect(getBorder(model, "C5")).toEqual({ top: s });
      addRows(model, "after", 2, 2);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { style },
        C1: { style },
        A2: { style },
        C2: { style, format: "0.00%" },
        D2: { style },
        A3: { style },
        C3: { style, format: "0.00%" },
        D3: { style },
        A5: { style },
      });
      expect(getBorder(model, "B1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
      expect(getBorder(model, "B4")).toBeNull();
      expect(getBorder(model, "B5")).toBeNull();
      expect(getBorder(model, "B6")).toEqual({ bottom: s });
      expect(getBorder(model, "B7")).toEqual({ top: s });
      expect(getBorder(model, "C1")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s });
      expect(getBorder(model, "C3")).toEqual({ top: s });
      expect(getBorder(model, "C4")).toBeNull();
      expect(getBorder(model, "C5")).toBeNull();
      expect(getBorder(model, "C6")).toEqual({ bottom: s });
      expect(getBorder(model, "C7")).toEqual({ top: s });
      expect(Object.values(getMerges(model))[0]).toMatchObject({
        top: 2,
        bottom: 5,
        topLeft: toCartesian("D3"),
      });
    });

    test("insert row after cell with external border", () => {
      const model = new Model();
      const s = DEFAULT_BORDER_DESC;
      setZoneBorders(model, { position: "external" }, ["B2"]);
      addRows(model, "after", 1, 1);
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
    });

    test("insert row before cell with external border", () => {
      const model = new Model();
      const s = DEFAULT_BORDER_DESC;
      setZoneBorders(model, { position: "external" }, ["B2"]);
      addRows(model, "before", 1, 1);
      expect(getBorder(model, "B2")).toEqual({ bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s, bottom: s, left: s, right: s });
    });

    test("delete row  after cell with external border", () => {
      const model = new Model();
      const s = DEFAULT_BORDER_DESC;
      setZoneBorders(model, { position: "external" }, ["B2"]);
      deleteRows(model, [2]);
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
    });
  });

  describe("Correctly update references", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 7,
            rowNumber: 7,
            cells: {
              A1: { content: "=A2" },
              A4: { content: "=A1" },
              B1: { content: "=Sheet1!A2" },
              B4: { content: "=B1" },
              C1: { content: "=Sheet2!A2" },
              C4: { content: "=A$5" },
              D4: { content: "=C4" },
              E1: { content: "=SUM(A1:A4)" },
              F1: { content: "=SUM(A3:A4)" },
              G1: { content: "=SUM(B2:C2)" },
            },
          },
          {
            id: "sheet2",
            colNumber: 3,
            rowNumber: 1,
            cells: {
              A1: { content: "=A2" },
              B1: { content: "=Sheet1!A2" },
              C1: { content: "=Sheet2!A2" },
            },
          },
        ],
      });
    });

    test("On deletion", () => {
      deleteRows(model, [1, 2]);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
    });
    test("delete row on inactive sheet", () => {
      const model = new Model({
        sheets: [
          {
            id: "s1",
            colNumber: 4,
            rowNumber: 7,
            cells: { B2: { content: "=Sheet1!A2" }, C1: { content: "=Sheet2!A2" } },
          },
          {
            id: "s2",
            colNumber: 3,
            rowNumber: 2,
            cells: {
              A2: { content: "=B2" },
              B2: { content: "=Sheet1!A2" },
              C2: { content: "=Sheet2!A2" },
            },
          },
        ],
      });
      expect(model.getters.getActiveSheetId()).toBe("s1");
      deleteRows(model, [0], "s2");
      expect(getCellsObject(model, "s1")).toMatchSnapshot();
      expect(getCellsObject(model, "s2")).toMatchSnapshot();
    });
    test("On first row deletion", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 3, cells: { B2: { content: "=SUM(A1:A3)" } } },
        ],
      });
      deleteRows(model, [0]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });

    test("with space in the sheet name", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            name: "Sheet 1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              C2: { content: "=SUM('Sheet 1'!B2)" },
              C3: { content: "=SUM('Sheet 1'!B2:B3)" },
            },
          },
        ],
      });
      deleteRows(model, [0]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        C1: { content: "=SUM('Sheet 1'!B1)" },
        C2: { content: "=SUM('Sheet 1'!B1:B2)" },
      });
      deleteColumns(model, ["A"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { content: "=SUM('Sheet 1'!A1)" },
        B2: { content: "=SUM('Sheet 1'!A1:A2)" },
      });
      addColumns(model, "before", "A", 1);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        C1: { content: "=SUM('Sheet 1'!B1)" },
        C2: { content: "=SUM('Sheet 1'!B1:B2)" },
      });
      addRows(model, "before", 0, 1);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        C2: { content: "=SUM('Sheet 1'!B2)" },
        C3: { content: "=SUM('Sheet 1'!B2:B3)" },
      });
    });

    test("On multiple row deletion including the first one", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 6, cells: { B1: { content: "=SUM(A2:A5)" } } },
        ],
      });
      deleteRows(model, [1, 2]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { content: "=SUM(A2:A3)" },
      });
    });
    test("strange test in Odoo", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 1000,
            cells: { A5: { content: "=SUM(A6:A255)" }, A256: { content: "=SUM(A257:A506)" } },
          },
        ],
      });
      const rows: number[] = [];
      for (let i = 6; i <= 254; i++) {
        rows.push(i);
      }
      for (let i = 257; i <= 605; i++) {
        rows.push(i);
      }

      deleteRows(model, rows);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A5: { content: "=SUM(A6)" },
        A7: { content: "=SUM(A8)" },
      });
    });
    test("On last row deletion", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 3, rowNumber: 3, cells: { B1: { content: "=SUM(A1:A3)" } } },
        ],
      });
      deleteRows(model, [2]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });
    test("On multiple row", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 1, rowNumber: 8, cells: { A1: { content: "=SUM(A2:A5)" } } },
        ],
      });
      deleteRows(model, [2, 3]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { content: "=SUM(A2:A3)" },
      });
    });
    test("On multiple rows (7)", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 1, rowNumber: 8, cells: { A1: { content: "=SUM(A2:A8)" } } },
        ],
      });
      deleteRows(model, [1, 2, 3, 4, 5, 6]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: { content: "=SUM(A2)" },
      });
    });
    test("On multiple row deletion including the last one", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 4, rowNumber: 4, cells: { B1: { content: "=SUM(A1:A4)" } } },
        ],
      });
      deleteRows(model, [2, 3]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });
    test("On multiple row deletion including the last and beyond", () => {
      model = new Model({
        sheets: [
          { id: "sheet1", colNumber: 2, rowNumber: 8, cells: { B2: { content: "=SUM(A1:A4)" } } },
        ],
      });
      deleteRows(model, [3, 4, 5, 6, 7]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B2: { content: "=SUM(A1:A3)" },
      });
    });
    test("On addition", () => {
      addRows(model, "before", 1, 1);
      addRows(model, "after", 0, 1);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
    });
  });

  describe("Correctly update hidden elements", () => {
    const sheetId = "sheet1";

    beforeEach(() => {
      model = new Model({
        sheets: [{ id: sheetId, colNumber: 1, rowNumber: 5, rows: { 2: { isHidden: true } } }],
      });
    });
    test("On addition before hidden row", () => {
      addRows(model, "before", 1, 2);
      const HiddenRowsGroups = model.getters.getHiddenRowsGroups(sheetId);
      expect(HiddenRowsGroups).toEqual([[4]]);
    });
    test("On addition after hidden row", () => {
      addRows(model, "before", 4, 2);
      const HiddenRowsGroups = model.getters.getHiddenRowsGroups(sheetId);
      expect(HiddenRowsGroups).toEqual([[2]]);
    });
    test("On deletion before hidden row", () => {
      deleteRows(model, [0]);
      const HiddenRowsGroups = model.getters.getHiddenRowsGroups(sheetId);
      expect(HiddenRowsGroups).toEqual([[1]]);
    });
    test("On deletion after hidden row", () => {
      deleteRows(model, [3]);
      const HiddenRowsGroups = model.getters.getHiddenRowsGroups(sheetId);
      expect(HiddenRowsGroups).toEqual([[2]]);
    });
  });

  describe("Correctly handle undo/redo", () => {
    test("On deletion", () => {
      model = new Model(fullData);
      const beforeRemove = model.exportData();
      deleteRows(model, [0, 2]);
      const afterRemove = model.exportData();
      undo(model);
      expect(model).toExport(beforeRemove);
      redo(model);
      expect(model).toExport(afterRemove);
    });

    test("On addition", () => {
      model = new Model(fullData);
      const beforeAdd = model.exportData();
      addRows(model, "before", 2, 2);
      const afterAdd1 = model.exportData();
      addRows(model, "after", 4, 4);
      const afterAdd2 = model.exportData();
      undo(model);
      expect(model).toExport(afterAdd1);
      redo(model);
      expect(model).toExport(afterAdd2);
      undo(model);
      undo(model);
      expect(model).toExport(beforeAdd);
    });
  });

  describe("Correctly update selection", () => {
    test("On add top 1", () => {
      model = new Model(fullData);
      setSelection(model, ["C1:D2"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D2"));
      addRows(model, "before", 0, 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C2:D3"));
    });
    test("On add top 3", () => {
      model = new Model(fullData);
      setSelection(model, ["C1:D2"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D2"));
      addRows(model, "before", 0, 3);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C4:D5"));
    });
    test("On add bottom 1", () => {
      model = new Model(fullData);
      setSelection(model, ["C1:D2"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D2"));
      addRows(model, "after", 0, 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D3"));
    });
    test("On add bottom 3", () => {
      model = new Model(fullData);
      setSelection(model, ["C1:D2"]);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D2"));
      addRows(model, "after", 0, 3);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D5"));
    });
  });

  describe("Multi-sheet", () => {
    test("Can add a row in another sheet", () => {
      const model = new Model({
        sheets: [
          { id: "1", colNumber: 3, rowNumber: 3 },
          { id: "2", colNumber: 3, rowNumber: 3 },
        ],
        activeSheet: "1",
      });
      const sheetId = "2";
      addRows(model, "after", 1, 2, sheetId);
      expect(model.getters.getNumberRows("1")).toBe(3);
      expect(model.getters.getNumberRows("2")).toBe(5);
    });
  });
});

describe("Delete cell", () => {
  let model: Model;
  beforeEach(() => {
    model = new Model();
  });

  test("Do not move cell positioned before the deleted ones", () => {
    setCellContent(model, "B2", "B2");
    deleteCells(model, "C3", "left");
    expect(getCellContent(model, "B2", "B2"));
    deleteCells(model, "C3", "up");
    expect(getCellContent(model, "B2", "B2"));
  });

  test("Correctly delete the deleted cells", () => {
    setCellContent(model, "A1", "A1");
    setCellContent(model, "A2", "A2");
    setCellContent(model, "B1", "B1");
    setCellContent(model, "B2", "B2");

    deleteCells(model, "A2:B2", "left");
    expect(getCellContent(model, "A1")).toBe("A1");
    expect(getCellContent(model, "A2")).toBe("");
    expect(getCellContent(model, "B1")).toBe("B1");
    expect(getCellContent(model, "B2")).toBe("");
  });

  test("Correctly move cells on deletion, with shift left", () => {
    setCellContent(model, "C1", "C1");
    setCellContent(model, "D1", "D1");
    setCellContent(model, "E1", "E1");
    deleteCells(model, "C1", "left");
    expect(getCellContent(model, "C1")).toBe("D1");
    expect(getCellContent(model, "D1")).toBe("E1");
    expect(getCellContent(model, "E1")).toBe("");
  });

  test("Correctly move cells on deletion, with shift up", () => {
    setCellContent(model, "A3", "A3");
    setCellContent(model, "A4", "A4");
    setCellContent(model, "A5", "A5");
    deleteCells(model, "A3", "up");
    expect(getCellContent(model, "A3")).toBe("A4");
    expect(getCellContent(model, "A4")).toBe("A5");
    expect(getCellContent(model, "A5")).toBe("");
  });

  test("Correctly update cell content on deletion, with shift left", () => {
    setCellContent(model, "D1", "=D2");
    setCellContent(model, "E1", "=F1");
    deleteCells(model, "C1", "left");
    expect(getCellText(model, "C1")).toBe("=D2");
    expect(getCellText(model, "D1")).toBe("=E1");
    expect(getCellText(model, "E1")).toBe("");
  });

  test("Correctly update cell content on deletion, with shift up", () => {
    setCellContent(model, "A4", "=B4");
    setCellContent(model, "A5", "=A6");
    deleteCells(model, "A3", "up");
    expect(getCellText(model, "A3")).toBe("=B4");
    expect(getCellText(model, "A4")).toBe("=A5");
    expect(getCellText(model, "A5")).toBe("");
  });

  test("Selection is not updated on cells deletion", () => {
    selectCell(model, "B1");
    deleteCells(model, "B1", "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1"));
    deleteCells(model, "B1", "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("Undo/redo is correctly supported", () => {
    setCellContent(model, "A2", "=A3");
    setStyle(model, "A3", { fillColor: "orange" });
    testUndoRedo(model, expect, "DELETE_CELL", { zone: toZone("A1"), dimension: "ROW" });
  });

  test.each(["up", "left"] as const)("can delete the last cell of the grid", (direction) => {
    const sheetId = model.getters.getActiveSheetId();
    const col = model.getters.getNumberCols(sheetId) - 1;
    const row = model.getters.getNumberRows(sheetId) - 1;
    const xc = toXC(col, row);
    model.dispatch("UPDATE_CELL", { sheetId, col, row, content: "test", style: { bold: true } });
    deleteCells(model, xc, direction);
    const cell = getCell(model, xc);
    expect(cell).toBeUndefined();
  });
});

describe("Insert cell", () => {
  let model: Model;
  beforeEach(() => {
    model = new Model();
  });

  test("Do not move cell positioned before the inserted ones", () => {
    setCellContent(model, "B2", "B2");
    insertCells(model, "C3", "right");
    expect(getCellContent(model, "B2", "B2"));
    insertCells(model, "C3", "down");
    expect(getCellContent(model, "B2", "B2"));
  });

  test("Correctly insert the inserted cells", () => {
    setCellContent(model, "A1", "A1");
    setCellContent(model, "B1", "B1");
    setCellContent(model, "A2", "A2");
    setCellContent(model, "B2", "B2");

    insertCells(model, "A2:B2", "right");
    expect(getCellContent(model, "A1")).toBe("A1");
    expect(getCellContent(model, "A2")).toBe("");
    expect(getCellContent(model, "B1")).toBe("B1");
    expect(getCellContent(model, "B2")).toBe("");
    expect(getCellContent(model, "C2")).toBe("A2");
    expect(getCellContent(model, "D2")).toBe("B2");
  });

  test("Correctly move cells on insertion, with shift right", () => {
    setCellContent(model, "C1", "C1");
    setCellContent(model, "D1", "D1");
    setCellContent(model, "E1", "E1");
    insertCells(model, "C1", "right");
    expect(getCellContent(model, "C1")).toBe("");
    expect(getCellContent(model, "D1")).toBe("C1");
    expect(getCellContent(model, "E1")).toBe("D1");
    expect(getCellContent(model, "F1")).toBe("E1");
  });

  test("Correctly move cells on insertion, with shift down", () => {
    setCellContent(model, "A3", "A3");
    setCellContent(model, "A4", "A4");
    setCellContent(model, "A5", "A5");
    insertCells(model, "A3", "down");
    expect(getCellContent(model, "A3")).toBe("");
    expect(getCellContent(model, "A4")).toBe("A3");
    expect(getCellContent(model, "A5")).toBe("A4");
    expect(getCellContent(model, "A6")).toBe("A5");
  });

  test("Correctly update cell content on insertion, with shift right", () => {
    setCellContent(model, "D1", "=D2");
    setCellContent(model, "E1", "=F1");
    insertCells(model, "C1", "right");
    expect(getCellText(model, "E1")).toBe("=D2");
    expect(getCellText(model, "F1")).toBe("=G1");
  });

  test("Correctly update cell content on insertion, with shift down", () => {
    setCellContent(model, "A4", "=B4");
    setCellContent(model, "A5", "=A6");
    insertCells(model, "A3", "down");
    expect(getCellText(model, "A5")).toBe("=B4");
    expect(getCellText(model, "A6")).toBe("=A7");
  });

  test("Selection is not updated on cells insertion", () => {
    selectCell(model, "B1");
    insertCells(model, "B1", "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1"));
    insertCells(model, "B1", "down");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("Undo/redo is correctly supported", () => {
    setCellContent(model, "A2", "=A3");
    setStyle(model, "A3", { fillColor: "orange" });
    testUndoRedo(model, expect, "INSERT_CELL", { zone: toZone("A1"), dimension: "ROW" });
  });
});

describe("Insert/Delete cells with merge", () => {
  test("Insert/Delete cell is rejected if a merge is blocking left-right", () => {
    model = new Model();
    merge(model, "B1:B2");
    expect(deleteCells(model, "A1", "left")).toBeCancelledBecause(
      CommandResult.WillRemoveExistingMerge
    );
    expect(insertCells(model, "A1", "right")).toBeCancelledBecause(
      CommandResult.WillRemoveExistingMerge
    );
  });

  test("Insert/Delete cell is rejected if a merge is blocking up-down", () => {
    model = new Model();
    merge(model, "A2:B2");
    expect(deleteCells(model, "A1", "up")).toBeCancelledBecause(
      CommandResult.WillRemoveExistingMerge
    );
    expect(insertCells(model, "A1", "down")).toBeCancelledBecause(
      CommandResult.WillRemoveExistingMerge
    );
  });
});

describe("Freeze columns", () => {
  test(`Removing columns impacts frozen columns`, () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4);
    deleteColumns(model, ["G"]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });

    deleteColumns(model, ["C", "F"]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 3, ySplit: 0 });

    unfreezeColumns(model);
    deleteColumns(model, ["A"]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
  });

  test(`Adding columns impacts frozen columns`, () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4);
    addColumns(model, "after", "G", 5);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });

    // A col added adjacently to a frozen pane will be injected after it
    addColumns(model, "after", "C", 2);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 6, ySplit: 0 });

    addColumns(model, "after", "B", 2);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 8, ySplit: 0 });

    unfreezeColumns(model);
    addColumns(model, "before", "A", 1);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
  });

  test("Can undo/redo", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });
    freezeColumns(model, 5);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 5, ySplit: 0 });
    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });
    unfreezeColumns(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });
    redo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
  });
});

describe("Freeze rows", () => {
  test(`Removing rows impacts frozen rows`, () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 4);
    deleteRows(model, [6]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });

    deleteRows(model, [2, 5]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 3 });

    unfreezeRows(model);
    deleteRows(model, [0]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
  });

  test(`Adding rows impact frozen rows`, () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 4);
    addRows(model, "after", 6, 5);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });

    // A row added adjacently to a frozen pane will be injected after it
    addRows(model, "after", 2, 1);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 5 });

    addRows(model, "after", 1, 1);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 6 });

    unfreezeRows(model);
    addRows(model, "before", 0, 1);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
  });

  test("Can undo/redo", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 4);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });
    freezeRows(model, 5);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 5 });
    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });
    unfreezeRows(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });
    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    redo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 4 });
  });
});
