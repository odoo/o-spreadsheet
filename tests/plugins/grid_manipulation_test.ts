import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { getCell, getMergeCellMap, getMerges, getSheet, makeTestFixture } from "../helpers";
let model: Model;

function undo() {
  model.dispatch("UNDO");
}

function redo() {
  model.dispatch("REDO");
}

function clearColumns(indexes: number[]) {
  const target = indexes.map((index) => {
    return model.getters.getColsZone(index, index);
  });
  model.dispatch("DELETE_CONTENT", {
    target,
    sheet: model.getters.getActiveSheetId(),
  });
}

function clearRows(indexes: number[]) {
  const target = indexes.map((index) => {
    return model.getters.getRowsZone(index, index);
  });
  model.dispatch("DELETE_CONTENT", {
    target,
    sheet: model.getters.getActiveSheetId(),
  });
}

function removeColumns(columns: number[]) {
  model.dispatch("REMOVE_COLUMNS", { sheet: model.getters.getActiveSheetId(), columns });
}

function removeRows(rows: number[]) {
  model.dispatch("REMOVE_ROWS", { sheet: model.getters.getActiveSheetId(), rows });
}

function addColumns(column: number, position: "before" | "after", quantity: number) {
  model.dispatch("ADD_COLUMNS", {
    sheet: model.getters.getActiveSheetId(),
    position,
    column,
    quantity,
  });
}

function addRows(row: number, position: "before" | "after", quantity: number) {
  model.dispatch("ADD_ROWS", {
    sheet: model.getters.getActiveSheetId(),
    position,
    row,
    quantity,
  });
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

describe("Clear columns", () => {
  test("Can clear multiple column", () => {
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
      borders: { 1: { right: ["thin", "#000"] } },
      merges: ["A3:B3"],
    });

    clearColumns([1, 2]);
    expect(model.getters.getCells().B2).toBeUndefined();
    expect(model.getters.getCells()).toMatchObject({
      A1: { content: "A1" },
      A2: { content: "A2" },
      A3: { content: "A3" },
      B1: { content: "", style: 1, border: 1 },
      C1: { content: "", style: 1 },
      C2: { content: "", border: 1 },
    });
  });
});

describe("Clear rows", () => {
  test("Can clear multiple rows", () => {
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
      borders: { 1: { right: ["thin", "#000"] } },
      merges: ["C1:C2"],
    });

    clearRows([1, 2]);
    expect(model.getters.getCells().B2).toBeUndefined();
    expect(model.getters.getCells()).toMatchObject({
      A1: { content: "A1" },
      A2: { content: "", style: 1, border: 1 },
      A3: { content: "", border: 1 },
      B1: { content: "B1" },
      C1: { content: "C1" },
      C2: { content: "", style: 1 },
    });
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
      removeColumns([0, 2]);
      expect(model.getters.getCols()).toEqual([
        { start: 0, end: 10, size: 10, name: "A" },
        { start: 10, end: 10 + DEFAULT_CELL_WIDTH, size: DEFAULT_CELL_WIDTH, name: "B" },
      ]);
      expect(model.getters.getNumberCols(model.getters.getActiveSheetId())).toBe(2);
    });
    test("On delete cols in inactive sheet", () => {
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
      model.dispatch("REMOVE_COLUMNS", {
        columns: [0],
        sheet: sheet2.id,
      });
      expect(sheet1.cells.B2.content).toBe("B2 in sheet1");
      expect(sheet2.cells.A2.content).toBe("B2 in sheet2");
    });
    test("On addition before", () => {
      addColumns(1, "before", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.getters.getCols()).toEqual([
        { start: 0, end: size, size, name: "A" },
        { start: size, end: size + 10, size: 10, name: "B" },
        { start: size + 10, end: size + 20, size: 10, name: "C" },
        { start: size + 20, end: size + 30, size: 10, name: "D" },
        { start: size + 30, end: size + 50, size: 20, name: "E" },
        { start: size + 50, end: 2 * size + 50, size, name: "F" },
      ]);
      expect(model.getters.getNumberCols(model.getters.getActiveSheetId())).toBe(6);
    });
    test("On addition after", () => {
      addColumns(2, "after", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.getters.getCols()).toEqual([
        { start: 0, end: size, size, name: "A" },
        { start: size, end: size + 10, size: 10, name: "B" },
        { start: size + 10, end: size + 30, size: 20, name: "C" },
        { start: size + 30, end: size + 50, size: 20, name: "D" },
        { start: size + 50, end: size + 70, size: 20, name: "E" },
        { start: size + 70, end: 2 * size + 70, size, name: "F" },
      ]);
      expect(model.getters.getNumberCols(model.getters.getActiveSheetId())).toBe(6);
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
      removeColumns([1, 3]);
      expect(getMerges(model)).toEqual({
        5: { id: 5, topLeft: "A1", top: 0, bottom: 0, left: 0, right: 2 },
        6: { id: 6, topLeft: "B2", top: 1, bottom: 1, left: 1, right: 2 },
        7: { id: 7, topLeft: "B3", top: 2, bottom: 2, left: 1, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual({
        A1: 5,
        B1: 5,
        C1: 5,
        B2: 6,
        C2: 6,
        B3: 7,
        C3: 7,
      });
    });

    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(0, "after", 1);
      expect(getMerges(model)).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 0, left: 0, right: 6 },
        10: { id: 10, topLeft: "D2", top: 1, bottom: 1, left: 3, right: 6 },
        11: { id: 11, topLeft: "E3", top: 2, bottom: 2, left: 4, right: 6 },
        12: { id: 12, topLeft: "D4", top: 3, bottom: 3, left: 3, right: 5 },
      });
      expect(getMergeCellMap(model)).toEqual({
        A1: 9,
        B1: 9,
        C1: 9,
        D1: 9,
        E1: 9,
        F1: 9,
        G1: 9,
        D2: 10,
        E2: 10,
        F2: 10,
        G2: 10,
        E3: 11,
        F3: 11,
        G3: 11,
        D4: 12,
        E4: 12,
        F4: 12,
      });
    });
  });

  describe("Correctly update border and style", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
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
        borders: { 1: { top: ["thin", "#000"] } },
      });
    });
    test("On deletion", () => {
      removeColumns([1]);
      expect(model.getters.getCells().B1).toBeUndefined();
      expect(model.getters.getCells().B2).toBeUndefined();
      expect(model.getters.getCells().B3).toBeUndefined();
      expect(model.getters.getCells()).toMatchObject({
        A1: { style: 1 },
        A2: { border: 1 },
        A3: { style: 1, border: 1 },
        B4: { style: 1, border: 1 },
        C1: { style: 1 },
        C2: { border: 1 },
        C3: { style: 1, border: 1 },
      });
    });
    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(2, "after", 2);
      expect(model.getters.getCells()).toMatchObject({
        A1: { style: 1 },
        A2: { border: 1 },
        A3: { style: 1, border: 1 },
        B1: { style: 1 },
        B2: { border: 1 },
        B3: { style: 1, border: 1, format: "0.00%" },
        B4: { style: 1 },
        C1: { style: 1 },
        C2: { border: 1 },
        C3: { style: 1, border: 1, format: "0.00%" },
        C4: { style: 1, border: 1 },
        E1: { style: 1 },
      });
      expect(Object.values(getMerges(model))[0]).toMatchObject({
        left: 2,
        right: 5,
        topLeft: "C4",
      });
    });
  });

  describe("Correctly update references", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
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
      removeColumns([1, 2]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=#REF" },
        A2: { content: "=#REF" },
        A3: { content: "=Sheet2!B1" },
        B1: { content: "=A1" },
        B2: { content: "=#REF" },
        B3: { content: "=$C1" },
        B4: { content: "=B3" },
      });
      expect(getSheet(model, 1).cells).toMatchObject({
        A1: { content: "=B1" },
        A2: { content: "=#REF" },
        A3: { content: "=Sheet2!B1" },
      });
    });
    test("delete col on inactive sheet", () => {
      const model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 7,
            cells: {
              B2: { content: "=Sheet1!B3" },
              C1: { content: "=Sheet2!B3" },
            },
          },
          {
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
        sheet: sheet2.id,
      });
      expect(sheet1.cells).toMatchObject({
        B2: { content: "=Sheet1!B3" },
        C1: { content: "=Sheet2!A3" },
      });
      expect(sheet2.cells).toMatchObject({
        A2: { content: "=Sheet1!B2" },
        B2: { content: "=Sheet2!A2" },
      });
    });
    test("On first col deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "=SUM(A1:C1)" },
            },
          },
        ],
      });
      removeColumns([0]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On multiple col deletion including the first one", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              C2: { content: "=SUM(A1:D1)" },
            },
          },
        ],
      });
      removeColumns([0, 1]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On last col deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              A2: { content: "=SUM(A1:C1)" },
            },
          },
        ],
      });
      removeColumns([2]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("delete all columns of a range", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 9,
            rowNumber: 3,
            cells: {
              A1: { content: "=SUM(A2:E5)" },
            },
          },
        ],
      });
      removeColumns([1, 2, 3, 4]);
      expect(getSheet(model, 0).cells.A1.content).toBe("=SUM(#REF)");
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
      removeColumns([0]);
      expect(getCell(model, "A1", "42")!.content).toBe("=SUM(Sheet1!A1:C3)");
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
      model.dispatch("REMOVE_COLUMNS", { sheet: sheet1Id!, columns: [0] });
      expect(getCell(model, "A1", "42")!.content).toBe("=SUM(Sheet1!A1:C3)");
    });
    test("On multiple col deletion including the last one", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              A2: { content: "=SUM(A1:D1)" },
            },
          },
        ],
      });
      removeColumns([2, 3]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A2: { content: "=SUM(A1:B1)" },
      });
    });
    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(0, "after", 1);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=D1" },
        A2: { content: "=Sheet1!D1" },
        A3: { content: "=Sheet2!B1" },
        F1: { content: "=A1" },
        F2: { content: "=D1" },
        F3: { content: "=$G1" },
        F4: { content: "=F3" },
      });
      expect(getSheet(model, 1).cells).toMatchObject({
        A1: { content: "=B1" },
        A2: { content: "=Sheet1!D1" },
        A3: { content: "=Sheet2!B1" },
      });
    });
  });

  describe("Correctly handle undo/redo", () => {
    test("On deletion", () => {
      model = new Model(fullData);
      const beforeRemove = model.exportData();
      removeColumns([0, 2]);
      const afterRemove = model.exportData();
      undo();
      expect(model.exportData()).toEqual(beforeRemove);
      redo();
      expect(model.exportData()).toEqual(afterRemove);
    });
    test("On addition", () => {
      model = new Model(fullData);
      const beforeAdd = model.exportData();
      addColumns(1, "before", 4);
      const afterAdd1 = model.exportData();
      addColumns(4, "after", 4);
      const afterAdd2 = model.exportData();
      undo();
      expect(model.exportData()).toEqual(afterAdd1);
      redo();
      expect(model.exportData()).toEqual(afterAdd2);
      undo();
      undo();
      expect(model.exportData()).toEqual(beforeAdd);
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
      addColumns(1, "before", 1);
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
      addColumns(1, "before", 3);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 4, right: 6, top: 0 });
    });
    test("On add right 1", () => {
      model = new Model(fullData);
      const zone = { left: 1, right: 3, top: 0, bottom: 2 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      addColumns(1, "after", 1);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
    });
    test("On add right 3", () => {
      model = new Model(fullData);
      const zone = { left: 1, right: 3, top: 0, bottom: 2 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      addColumns(1, "after", 1);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
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
      removeRows([0, 2]);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getRows()).toEqual([
        { start: 0, end: 10, size: 10, name: "1", cells: {} },
        { start: 10, end: size + 10, size, name: "2", cells: {} },
      ]);
      expect(model.getters.getNumberRows(model.getters.getActiveSheetId())).toBe(2);
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
        sheet: sheet2.id,
      });
      expect(sheet1.cells.B2.content).toBe("B2 in sheet1");
      expect(sheet2.cells.B1.content).toBe("B2 in sheet2");
    });
    test("On deletion batch", () => {
      model = new Model({
        sheets: [
          {
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
      removeRows([0, 2, 3]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "A2" },
      });
    });
    test("delete all rows of a range", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 9,
            cells: {
              A1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      removeRows([1, 2, 3, 4]);
      expect(getSheet(model, 0).cells.A1.content).toBe("=SUM(#REF)");
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
      removeRows([0]);
      expect(getCell(model, "A1", "42")!.content).toBe("=SUM(Sheet1!A1:A2)");
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
      model.dispatch("REMOVE_ROWS", { sheet: sheet1Id!, rows: [0] });
      expect(getCell(model, "A1", "42")!.content).toBe("=SUM(Sheet1!A1:A2)");
    });
    test("On addition before", () => {
      addRows(1, "before", 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getRows()).toEqual([
        { start: 0, end: size, size, name: "1", cells: {} },
        { start: size, end: size + 10, size: 10, name: "2", cells: {} },
        { start: size + 10, end: size + 20, size: 10, name: "3", cells: {} },
        { start: size + 20, end: size + 30, size: 10, name: "4", cells: {} },
        { start: size + 30, end: size + 50, size: 20, name: "5", cells: {} },
        { start: size + 50, end: 2 * size + 50, size, name: "6", cells: {} },
      ]);
      const dimensions = model.getters.getGridSize();
      expect(dimensions).toEqual([192, 124]);
      expect(model.getters.getNumberRows(model.getters.getActiveSheetId())).toBe(6);
    });
    test("On addition after", () => {
      addRows(2, "after", 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.getters.getRows()).toEqual([
        { start: 0, end: size, size, name: "1", cells: {} },
        { start: size, end: size + 10, size: 10, name: "2", cells: {} },
        { start: size + 10, end: size + 30, size: 20, name: "3", cells: {} },
        { start: size + 30, end: size + 50, size: 20, name: "4", cells: {} },
        { start: size + 50, end: size + 70, size: 20, name: "5", cells: {} },
        { start: size + 70, end: 2 * size + 70, size, name: "6", cells: {} },
      ]);
      const dimensions = model.getters.getGridSize();
      expect(dimensions).toEqual([192, 144]);
      expect(model.getters.getNumberRows(model.getters.getActiveSheetId())).toBe(6);
    });

    test("activate Sheet: same size", () => {
      addRows(2, "after", 1);
      let dimensions = model.getters.getGridSize();
      expect(dimensions).toEqual([192, 124]);
      const to = model.getters.getActiveSheetId();
      model.dispatch("CREATE_SHEET", { activate: true, id: "42" });
      const from = model.getters.getActiveSheetId();
      model.dispatch("ACTIVATE_SHEET", { from, to });
      dimensions = model.getters.getGridSize();
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
      removeRows([1, 3]);
      expect(getMerges(model)).toEqual({
        5: { id: 5, topLeft: "A1", top: 0, bottom: 2, left: 0, right: 0 },
        6: { id: 6, topLeft: "B2", top: 1, bottom: 2, left: 1, right: 1 },
        7: { id: 7, topLeft: "C2", top: 1, bottom: 2, left: 2, right: 2 },
      });
      expect(getMergeCellMap(model)).toEqual({
        A1: 5,
        A2: 5,
        A3: 5,
        B2: 6,
        B3: 6,
        C2: 7,
        C3: 7,
      });
    });
    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(0, "after", 1);
      expect(getMerges(model)).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 6, left: 0, right: 0 },
        10: { id: 10, topLeft: "B4", top: 3, bottom: 6, left: 1, right: 1 },
        11: { id: 11, topLeft: "C5", top: 4, bottom: 6, left: 2, right: 2 },
        12: { id: 12, topLeft: "D4", top: 3, bottom: 5, left: 3, right: 3 },
      });
      expect(getMergeCellMap(model)).toEqual({
        A1: 9,
        A2: 9,
        A3: 9,
        A4: 9,
        A5: 9,
        A6: 9,
        A7: 9,
        B4: 10,
        B5: 10,
        B6: 10,
        B7: 10,
        C5: 11,
        C6: 11,
        C7: 11,
        D4: 12,
        D5: 12,
        D6: 12,
      });
    });
  });

  describe("Correctly update border and style", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
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
      removeRows([1]);
      expect(model.getters.getCells().A2).toBeUndefined();
      expect(model.getters.getCells().B2).toBeUndefined();
      expect(model.getters.getCells().C2).toBeUndefined();
      expect(model.getters.getCells()).toMatchObject({
        A1: { style: 1 },
        A3: { style: 1 },
        B1: { border: 1 },
        B3: { border: 1 },
        C1: { style: 1, border: 1 },
        C3: { style: 1, border: 1 },
        D2: { style: 1, border: 1 },
      });
    });

    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(2, "after", 2);
      expect(model.getters.getCells()).toMatchObject({
        A1: { style: 1 },
        B1: { border: 1 },
        C1: { style: 1, border: 1 },
        A2: { style: 1 },
        B2: { border: 1 },
        C2: { style: 1, border: 1, format: "0.00%" },
        D2: { style: 1 },
        A3: { style: 1 },
        B3: { border: 1 },
        C3: { style: 1, border: 1, format: "0.00%" },
        D3: { style: 1, border: 1 },
        A5: { style: 1 },
      });
      expect(Object.values(getMerges(model))[0]).toMatchObject({
        top: 2,
        bottom: 5,
        topLeft: "D3",
      });
    });
  });

  describe("Correctly update references", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
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
      removeRows([1, 2]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=#REF" },
        A2: { content: "=A1" },
        B1: { content: "=#REF" },
        B2: { content: "=B1" },
        C1: { content: "=Sheet2!A2" },
        C2: { content: "=A$3" },
        D2: { content: "=C2" },
      });
      expect(getSheet(model, 1).cells).toMatchObject({
        A1: { content: "=A2" },
        B1: { content: "=#REF" },
        C1: { content: "=Sheet2!A2" },
      });
    });
    test("delete row on inactive sheet", () => {
      const model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 7,
            cells: {
              B2: { content: "=Sheet1!A2" },
              C1: { content: "=Sheet2!A2" },
            },
          },
          {
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
      const [sheet1, sheet2] = model.getters.getSheets();
      expect(sheet2.id).not.toBe(model.getters.getActiveSheetId()),
        model.dispatch("REMOVE_ROWS", {
          rows: [0],
          sheet: sheet2.id,
        });
      expect(sheet1.cells).toMatchObject({
        B2: { content: "=Sheet1!A2" },
        C1: { content: "=Sheet2!A1" },
      });
      expect(sheet2.cells).toMatchObject({
        A1: { content: "=B1" },
        B1: { content: "=Sheet1!A2" },
        C1: { content: "=Sheet2!A1" },
      });
    });
    test("On first row deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B2: { content: "=SUM(A1:A3)" },
            },
          },
        ],
      });
      removeRows([0]);
      expect(getSheet(model, 0).cells).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });
    test("On multiple row deletion including the first one", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 6,
            cells: {
              B1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      removeRows([1, 2]);
      expect(getSheet(model, 0).cells).toMatchObject({
        B1: { content: "=SUM(A2:A3)" },
      });
    });
    test("strange test in Odoo", () => {
      model = new Model({
        sheets: [
          {
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

      removeRows(rows);
      expect(getSheet(model, 0).cells).toMatchObject({
        A5: { content: "=SUM(A6)" },
        A7: { content: "=SUM(A8)" },
      });
    });
    test("On last row deletion", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 3,
            rowNumber: 3,
            cells: {
              B1: { content: "=SUM(A1:A3)" },
            },
          },
        ],
      });
      removeRows([2]);
      expect(getSheet(model, 0).cells).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });
    test("On multiple row", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 1,
            rowNumber: 8,
            cells: {
              A1: { content: "=SUM(A2:A5)" },
            },
          },
        ],
      });
      removeRows([2, 3]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=SUM(A2:A3)" },
      });
    });
    test("On multiple rows (7)", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 1,
            rowNumber: 8,
            cells: {
              A1: { content: "=SUM(A2:A8)" },
            },
          },
        ],
      });
      removeRows([1, 2, 3, 4, 5, 6]);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=SUM(A2)" },
      });
    });
    test("On multiple row deletion including the last one", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 4,
            cells: {
              B1: { content: "=SUM(A1:A4)" },
            },
          },
        ],
      });
      removeRows([2, 3]);
      expect(getSheet(model, 0).cells).toMatchObject({
        B1: { content: "=SUM(A1:A2)" },
      });
    });
    test("On multiple row deletion including the last and beyond", () => {
      model = new Model({
        sheets: [
          {
            colNumber: 2,
            rowNumber: 8,
            cells: {
              B2: { content: "=SUM(A1:A4)" },
            },
          },
        ],
      });
      removeRows([3, 4, 5, 6, 7]);
      expect(getSheet(model, 0).cells).toMatchObject({
        B2: { content: "=SUM(A1:A3)" },
      });
    });
    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(0, "after", 1);
      expect(getSheet(model, 0).cells).toMatchObject({
        A1: { content: "=A4" },
        A6: { content: "=A1" },
        B1: { content: "=Sheet1!A4" },
        B6: { content: "=B1" },
        C1: { content: "=Sheet2!A2" },
        C6: { content: "=A$7" },
        D6: { content: "=C6" },
      });
      expect(getSheet(model, 1).cells).toMatchObject({
        A1: { content: "=A2" },
        B1: { content: "=Sheet1!A4" },
        C1: { content: "=Sheet2!A2" },
      });
    });
  });

  describe("Correctly handle undo/redo", () => {
    test("On deletion", () => {
      model = new Model(fullData);
      const beforeRemove = model.exportData();
      removeRows([0, 2]);
      const afterRemove = model.exportData();
      undo();
      expect(model.exportData()).toEqual(beforeRemove);
      redo();
      expect(model.exportData()).toEqual(afterRemove);
    });

    test("On addition", () => {
      model = new Model(fullData);
      const beforeAdd = model.exportData();
      addRows(2, "before", 2);
      const afterAdd1 = model.exportData();
      addRows(4, "after", 4);
      const afterAdd2 = model.exportData();
      undo();
      expect(model.exportData()).toEqual(afterAdd1);
      redo();
      expect(model.exportData()).toEqual(afterAdd2);
      undo();
      undo();
      expect(model.exportData()).toEqual(beforeAdd);
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
      addRows(0, "before", 1);
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
      addRows(0, "before", 3);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 4, left: 2, right: 3, top: 3 });
    });
    test("On add bottom 1", () => {
      model = new Model(fullData);
      const zone = { left: 2, right: 3, top: 0, bottom: 1 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 1, left: 2, right: 3, top: 0 });
      addRows(0, "after", 1);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 1, left: 2, right: 3, top: 0 });
    });
    test("On add bottom 3", () => {
      model = new Model(fullData);
      const zone = { left: 1, right: 3, top: 0, bottom: 2 };
      model.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
        strict: true,
      });
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
      addRows(0, "after", 3);
      expect(model.getters.getSelectedZone()).toEqual({ bottom: 2, left: 1, right: 3, top: 0 });
    });
  });
});
