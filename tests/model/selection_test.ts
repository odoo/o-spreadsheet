import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import "../canvas.mock";

describe("selection", () => {
  test("if A1 is in a merge, it is initially properly selected", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ]
    });
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 2 });
  });

  test("can select selection with shift-arrow", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.moveSelection(1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("can grow/shrink selection with shift-arrow", () => {
    const model = new GridModel();

    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.moveSelection(1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 0 });
    model.moveSelection(-1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  test("cannot expand select selection with shift-arrow if it is out of bound", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
    model.moveSelection(0, -1);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    model.moveSelection(0, -1);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });

    model.dispatch({ type: "SELECT_CELL", col: 9, row: 0 });
    model.moveSelection(1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 9, top: 0, right: 9, bottom: 0 });
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 9 });
    model.moveSelection(0, 1);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 9, right: 0, bottom: 9 });
  });

  test("can expand selection with mouse", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.updateSelection(1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("move selection in and out of a merge (in opposite direction)", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["C1:D2"]
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 0 });

    // move to the right, inside the merge
    model.moveSelection(1, 0);

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 3, left: 1, bottom: 1 });
    expect(model.workbook.activeXc).toBe("B1");

    // move to the left, outside the merge
    model.moveSelection(-1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 1 });
    expect(model.workbook.activeXc).toBe("B1");
  });

  test("update selection in some different directions", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B2:C3"]
        }
      ]
    });
    // move sell to B4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 3 });
    expect(model.workbook.activeXc).toBe("B4");

    // move up, inside the merge
    model.moveSelection(0, -1);

    expect(model.workbook.selection.zones[0]).toEqual({ top: 1, right: 2, left: 1, bottom: 3 });

    // move to the left, outside the merge
    model.moveSelection(-1, 0);
    expect(model.workbook.selection.zones[0]).toEqual({ top: 1, right: 2, left: 0, bottom: 3 });
  });

  test("expand selection when encountering a merge", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B2:B3", "C2:D2"]
        }
      ]
    });
    // move sell to B4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 2 });
    expect(model.workbook.activeXc).toBe("B3");

    // select right cell C3
    model.updateSelection(2, 2);

    expect(model.workbook.selection.zones[0]).toEqual({ top: 1, right: 3, left: 1, bottom: 2 });
  });

  test("can select a whole column", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.selectColumn(4, false);
    expect(model.workbook.activeXc).toBe("E1");

    expect(model.workbook.selection.zones[0]).toEqual({ left: 4, top: 0, right: 4, bottom: 9 });
  });

  test("can select a whole row", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.selectRow(4, false);
    expect(model.workbook.activeXc).toBe("A5");

    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 4, right: 9, bottom: 4 });
  });

  test("can select the whole sheet", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.selectAll();
    expect(model.workbook.activeXc).toBe("A1");

    expect(model.workbook.selection.zones[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
  });

  test("can select part of a formula", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    expect(model.workbook.activeXc).toBe("C3");
    model.workbook.isSelectingRange = true;
    model.dispatch({ type: "SELECT_CELL", col: 3, row: 3 });
    expect(model.workbook.activeXc).toBe("C3"); // active cell is not modified but the selection is

    expect(model.workbook.selection).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }]
    });
  });

  test("extend selection works based on selection anchor, not active cell", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });

    model.workbook.isSelectingRange = true;
    model.dispatch({ type: "SELECT_CELL", col: 3, row: 3 });
    model.updateSelection(4, 4);

    expect(model.workbook.activeXc).toBe("C3"); // active cell is not modified but the selection is
    expect(model.workbook.activeCol).toBe(2);
    expect(model.workbook.activeRow).toBe(2);
    expect(model.workbook.selection).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 4, bottom: 4 }]
    });
  });
  test("make selection works based on selection anchor, not active cell", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });

    model.workbook.isSelectingRange = true;
    model.dispatch({ type: "SELECT_CELL", col: 3, row: 3 });

    model.moveSelection(0, 1);
    model.moveSelection(0, -1);

    expect(model.workbook.activeXc).toBe("A1"); // active cell is not modified but the selection is
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.selection).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }]
    });
  });
});

describe("multiple selections", () => {
  test("can select a new range", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    const state = model.workbook;
    expect(state.selection.zones.length).toBe(1);
    expect(state.selection.anchor).toEqual({ col: 2, row: 2 });
    model.updateSelection(2, 3);
    expect(state.selection.zones.length).toBe(1);
    expect(state.selection.anchor).toEqual({ col: 2, row: 2 });

    // create new range
    model.dispatch({ type: "SELECT_CELL", col: 5, row: 2, createNewRange: true });
    expect(state.selection.zones.length).toBe(2);
    expect(state.selection.anchor).toEqual({ col: 5, row: 2 });
  });
});
