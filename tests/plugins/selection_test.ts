import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { CancelledReason } from "../../src/types";
import "../canvas.mock";
import { createSheet, selectCell } from "../commands_helpers";
import { getActiveXc } from "../getters_helpers";

describe("selection", () => {
  test("if A1 is in a merge, it is initially properly selected", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"],
        },
      ],
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 2 });
  });

  test("can select selection with shift-arrow", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"],
        },
      ],
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("can grow/shrink selection with shift-arrow", () => {
    const model = new Model();

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 0 });
    model.dispatch("ALTER_SELECTION", { delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  test("cannot expand select selection with shift-arrow if it is out of bound", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });

    model.dispatch("SELECT_CELL", { col: 9, row: 0 });
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 9, top: 0, right: 9, bottom: 0 });
    model.dispatch("SELECT_CELL", { col: 0, row: 9 });
    model.dispatch("ALTER_SELECTION", { delta: [0, 1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 9, right: 0, bottom: 9 });
  });

  test("can expand selection with mouse", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"],
        },
      ],
    });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("move selection in and out of a merge (in opposite direction)", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["C1:D2"],
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });

    // move to the right, inside the merge
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 3, left: 1, bottom: 1 });
    expect(getActiveXc(model)).toBe("B1");

    // move to the left, outside the merge
    model.dispatch("ALTER_SELECTION", { delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 1 });
    expect(getActiveXc(model)).toBe("B1");
  });

  test("update selection in some different directions", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B2:C3"],
        },
      ],
    });
    // move sell to B4
    model.dispatch("SELECT_CELL", { col: 1, row: 3 });
    expect(getActiveXc(model)).toBe("B4");

    // move up, inside the merge
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 1, bottom: 3 });

    // move to the left, outside the merge
    model.dispatch("ALTER_SELECTION", { delta: [-1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 0, bottom: 3 });
  });

  test("expand selection when encountering a merge", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B2:B3", "C2:D2"],
        },
      ],
    });
    // move sell to B4
    model.dispatch("SELECT_CELL", { col: 1, row: 2 });
    expect(getActiveXc(model)).toBe("B3");

    // select right cell C3
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 3, left: 1, bottom: 2 });
  });

  test("can select a whole column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_COLUMN", { index: 4 });
    expect(getActiveXc(model)).toBe("E1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 4, top: 0, right: 4, bottom: 9 });
  });

  test("can select a whole column with a merged cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B1"],
        },
      ],
    });
    model.dispatch("SELECT_COLUMN", { index: 0 });
    expect(getActiveXc(model)).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 9 });
  });

  test("can select a whole row", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });

    model.dispatch("SELECT_ROW", { index: 4 });
    expect(getActiveXc(model)).toBe("A5");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 4, right: 9, bottom: 4 });
  });

  test("can select a whole row with a merged cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:A2"],
        },
      ],
    });

    model.dispatch("SELECT_ROW", { index: 0 });
    expect(getActiveXc(model)).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 0 });
  });

  test("cannot select out of bound row", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(model.dispatch("SELECT_ROW", { index: -1 })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.SelectionOutOfBound,
    });
    expect(model.dispatch("SELECT_ROW", { index: 11 })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.SelectionOutOfBound,
    });
  });

  test("cannot select out of bound column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(model.dispatch("SELECT_COLUMN", { index: -1 })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.SelectionOutOfBound,
    });
    expect(model.dispatch("SELECT_COLUMN", { index: 11 })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.SelectionOutOfBound,
    });
  });

  test("can select the whole sheet", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_ALL");
    expect(getActiveXc(model)).toBe("A1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
  });

  test("can select part of a formula", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    expect(getActiveXc(model)).toBe("C3");
    model.dispatch("START_EDITION", { text: "=" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    model.dispatch("SELECT_CELL", { col: 3, row: 3 });
    expect(getActiveXc(model)).toBe("C3"); // active cell is not modified but the selection is

    expect(model.getters.getSelection()).toEqual({
      anchor: [3, 3],
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }],
    });
  });

  test("extend selection works based on selection anchor, not active cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });

    model.dispatch("START_EDITION", { text: "=" });
    model.dispatch("SELECT_CELL", { col: 3, row: 3 });
    model.dispatch("ALTER_SELECTION", { cell: [4, 4] });

    expect(getActiveXc(model)).toBe("C3"); // active cell is not modified but the selection is
    expect(model.getters.getPosition()).toEqual([2, 2]);
    expect(model.getters.getSelection()).toEqual({
      anchor: [3, 3],
      zones: [{ left: 3, top: 3, right: 4, bottom: 4 }],
    });
  });
  test("make selection works based on selection anchor, not active cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });

    model.dispatch("START_EDITION", { text: "=" });
    model.dispatch("SELECT_CELL", { col: 3, row: 3 });

    model.dispatch("ALTER_SELECTION", { delta: [0, 1] });
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });

    expect(getActiveXc(model)).toBe("A1"); // active cell is not modified but the selection is
    expect(model.getters.getPosition()).toEqual([0, 0]);
    expect(model.getters.getSelection()).toEqual({
      anchor: [3, 3],
      zones: [{ left: 3, top: 3, right: 3, bottom: 3 }],
    });
  });
});

describe("multiple selections", () => {
  test("can select a new range", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    let selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual([2, 2]);
    model.dispatch("ALTER_SELECTION", { cell: [2, 3] });
    selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual([2, 2]);

    // create new range
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 5, row: 2 });
    selection = model.getters.getSelection();
    expect(selection.zones).toHaveLength(2);
    expect(selection.anchor).toEqual([5, 2]);
  });
});

describe("multiple sheets", () => {
  test("activating same sheet does not change selection", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);

    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet1, sheetIdTo: sheet1 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
  });

  test("selection is restored when coming back to previous sheet", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2")]);

    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet1, sheetIdTo: sheet2 });
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2")]);
  });

  test("Selection is updated when deleting the active sheet", () => {
    const model = new Model();
    selectCell(model, "B2");
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    model.dispatch("DELETE_SHEET", { sheetId });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(model.getters.getActiveSheetId()).toBe("42");
  });
});
