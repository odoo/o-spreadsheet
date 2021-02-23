import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  INCORRECT_RANGE_STRING,
} from "../../src/constants";
import { lettersToNumber, toXC, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { Border, CancelledReason, CellType, UID } from "../../src/types";
import {
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  redo,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent, getCellText, getMerges } from "../test_helpers/getters_helpers";
import {
  getMergeCellMap,
  makeTestFixture,
  mockUuidV4To,
  toPosition,
  XCToMergeCellMap,
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

function getCellsObject(model: Model, sheetId: UID) {
  const cells = {};
  for (let cell of Object.values(model.getters.getCells(sheetId))) {
    const { col, row } = model.getters.getCellPosition(cell.id);
    cell = model.getters.getCell(sheetId, col, row)!;
    cells[toXC(col, row)] = cell;
  }
  return cells;
}

const fullData = {
  sheets: [
    {
      colNumber: 4,
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
  borders: { 1: { top: ["thin", "#000"] } },
};

//------------------------------------------------------------------------------
// Clear
//------------------------------------------------------------------------------

beforeEach(() => {
  mockUuidV4To(1);
});

describe("Clear columns", () => {
  test("Can clear multiple column", () => {
    const border = { right: ["thin", "#000"] };
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
    expect(Object.keys(model.getters.getCells(model.getters.getActiveSheetId()))).toHaveLength(5);
    expect(getCell(model, "A1")).toMatchObject({ content: "A1" });
    expect(getCell(model, "A2")).toMatchObject({ content: "A2" });
    expect(getCell(model, "A3")).toMatchObject({ content: "A3" });
    expect(getCell(model, "B1")).toMatchObject({ style });
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getCell(model, "C1")).toMatchObject({ style });
    expect(getBorder(model, "C2")).toEqual(border);
  });
  test("cannot delete column in invalid sheet", () => {
    expect(
      model.dispatch("REMOVE_COLUMNS", {
        columns: [0],
        sheetId: "INVALID",
      })
    ).toBeCancelled(CancelledReason.InvalidSheetId);
  });
});

describe("Clear rows", () => {
  test("Can clear multiple rows", () => {
    const border = { right: ["thin", "#000"] };
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
    expect(Object.keys(model.getters.getCells(model.getters.getActiveSheetId()))).toHaveLength(5);
    expect(getCell(model, "A1")).toMatchObject({ content: "A1" });
    expect(getCell(model, "A2")).toMatchObject({ style });
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toEqual(border);
    expect(getCell(model, "B1")).toMatchObject({ content: "B1" });
    expect(getCell(model, "C1")).toMatchObject({ content: "C1" });
    expect(getCell(model, "C2")).toMatchObject({ style });
  });
  test("cannot delete row in invalid sheet", () => {
    expect(
      model.dispatch("REMOVE_ROWS", {
        rows: [0],
        sheetId: "INVALID",
      })
    ).toBeCancelled(CancelledReason.InvalidSheetId);
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
        sheets: [
          {
            colNumber: 4,
            rowNumber: 1,
            cols: {
              1: { size: 10 },
              2: { size: 20 },
            },
          },
        ],
      });
    });
    test("On deletion", () => {
      deleteColumns(model, ["A", "C"]);
      expect(model.getters.getActiveSheet().cols).toEqual([
        { start: 0, end: 10, size: 10, name: "A" },
        { start: 10, end: 10 + DEFAULT_CELL_WIDTH, size: DEFAULT_CELL_WIDTH, name: "B" },
      ]);
      expect(model.getters.getActiveSheet().cols.length).toBe(2);
    });
    test("On delete cols in inactive sheet", () => {
      model = new Model({
        sheets: [
          {
            id: "s1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "B2 in sheet1" },
            },
          },
          {
            id: "s2",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "B2 in sheet2" },
            },
          },
        ],
      });
      const [sheet1, sheet2] = model.getters.getSheets();
      expect(sheet2).not.toBe(model.getters.getActiveSheetId());
      model.dispatch("REMOVE_COLUMNS", {
        columns: [0],
        sheetId: sheet2.id,
      });
      expect(getCellContent(model, "B2", sheet1.id)).toBe("B2 in sheet1");
      expect(getCellContent(model, "A2", sheet2.id)).toBe("B2 in sheet2");
    });
    test("On addition before first", () => {
      addColumns(model, "before", "A", 1);
      expect(model.getters.getActiveSheet().cols).toHaveLength(5);
      expect(model.getters.getActiveSheet().rows).toHaveLength(1);
    });
    test("On addition before", () => {
      addColumns(model, "before", "B", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.getters.getActiveSheet().cols).toEqual([
        { start: 0, end: size, size, name: "A" },
        { start: size, end: size + 10, size: 10, name: "B" },
        { start: size + 10, end: size + 20, size: 10, name: "C" },
        { start: size + 20, end: size + 30, size: 10, name: "D" },
        { start: size + 30, end: size + 50, size: 20, name: "E" },
        { start: size + 50, end: 2 * size + 50, size, name: "F" },
      ]);
      expect(model.getters.getActiveSheet().cols.length).toBe(6);
    });
    test("On addition after", () => {
      addColumns(model, "after", "C", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.getters.getActiveSheet().cols).toEqual([
        { start: 0, end: size, size, name: "A" },
        { start: size, end: size + 10, size: 10, name: "B" },
        { start: size + 10, end: size + 30, size: 20, name: "C" },
        { start: size + 30, end: size + 50, size: 20, name: "D" },
        { start: size + 50, end: size + 70, size: 20, name: "E" },
        { start: size + 70, end: 2 * size + 70, size, name: "F" },
      ]);
      expect(model.getters.getActiveSheet().cols.length).toBe(6);
    });
    test("On addition in invalid sheet", () => {
      const sheetId = "invalid";
      expect(addColumns(model, "after", "A", 1, sheetId)).toBeCancelled(
        CancelledReason.InvalidSheetId
      );
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 5,
            rowNumber: 4,
            merges: ["A1:E1", "B2:E2", "C3:E3", "B4:D4"],
          },
        ],
      });
    });

    test("On deletion", () => {
      deleteColumns(model, ["B", "D"]);
      expect(getMerges(model)).toEqual({
        5: { id: 5, topLeft: toPosition("A1"), top: 0, bottom: 0, left: 0, right: 2 },
        6: { id: 6, topLeft: toPosition("B2"), top: 1, bottom: 1, left: 1, right: 2 },
        7: { id: 7, topLeft: toPosition("B3"), top: 2, bottom: 2, left: 1, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, ["A1", "B1", "C1", "B2", "C2", "B3", "C3"])
      );
    });

    test("On addition", () => {
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "A", 1);
      expect(getMerges(model)).toEqual({
        9: { id: 9, topLeft: toPosition("A1"), top: 0, bottom: 0, left: 0, right: 6 },
        10: { id: 10, topLeft: toPosition("D2"), top: 1, bottom: 1, left: 3, right: 6 },
        11: { id: 11, topLeft: toPosition("E3"), top: 2, bottom: 2, left: 4, right: 6 },
        12: { id: 12, topLeft: toPosition("D4"), top: 3, bottom: 3, left: 3, right: 5 },
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
      const s = ["thin", "#000"];
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
      const s = ["thin", "#000"];
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
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      addColumns(model, "after", "B", 1);
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
      expect(getBorder(model, "C2")).toEqual({ left: s });
    });

    test("insert column before cell with external border", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      addColumns(model, "before", "B", 1);
      expect(getBorder(model, "C2")).toEqual({ top: s, bottom: s, left: s, right: s });
      expect(getBorder(model, "B2")).toEqual({ right: s });
    });

    test("delete column after cell with external border", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      model.dispatch("REMOVE_COLUMNS", {
        columns: [2],
        sheetId,
      });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
    });
  });

  describe("Correctly update border and style", () => {
    let border: Border;
    beforeEach(() => {
      border = { top: ["thin", "#000"] };
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
              B3: { style: 1, border: 1, format: "0.00%" },
              B4: { style: 1, border: 1 },
              D1: { style: 1 },
              D2: { border: 1 },
              D3: { style: 1, border: 1 },
            },
            merges: ["B4:C4"],
          },
        ],
        styles: { 1: { textColor: "#fe0000" } },
        borders: { 1: border },
      });
    });
    test("On deletion", () => {
      deleteColumns(model, ["B"]);
      const style = { textColor: "#fe0000" };
      const s = ["thin", "#000"];
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
      const s = ["thin", "#000"];
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
        topLeft: toPosition("C4"),
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
            rowNumber: 4,
            cells: {
              A1: { content: "=B1" },
              A2: { content: "=Sheet1!B1" },
              A3: { content: "=Sheet2!B1" },
              D1: { content: "=A1" },
              D2: { content: "=B1" },
              D3: { content: "=$E1" },
              D4: { content: "=D3" },
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
            cells: {
              B2: { content: "=Sheet1!B3" },
              C1: { content: "=Sheet2!B3" },
            },
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
      const [sheet1, sheet2] = model.getters.getSheets();
      expect(sheet2.id).not.toBe(model.getters.getActiveSheetId());
      model.dispatch("REMOVE_COLUMNS", {
        columns: [0],
        sheetId: sheet2.id,
      });
      expect(getCellsObject(model, sheet1.id)).toMatchObject({
        B2: { formula: { text: "=|0|" }, dependencies: [{ sheetId: "s1", zone: toZone("B3") }] },
        C1: { formula: { text: "=|0|" }, dependencies: [{ sheetId: "s2", zone: toZone("A3") }] },
      });
      expect(getCellsObject(model, sheet2.id)).toMatchObject({
        A2: { formula: { text: "=|0|" }, dependencies: [{ sheetId: "s1", zone: toZone("B2") }] },
        B2: { formula: { text: "=|0|" }, dependencies: [{ sheetId: "s2", zone: toZone("A2") }] },
      });
    });
    test("On first col deletion", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "=SUM(A1:C1)" },
            },
          },
        ],
      });
      deleteColumns(model, ["A"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:B1") }] },
      });
    });
    test("On multiple col deletion including the first one", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              C2: { content: "=SUM(A1:D1)" },
            },
          },
        ],
      });
      deleteColumns(model, ["A", "B"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:B1") }] },
      });
    });
    test("On last col deletion", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              A2: { content: "=SUM(A1:C1)" },
            },
          },
        ],
      });
      deleteColumns(model, ["C"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:B1") }] },
      });
    });
    test("delete almost all columns of a range", () => {
      model = new Model({
        sheets: [
          {
            id: "s1",
            colNumber: 9,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(A2:E5)" },
            },
          },
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
            },
          },
        ],
      });
      deleteColumns(model, ["B", "C", "D", "E"]);
      expect(getCellText(model, "A1", "s1")).toBe(`=SUM(${INCORRECT_RANGE_STRING})`);
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
            cells: {
              A1: { content: "=SUM(Sheet1!B1:D3)" },
            },
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
          { name: "Sheet1", colNumber: 5, rowNumber: 5 },
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
      const sheet1Id = model.getters.getSheetIdByName("Sheet1");
      model.dispatch("REMOVE_COLUMNS", { sheetId: sheet1Id!, columns: [0] });
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:C3)");
    });
    test("On multiple col deletion including the last one", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              A2: { content: "=SUM(A1:D1)" },
            },
          },
        ],
      });
      deleteColumns(model, ["C", "D"]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A2: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:B1") }] },
      });
    });
    test("On addition", () => {
      addColumns(model, "before", "B", 1);
      addColumns(model, "after", "A", 1);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
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
      const zone = { left: 1, right: 3, top: 0, bottom: 2 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      addColumns(model, "before", "B", 1);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 2, right: 4, top: 0 });
    });
    test("On add left 3", () => {
      model = new Model(fullData);
      const zone = { left: 1, right: 3, top: 0, bottom: 2 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      addColumns(model, "before", "B", 3);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 4, right: 6, top: 0 });
    });
    test("On add right 1", () => {
      model = new Model(fullData);
      const zone = toZone("B1:D3");
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual(zone);
      addColumns(model, "after", "B", 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("B1:E3"));
    });
    test("On add right 3", () => {
      model = new Model(fullData);
      const zone = toZone("B1:D3");
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual(zone);
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
        sheets: [
          {
            colNumber: 1,
            rowNumber: 4,
            rows: {
              1: { size: 10 },
              2: { size: 20 },
            },
          },
        ],
      });
    });
    test("On deletion", () => {
      deleteRows(model, [0, 2]);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getActiveSheet().rows).toEqual([
        { start: 0, end: 10, size: 10, name: "1", cells: {} },
        { start: 10, end: size + 10, size, name: "2", cells: {} },
      ]);
      expect(model.getters.getActiveSheet().rows.length).toBe(2);
    });
    test("On delete row in inactive sheet", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "B2 in sheet1" },
            },
          },
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "B2 in sheet2" },
            },
          },
        ],
      });
      const [sheet1, sheet2] = model.getters.getSheets();
      expect(sheet2).not.toBe(model.getters.getActiveSheetId());
      model.dispatch("REMOVE_ROWS", {
        rows: [0],
        sheetId: sheet2.id,
      });
      expect(getCellContent(model, "B2", sheet1.id)).toBe("B2 in sheet1");
      expect(getCellContent(model, "B1", sheet2.id)).toBe("B2 in sheet2");
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
            colNumber: 3,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      deleteRows(model, [1, 2, 3, 4]);
      expect(getCellText(model, "A1")).toBe(`=SUM(${INCORRECT_RANGE_STRING})`);
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
            cells: {
              A1: { content: "=SUM(Sheet1!A2:A3)" },
            },
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
          { name: "Sheet1", colNumber: 5, rowNumber: 5 },
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
      const sheet1Id = model.getters.getSheetIdByName("Sheet1");
      model.dispatch("REMOVE_ROWS", { sheetId: sheet1Id!, rows: [0] });
      expect(getCellText(model, "A1", "42")).toBe("=SUM(Sheet1!A1:A2)");
    });
    test("On addition before first", () => {
      addRows(model, "before", 0, 1);
      expect(model.getters.getActiveSheet().cols).toHaveLength(1);
      expect(model.getters.getActiveSheet().rows).toHaveLength(5);
    });
    test("On addition before", () => {
      addRows(model, "before", 1, 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getActiveSheet().rows).toEqual([
        { start: 0, end: size, size, name: "1", cells: {} },
        { start: size, end: size + 10, size: 10, name: "2", cells: {} },
        { start: size + 10, end: size + 20, size: 10, name: "3", cells: {} },
        { start: size + 20, end: size + 30, size: 10, name: "4", cells: {} },
        { start: size + 30, end: size + 50, size: 20, name: "5", cells: {} },
        { start: size + 50, end: 2 * size + 50, size, name: "6", cells: {} },
      ]);
      const dimensions = model.getters.getGridSize(model.getters.getActiveSheet());
      expect(dimensions).toEqual([192, 124]);
      expect(model.getters.getActiveSheet().rows.length).toBe(6);
    });
    test("On addition after", () => {
      addRows(model, "after", 2, 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getActiveSheet().rows).toEqual([
        { start: 0, end: size, size, name: "1", cells: {} },
        { start: size, end: size + 10, size: 10, name: "2", cells: {} },
        { start: size + 10, end: size + 30, size: 20, name: "3", cells: {} },
        { start: size + 30, end: size + 50, size: 20, name: "4", cells: {} },
        { start: size + 50, end: size + 70, size: 20, name: "5", cells: {} },
        { start: size + 70, end: 2 * size + 70, size, name: "6", cells: {} },
      ]);
      const dimensions = model.getters.getGridSize(model.getters.getActiveSheet());
      expect(dimensions).toEqual([192, 144]);
      expect(model.getters.getActiveSheet().rows.length).toBe(6);
    });
    test("cannot delete column in invalid sheet", () => {
      const sheetId = "invalid";
      expect(addRows(model, "after", 0, 1, sheetId)).toBeCancelled(CancelledReason.InvalidSheetId);
    });

    test("activate Sheet: same size", () => {
      addRows(model, "after", 2, 1);
      let dimensions = model.getters.getGridSize(model.getters.getActiveSheet());
      expect(dimensions).toEqual([192, 124]);
      const to = model.getters.getActiveSheetId();
      createSheet(model, { activate: true, sheetId: "42" });
      const from = model.getters.getActiveSheetId();
      model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: from, sheetIdTo: to });
      dimensions = model.getters.getGridSize(model.getters.getActiveSheet());
      expect(dimensions).toEqual([192, 124]);
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 5,
            merges: ["A1:A5", "B2:B5", "C3:C5", "D2:D4"],
          },
        ],
      });
    });
    test("On deletion", () => {
      deleteRows(model, [1, 3]);
      expect(getMerges(model)).toEqual({
        5: { id: 5, topLeft: toPosition("A1"), top: 0, bottom: 2, left: 0, right: 0 },
        6: { id: 6, topLeft: toPosition("B2"), top: 1, bottom: 2, left: 1, right: 1 },
        7: { id: 7, topLeft: toPosition("C2"), top: 1, bottom: 2, left: 2, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual(
        XCToMergeCellMap(model, ["A1", "A2", "A3", "B2", "B3", "C2", "C3"])
      );
    });
    test("On addition", () => {
      addRows(model, "before", 1, 1);
      addRows(model, "after", 0, 1);
      expect(getMerges(model)).toEqual({
        9: { id: 9, topLeft: toPosition("A1"), top: 0, bottom: 6, left: 0, right: 0 },
        10: { id: 10, topLeft: toPosition("B4"), top: 3, bottom: 6, left: 1, right: 1 },
        11: { id: 11, topLeft: toPosition("C5"), top: 4, bottom: 6, left: 2, right: 2 },
        12: { id: 12, topLeft: toPosition("D4"), top: 3, bottom: 5, left: 3, right: 3 },
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
              C2: { style: 1, border: 1, format: "0.00%" },
              C4: { style: 1, border: 1 },
              D2: { style: 1, border: 1 },
            },
            merges: ["D2:D3"],
          },
        ],
        styles: { 1: { textColor: "#fe0000" } },
        borders: { 1: { top: ["thin", "#000"] } },
      });
    });
    test("On deletion", () => {
      const s = ["thin", "#000"];
      const style = { textColor: "#fe0000" };
      const sheetId = model.getters.getActiveSheetId();
      expect(Object.keys(model.getters.getCells(sheetId))).toHaveLength(8);
      deleteRows(model, [1]);
      expect(getCell(model, "A2")).toBeUndefined();
      expect(getCell(model, "B2")).toBeUndefined();
      expect(getCell(model, "C2")).toBeUndefined();
      expect(Object.values(model.getters.getCells(sheetId))).toHaveLength(5);
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
      const s = ["thin", "#000"];
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
        topLeft: toPosition("D3"),
      });
    });

    test("insert row after cell with external border", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      addRows(model, "after", 1, 1);
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
      expect(getBorder(model, "B3")).toEqual({ top: s });
    });

    test("insert row before cell with external border", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      addRows(model, "before", 1, 1);
      expect(getBorder(model, "B2")).toEqual({ bottom: s });
      expect(getBorder(model, "B3")).toEqual({ top: s, bottom: s, left: s, right: s });
    });

    test("delete row  after cell with external border", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const s = ["thin", "#000"];
      model.dispatch("SET_FORMATTING", {
        sheetId,
        target: [toZone("B2")],
        border: "external",
      });
      model.dispatch("REMOVE_ROWS", {
        rows: [2],
        sheetId,
      });
      expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, left: s, right: s });
    });
  });

  describe("Correctly update references", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 4,
            rowNumber: 7,
            cells: {
              A1: { content: "=A2" },
              A4: { content: "=A1" },
              B1: { content: "=Sheet1!A2" },
              B4: { content: "=B1" },
              C1: { content: "=Sheet2!A2" },
              C4: { content: "=A$5" },
              D4: { content: "=C4" },
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
            cells: {
              B2: { content: "=Sheet1!A2" },
              C1: { content: "=Sheet2!A2" },
            },
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
      model.dispatch("REMOVE_ROWS", {
        rows: [0],
        sheetId: "s2",
      });
      expect(getCellsObject(model, "s1")).toMatchSnapshot();
      expect(getCellsObject(model, "s2")).toMatchSnapshot();
    });
    test("On first row deletion", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "=SUM(A1:A3)" },
            },
          },
        ],
      });
      deleteRows(model, [0]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:A2") }] },
      });
    });
    test("On multiple row deletion including the first one", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 6,
            cells: {
              B1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      deleteRows(model, [1, 2]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A2:A3") }] },
      });
    });
    test("strange test in Odoo", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 1000,
            cells: {
              A5: { content: "=SUM(A6:A255)" },
              A256: { content: "=SUM(A257:A506)" },
            },
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
        A5: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A6") }] },
        A7: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A8") }] },
      });
    });
    test("On last row deletion", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B1: { content: "=SUM(A1:A3)" },
            },
          },
        ],
      });
      deleteRows(model, [2]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: { formula: { text: "=SUM(|0|)" }, dependencies: [{ zone: toZone("A1:A2") }] },
      });
    });
    test("On multiple row", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 8,
            cells: {
              A1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      deleteRows(model, [2, 3]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: {
          dependencies: [{ zone: { top: 1, left: 0, bottom: 2, right: 0 } }],
          type: CellType.formula,
          formula: { text: "=SUM(|0|)" },
        },
      });
    });
    test("On multiple rows (7)", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 1,
            rowNumber: 8,
            cells: {
              A1: { content: "=SUM(A2:A8)" },
            },
          },
        ],
      });
      deleteRows(model, [1, 2, 3, 4, 5, 6]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        A1: {
          dependencies: [{ zone: { top: 1, left: 0, bottom: 1, right: 0 } }],
          type: CellType.formula,
          formula: { text: "=SUM(|0|)" },
        },
      });
    });
    test("On multiple row deletion including the last one", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 4,
            rowNumber: 4,
            cells: {
              B1: { content: "=SUM(A1:A4)" },
            },
          },
        ],
      });
      deleteRows(model, [2, 3]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B1: {
          dependencies: [{ zone: { top: 0, left: 0, bottom: 1, right: 0 } }],
          type: CellType.formula,
          formula: {
            text: "=SUM(|0|)",
          },
        },
      });
    });
    test("On multiple row deletion including the last and beyond", () => {
      model = new Model({
        sheets: [
          {
            id: "sheet1",
            colNumber: 2,
            rowNumber: 8,
            cells: {
              B2: { content: "=SUM(A1:A4)" },
            },
          },
        ],
      });
      deleteRows(model, [3, 4, 5, 6, 7]);
      expect(getCellsObject(model, "sheet1")).toMatchObject({
        B2: {
          dependencies: [{ zone: { top: 0, left: 0, bottom: 2, right: 0 } }],
          type: CellType.formula,
          formula: { text: "=SUM(|0|)" },
        },
      });
    });
    test("On addition", () => {
      addRows(model, "before", 1, 1);
      addRows(model, "after", 0, 1);
      expect(getCellsObject(model, "sheet1")).toMatchSnapshot();
      expect(getCellsObject(model, "sheet2")).toMatchSnapshot();
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
      const zone = { left: 2, right: 3, top: 0, bottom: 1 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 1, left: 2, right: 3, top: 0 });
      addRows(model, "before", 0, 1);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 2, right: 3, top: 1 });
    });
    test("On add top 3", () => {
      model = new Model(fullData);
      const zone = { left: 2, right: 3, top: 0, bottom: 1 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 1, left: 2, right: 3, top: 0 });
      addRows(model, "before", 0, 3);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 4, left: 2, right: 3, top: 3 });
    });
    test("On add bottom 1", () => {
      model = new Model(fullData);
      const zone = toZone("C1:D2");
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual(zone);
      addRows(model, "after", 0, 1);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D3"));
    });
    test("On add bottom 3", () => {
      model = new Model(fullData);
      const zone = toZone("C1:D2");
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual(zone);
      addRows(model, "after", 0, 3);
      expect(model.getters.getSelectedZone()).toEqual(toZone("C1:D5"));
    });
  });

  describe("Multi-sheet", () => {
    test("Cann add a row in another sheet", () => {
      const model = new Model({
        sheets: [
          { id: "1", colNumber: 3, rowNumber: 3 },
          { id: "2", colNumber: 3, rowNumber: 3 },
        ],
        activeSheet: "1",
      });
      const sheetId = "2";
      addRows(model, "after", 1, 2, sheetId);
      const sheet1 = model.getters.getSheet("1");
      const sheet2 = model.getters.getSheet("2");
      expect(sheet1.rows.length).toBe(3);
      expect(sheet2.rows.length).toBe(5);
      expect(sheet2.rows[4]).toEqual({
        cells: {},
        end: DEFAULT_CELL_HEIGHT * 5,
        size: DEFAULT_CELL_HEIGHT,
        start: DEFAULT_CELL_HEIGHT * 4,
        name: "5",
      });
    });
  });
});
