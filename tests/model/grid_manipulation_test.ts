import { Model } from "../../src/model";
import { DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT } from "../../src/constants";
import { makeTestFixture } from "../helpers";
let model: Model;

function undo() {
  model.dispatch({ type: "UNDO" });
}

function redo() {
  model.dispatch({ type: "REDO" });
}

function clearColumns(indexes: number[]) {
  const target = indexes.map(index => {
    return model.getters.getColsZone(index, index);
  });
  model.dispatch({
    type: "DELETE_CONTENT",
    target,
    sheet: model.workbook.activeSheet.name
  });
}

function clearRows(indexes: number[]) {
  const target = indexes.map(index => {
    return model.getters.getRowsZone(index, index);
  });
  model.dispatch({
    type: "DELETE_CONTENT",
    target,
    sheet: model.workbook.activeSheet.name
  });
}

function removeColumns(columns: number[]) {
  model.dispatch({ type: "REMOVE_COLUMNS", sheet: model.state.activeSheet, columns });
}

function removeRows(rows: number[]) {
  model.dispatch({ type: "REMOVE_ROWS", sheet: model.state.activeSheet, rows });
}

function addColumns(column: number, position: "before" | "after", quantity: number) {
  model.dispatch({
    type: "ADD_COLUMNS",
    sheet: model.state.activeSheet,
    position,
    column,
    quantity
  });
}

function addRows(row: number, position: "before" | "after", quantity: number) {
  model.dispatch({
    type: "ADD_ROWS",
    sheet: model.state.activeSheet,
    position,
    row,
    quantity
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
        C3: { content: "3" }
      },
      merges: ["A4:D4", "C1:D2"],
      cols: { 1: { size: 42 } },
      rows: { 1: { size: 42 } }
    }
  ],
  styles: { 1: { textColor: "#fe0000" } },
  borders: { 1: { top: ["thin", "#000"] } }
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
            C2: { content: "C2", border: 1 }
          }
        }
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: { right: ["thin", "#000"] } },
      merges: ["A3:B3"]
    });

    clearColumns([1, 2]);
    expect(model.workbook.cells.B2).toBeUndefined();
    expect(model.workbook.cells).toMatchObject({
      A1: { content: "A1" },
      A2: { content: "A2" },
      A3: { content: "A3" },
      B1: { content: "", style: 1, border: 1 },
      C1: { content: "", style: 1 },
      C2: { content: "", border: 1 }
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
            C2: { content: "C2", style: 1 }
          }
        }
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: { right: ["thin", "#000"] } },
      merges: ["C1:C2"]
    });

    clearRows([1, 2]);
    expect(model.workbook.cells.B2).toBeUndefined();
    expect(model.workbook.cells).toMatchObject({
      A1: { content: "A1" },
      A2: { content: "", style: 1, border: 1 },
      A3: { content: "", border: 1 },
      B1: { content: "B1" },
      C1: { content: "C1" },
      C2: { content: "", style: 1 }
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
              2: { size: 20 }
            }
          }
        ]
      });
    });
    test("On deletion", () => {
      removeColumns([0, 2]);
      expect(model.workbook.cols).toEqual([
        { left: 0, right: 10, size: 10, name: "A" },
        { left: 10, right: 10 + DEFAULT_CELL_WIDTH, size: DEFAULT_CELL_WIDTH, name: "B" }
      ]);
    });
    test("On addition before", () => {
      addColumns(1, "before", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.workbook.cols).toEqual([
        { left: 0, right: size, size, name: "A" },
        { left: size, right: size + 10, size: 10, name: "B" },
        { left: size + 10, right: size + 20, size: 10, name: "C" },
        { left: size + 20, right: size + 30, size: 10, name: "D" },
        { left: size + 30, right: size + 50, size: 20, name: "E" },
        { left: size + 50, right: 2 * size + 50, size, name: "F" }
      ]);
    });
    test("On addition after", () => {
      addColumns(2, "after", 2);
      const size = DEFAULT_CELL_WIDTH;
      expect(model.workbook.cols).toEqual([
        { left: 0, right: size, size, name: "A" },
        { left: size, right: size + 10, size: 10, name: "B" },
        { left: size + 10, right: size + 30, size: 20, name: "C" },
        { left: size + 30, right: size + 50, size: 20, name: "D" },
        { left: size + 50, right: size + 70, size: 20, name: "E" },
        { left: size + 70, right: 2 * size + 70, size, name: "F" }
      ]);
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 5,
            rowNumber: 4,
            merges: ["A1:E1", "B2:E2", "C3:E3", "B4:D4"]
          }
        ]
      });
    });
    test("On deletion", () => {
      removeColumns([1, 3]);
      // As we remove columns by columns, the first ID is 9 because we
      // compute merges two times (*4 merges)
      expect(model.workbook.merges).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 0, left: 0, right: 2 },
        10: { id: 10, topLeft: "B2", top: 1, bottom: 1, left: 1, right: 2 },
        11: { id: 11, topLeft: "B3", top: 2, bottom: 2, left: 1, right: 2 }
      });
      expect(model.state.mergeCellMap).toEqual({
        A1: 9,
        B1: 9,
        C1: 9,
        B2: 10,
        C2: 10,
        B3: 11,
        C3: 11
      });
    });
    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(0, "after", 1);
      expect(model.workbook.merges).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 0, left: 0, right: 6 },
        10: { id: 10, topLeft: "D2", top: 1, bottom: 1, left: 3, right: 6 },
        11: { id: 11, topLeft: "E3", top: 2, bottom: 2, left: 4, right: 6 },
        12: { id: 12, topLeft: "D4", top: 3, bottom: 3, left: 3, right: 5 }
      });
      expect(model.state.mergeCellMap).toEqual({
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
        F4: 12
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
              B3: { style: 1, border: 1 },
              B4: { style: 1, border: 1 },
              D1: { style: 1 },
              D2: { border: 1 },
              D3: { style: 1, border: 1 }
            },
            merges: ["B4:C4"]
          }
        ],
        styles: { 1: { textColor: "#fe0000" } },
        borders: { 1: { top: ["thin", "#000"] } }
      });
    });
    test("On deletion", () => {
      removeColumns([1]);
      expect(model.workbook.cells.B1).toBeUndefined();
      expect(model.workbook.cells.B2).toBeUndefined();
      expect(model.workbook.cells.B3).toBeUndefined();
      expect(model.workbook.cells).toMatchObject({
        A1: { style: 1 },
        A2: { border: 1 },
        A3: { style: 1, border: 1 },
        B4: { style: 1, border: 1 },
        C1: { style: 1 },
        C2: { border: 1 },
        C3: { style: 1, border: 1 }
      });
    });
    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(2, "after", 2);
      expect(model.workbook.cells).toMatchObject({
        A1: { style: 1 },
        A2: { border: 1 },
        A3: { style: 1, border: 1 },
        B1: { style: 1 },
        B2: { border: 1 },
        B3: { style: 1, border: 1 },
        B4: { style: 1 },
        C1: { style: 1 },
        C2: { border: 1 },
        C3: { style: 1, border: 1 },
        C4: { style: 1, border: 1 },
        E1: { style: 1 }
      });
      expect(Object.values(model.workbook.merges)[0]).toMatchObject({
        left: 2,
        right: 5,
        topLeft: "C4"
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
              D4: { content: "=D3" }
            }
          },
          {
            colNumber: 1,
            rowNumber: 3,
            cells: {
              A1: { content: "=B1" },
              A2: { content: "=Sheet1!B1" },
              A3: { content: "=Sheet2!B1" }
            }
          }
        ]
      });
    });
    test("On deletion", () => {
      removeColumns([1, 2]);
      expect(model.workbook.sheets[0].cells).toMatchObject({
        A1: { content: "=#REF" },
        A2: { content: "=#REF" },
        A3: { content: "=Sheet2!B1" },
        B1: { content: "=A1" },
        B2: { content: "=#REF" },
        B3: { content: "=$C1" },
        B4: { content: "=B3" }
      });
      expect(model.workbook.sheets[1].cells).toMatchObject({
        A1: { content: "=B1" },
        A2: { content: "=#REF" },
        A3: { content: "=Sheet2!B1" }
      });
    });
    test("On addition", () => {
      addColumns(1, "before", 1);
      addColumns(0, "after", 1);
      expect(model.workbook.sheets[0].cells).toMatchObject({
        A1: { content: "=D1" },
        A2: { content: "=Sheet1!D1" },
        A3: { content: "=Sheet2!B1" },
        F1: { content: "=A1" },
        F2: { content: "=D1" },
        F3: { content: "=$G1" },
        F4: { content: "=F3" }
      });
      expect(model.workbook.sheets[1].cells).toMatchObject({
        A1: { content: "=B1" },
        A2: { content: "=Sheet1!D1" },
        A3: { content: "=Sheet2!B1" }
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
              2: { size: 20 }
            }
          }
        ]
      });
    });
    test("On deletion", () => {
      removeRows([0, 2]);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.workbook.rows).toEqual([
        { top: 0, bottom: 10, size: 10, name: "1", cells: {} },
        { top: 10, bottom: size + 10, size, name: "2", cells: {} }
      ]);
    });
    test("On addition before", () => {
      addRows(1, "before", 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.workbook.rows).toEqual([
        { top: 0, bottom: size, size, name: "1", cells: {} },
        { top: size, bottom: size + 10, size: 10, name: "2", cells: {} },
        { top: size + 10, bottom: size + 20, size: 10, name: "3", cells: {} },
        { top: size + 20, bottom: size + 30, size: 10, name: "4", cells: {} },
        { top: size + 30, bottom: size + 50, size: 20, name: "5", cells: {} },
        { top: size + 50, bottom: 2 * size + 50, size, name: "6", cells: {} }
      ]);
    });
    test("On addition after", () => {
      addRows(2, "after", 2);
      const size = DEFAULT_CELL_HEIGHT;
      expect(model.workbook.rows).toEqual([
        { top: 0, bottom: size, size, name: "1", cells: {} },
        { top: size, bottom: size + 10, size: 10, name: "2", cells: {} },
        { top: size + 10, bottom: size + 30, size: 20, name: "3", cells: {} },
        { top: size + 30, bottom: size + 50, size: 20, name: "4", cells: {} },
        { top: size + 50, bottom: size + 70, size: 20, name: "5", cells: {} },
        { top: size + 70, bottom: 2 * size + 70, size, name: "6", cells: {} }
      ]);
    });
  });

  describe("Correctly update merges", () => {
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 4,
            rowNumber: 5,
            merges: ["A1:A5", "B2:B5", "C3:C5", "D2:D4"]
          }
        ]
      });
    });
    test("On deletion", () => {
      removeRows([1, 3]);
      // As we remove rows by rows, the first ID is 9 because we
      // compute merges two times (*4 merges)
      expect(model.workbook.merges).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 2, left: 0, right: 0 },
        10: { id: 10, topLeft: "B2", top: 1, bottom: 2, left: 1, right: 1 },
        11: { id: 11, topLeft: "C2", top: 1, bottom: 2, left: 2, right: 2 }
      });
      expect(model.state.mergeCellMap).toEqual({
        A1: 9,
        A2: 9,
        A3: 9,
        B2: 10,
        B3: 10,
        C2: 11,
        C3: 11
      });
    });
    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(0, "after", 1);
      expect(model.workbook.merges).toEqual({
        9: { id: 9, topLeft: "A1", top: 0, bottom: 6, left: 0, right: 0 },
        10: { id: 10, topLeft: "B4", top: 3, bottom: 6, left: 1, right: 1 },
        11: { id: 11, topLeft: "C5", top: 4, bottom: 6, left: 2, right: 2 },
        12: { id: 12, topLeft: "D4", top: 3, bottom: 5, left: 3, right: 3 }
      });
      expect(model.state.mergeCellMap).toEqual({
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
        D6: 12
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
              C2: { style: 1, border: 1 },
              C4: { style: 1, border: 1 },
              D2: { style: 1, border: 1 }
            },
            merges: ["D2:D3"]
          }
        ],
        styles: { 1: { textColor: "#fe0000" } },
        borders: { 1: { top: ["thin", "#000"] } }
      });
    });
    test("On deletion", () => {
      removeRows([1]);
      expect(model.workbook.cells.A2).toBeUndefined();
      expect(model.workbook.cells.B2).toBeUndefined();
      expect(model.workbook.cells.C2).toBeUndefined();
      expect(model.workbook.cells).toMatchObject({
        A1: { style: 1 },
        A3: { style: 1 },
        B1: { border: 1 },
        B3: { border: 1 },
        C1: { style: 1, border: 1 },
        C3: { style: 1, border: 1 },
        D2: { style: 1, border: 1 }
      });
    });

    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(2, "after", 2);
      expect(model.workbook.cells).toMatchObject({
        A1: { style: 1 },
        B1: { border: 1 },
        C1: { style: 1, border: 1 },
        A2: { style: 1 },
        B2: { border: 1 },
        C2: { style: 1, border: 1 },
        D2: { style: 1 },
        A3: { style: 1 },
        B3: { border: 1 },
        C3: { style: 1, border: 1 },
        D3: { style: 1, border: 1 },
        A5: { style: 1 }
      });
      expect(Object.values(model.workbook.merges)[0]).toMatchObject({
        top: 2,
        bottom: 5,
        topLeft: "D3"
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
              D4: { content: "=C4" }
            }
          },
          {
            colNumber: 3,
            rowNumber: 1,
            cells: {
              A1: { content: "=A2" },
              B1: { content: "=Sheet1!A2" },
              C1: { content: "=Sheet2!A2" }
            }
          }
        ]
      });
    });

    test("On deletion", () => {
      removeRows([1, 2]);
      expect(model.workbook.sheets[0].cells).toMatchObject({
        A1: { content: "=#REF" },
        A2: { content: "=A1" },
        B1: { content: "=#REF" },
        B2: { content: "=B1" },
        C1: { content: "=Sheet2!A2" },
        C2: { content: "=A$3" },
        D2: { content: "=C2" }
      });
      expect(model.workbook.sheets[1].cells).toMatchObject({
        A1: { content: "=A2" },
        B1: { content: "=#REF" },
        C1: { content: "=Sheet2!A2" }
      });
    });
    test("On addition", () => {
      addRows(1, "before", 1);
      addRows(0, "after", 1);
      expect(model.workbook.sheets[0].cells).toMatchObject({
        A1: { content: "=A4" },
        A6: { content: "=A1" },
        B1: { content: "=Sheet1!A4" },
        B6: { content: "=B1" },
        C1: { content: "=Sheet2!A2" },
        C6: { content: "=A$7" },
        D6: { content: "=C6" }
      });
      expect(model.workbook.sheets[1].cells).toMatchObject({
        A1: { content: "=A2" },
        B1: { content: "=Sheet1!A4" },
        C1: { content: "=Sheet2!A2" }
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
});
