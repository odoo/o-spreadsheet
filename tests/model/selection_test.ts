import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import "../canvas.mock";

describe("selection", () => {
  test("if A1 is in a merge, it is initially properly selected", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ]
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 2 });
  });

  test("can select selection with shift-arrow", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("can grow/shrink selection with shift-arrow", () => {
    const model = new Model();

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 0 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  test("cannot expand select selection with shift-arrow if it is out of bound", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });

    model.dispatch({ type: "SELECT_CELL", col: 9, row: 0 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 9, top: 0, right: 9, bottom: 0 });
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 9 });
    model.dispatch({ type: "ALTER_SELECTION", delta: [0, 1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 9, right: 0, bottom: 9 });
  });

  test("can expand selection with mouse", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("move selection in and out of a merge (in opposite direction)", () => {
    const model = new Model({
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
    model.dispatch({ type: "ALTER_SELECTION", delta: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 3, left: 1, bottom: 1 });
    expect(model.getters.getActiveXc()).toBe("B1");

    // move to the left, outside the merge
    model.dispatch({ type: "ALTER_SELECTION", delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 1 });
    expect(model.getters.getActiveXc()).toBe("B1");
  });

  test("update selection in some different directions", () => {
    const model = new Model({
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
    expect(model.getters.getActiveXc()).toBe("B4");

    // move up, inside the merge
    model.dispatch({ type: "ALTER_SELECTION", delta: [0, -1] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 1, bottom: 3 });

    // move to the left, outside the merge
    model.dispatch({ type: "ALTER_SELECTION", delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 0, bottom: 3 });
  });

  test("expand selection when encountering a merge", () => {
    const model = new Model({
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
    expect(model.getters.getActiveXc()).toBe("B3");

    // select right cell C3
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 2] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 3, left: 1, bottom: 2 });
  });

  test("can select a whole column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_COLUMN", index: 4 });
    expect(model.getters.getActiveXc()).toBe("E1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 4, top: 0, right: 4, bottom: 9 });
  });

  test("can select a whole column with a merged cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B1"]
        }
      ]
    });
    model.dispatch({ type: "SELECT_COLUMN", index: 0 });
    expect(model.getters.getActiveXc()).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 9 });
  });

  test("can select a whole row", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });

    model.dispatch({ type: "SELECT_ROW", index: 4 });
    expect(model.getters.getActiveXc()).toBe("A5");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 4, right: 9, bottom: 4 });
  });

  test("can select a whole row with a merged cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:A2"]
        }
      ]
    });

    model.dispatch({ type: "SELECT_ROW", index: 0 });
    expect(model.getters.getActiveXc()).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 0 });
  });

  test("can select the whole sheet", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_ALL" });
    expect(model.getters.getActiveXc()).toBe("A1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
  });

  test("can select part of a formula", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    expect(model.getters.getActiveXc()).toBe("C3");
    model.workbook.isSelectingRange = true;
    model.dispatch({ type: "SELECT_CELL", col: 3, row: 3 });
    expect(model.getters.getActiveXc()).toBe("C3"); // active cell is not modified but the selection is

    expect(model.getters.getSelection()).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }]
    });
  });

  test("extend selection works based on selection anchor, not active cell", () => {
    const model = new Model({
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
    model.dispatch({ type: "ALTER_SELECTION", cell: [4, 4] });

    expect(model.getters.getActiveXc()).toBe("C3"); // active cell is not modified but the selection is
    expect(model.getters.getPosition()).toEqual([2, 2]);
    expect(model.getters.getSelection()).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 4, bottom: 4 }]
    });
  });
  test("make selection works based on selection anchor, not active cell", () => {
    const model = new Model();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });

    model.workbook.isSelectingRange = true;
    model.dispatch({ type: "SELECT_CELL", col: 3, row: 3 });

    model.dispatch({ type: "ALTER_SELECTION", delta: [0, 1] });
    model.dispatch({ type: "ALTER_SELECTION", delta: [0, -1] });

    expect(model.getters.getActiveXc()).toBe("A1"); // active cell is not modified but the selection is
    expect(model.getters.getPosition()).toEqual([0, 0]);
    expect(model.getters.getSelection()).toEqual({
      anchor: { col: 3, row: 3 },
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }]
    });
  });
});

describe("multiple selections", () => {
  test("can select a new range", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    let selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual({ col: 2, row: 2 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 3] });
    selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual({ col: 2, row: 2 });

    // create new range
    model.dispatch({ type: "SELECT_CELL", col: 5, row: 2, createNewRange: true });
    selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(2);
    expect(selection.anchor).toEqual({ col: 5, row: 2 });
  });
});

describe("multiple sheets", () => {
  test("activating same sheet does not change selection", () => {
    const model = new Model();
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);

    model.dispatch({ type: "ACTIVATE_SHEET", sheet: "Sheet1" });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
  });
});
