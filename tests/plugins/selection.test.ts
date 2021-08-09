import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, Increment } from "../../src/types";
import {
  activateSheet,
  addColumns,
  createSheet,
  deleteColumns,
  hideColumns,
  hideRows,
  redo,
  selectCell,
  setSelection,
  undo,
} from "../test_helpers/commands_helpers";
import { getActiveXc } from "../test_helpers/getters_helpers";

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
    selectCell(model, "A2");
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });

    selectCell(model, "J1");
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 9, top: 0, right: 9, bottom: 0 });
    selectCell(model, "A10");
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
    selectCell(model, "B1");

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
    selectCell(model, "B4");
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
    selectCell(model, "B3");
    expect(getActiveXc(model)).toBe("B3");

    // select right cell C3
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 3, left: 1, bottom: 2 });
  });

  test("extend selection through hidden columns", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 1,
          cols: { 2: { isHidden: true }, 3: { isHidden: true } },
        },
      ],
    });
    selectCell(model, "B1");
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1:E1"));
  });

  test("extend selection through hidden rows", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 5,
          rows: { 2: { isHidden: true }, 3: { isHidden: true } },
        },
      ],
    });
    selectCell(model, "A5");
    model.dispatch("ALTER_SELECTION", { delta: [0, -1] });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A2:A5"));
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
    expect(model.dispatch("SELECT_ROW", { index: -1 })).toBe(CommandResult.SelectionOutOfBound);
    expect(model.dispatch("SELECT_ROW", { index: 11 })).toBe(CommandResult.SelectionOutOfBound);
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
    expect(model.dispatch("SELECT_COLUMN", { index: -1 })).toBe(CommandResult.SelectionOutOfBound);
    expect(model.dispatch("SELECT_COLUMN", { index: 11 })).toBe(CommandResult.SelectionOutOfBound);
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

  test("invalid selection is updated after undo", () => {
    const model = new Model({
      sheets: [
        {
          id: "42",
          colNumber: 3,
          rowNumber: 3,
        },
      ],
    });
    addColumns(model, "after", "A", 1);
    selectCell(model, "D1");
    undo(model);
    expect(model.getters.getPosition()).toEqual([2, 0]);
    expect(model.getters.getSheetPosition("42")).toEqual([2, 0]);
  });

  test("invalid selection is updated after redo", () => {
    const model = new Model({
      sheets: [
        {
          id: "42",
          colNumber: 3,
          rowNumber: 3,
        },
      ],
    });
    deleteColumns(model, ["A"]);
    undo(model);
    selectCell(model, "C1");
    redo(model);
    expect(model.getters.getPosition()).toEqual([1, 0]);
    expect(model.getters.getSheetPosition("42")).toEqual([1, 0]);
  });
  test("cannot set a selection with an anchor zone not present in the zones provided", () => {
    const model = new Model();
    const zone = { top: 0, bottom: 0, left: 0, right: 0 };
    const anchorZone = { top: 1, bottom: 2, left: 1, right: 2 };
    const zones = [zone];
    const anchor: [number, number] = [1, 1];
    expect(model.dispatch("SET_SELECTION", { zones, anchor, anchorZone })).toBe(
      CommandResult.InvalidAnchorZone
    );
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
    selectCell(model, "C3");
    let selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual([2, 2]);
    model.dispatch("ALTER_SELECTION", { cell: [2, 3] });
    selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor).toEqual([2, 2]);

    // create new range
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "F3");
    selection = model.getters.getSelection();
    expect(selection.zones).toHaveLength(2);
    expect(selection.anchor).toEqual([5, 2]);
  });
});

describe("multiple sheets", () => {
  test("activating same sheet does not change selection", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    selectCell(model, "C3");
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);

    activateSheet(model, sheet1);
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
  });

  test("selection is restored when coming back to previous sheet", () => {
    const model = new Model();
    selectCell(model, "C3");
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    selectCell(model, "B2");
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2")]);

    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    activateSheet(model, sheet1);
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
    activateSheet(model, sheet2);
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

describe("Alter selection starting from hidden cells", () => {
  test("Cannot change selection if the current one is completely hidden", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 2,
        },
      ],
    });
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    hideRows(model, [0]);

    const alter1 = model.dispatch("ALTER_SELECTION", { delta: [0, 1] });
    expect(alter1).toBe(CommandResult.SelectionOutOfBound);
    const alter2 = model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(alter2).toBe(CommandResult.SelectionOutOfBound);
  });

  test("Cannot move position vertically from hidden column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 2,
        },
      ],
    });
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    const move1 = model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(move1).toBe(CommandResult.SelectionOutOfBound);
    const move2 = model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(move2).toBe(CommandResult.SelectionOutOfBound);
  });

  test.each([
    [["A"], "A1", 1, "A1:B1"],
    [["A", "B"], "A1", 1, "A1:C1"],
    [["A"], "A1", -1, "A1:B1"],
    [["A", "B"], "A1", -1, "A1:C1"],
    [["A", "B"], "B1", -1, "B1:C1"],

    [["Z"], "Z1", -1, "Y1:Z1"],
    [["Y", "Z"], "Z1", -1, "X1:Z1"],
    [["Z"], "Z1", 1, "Y1:Z1"],
    [["Y", "Z"], "Z1", 1, "X1:Z1"],
    [["Y", "Z"], "Y1", 1, "X1:Y1"],
  ])(
    "Alter selection horizontally from hidden col",
    (hiddenCols, startPosition, delta, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideColumns(model, hiddenCols);
      model.dispatch("ALTER_SELECTION", { delta: [delta as Increment, 0] });
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [["A"], "A1", 1, "A1"], // won't move
    [["A"], "A1:B1", 1, "A1:B2"],
    [["A", "B"], "A1:B1", 1, "A1:B1"], //won't move
    [["A", "C"], "A1:C1", 1, "A1:C2"],
  ])(
    "Alter selection vertically from hidden col needs at least one visible selected cell",
    (hiddenCols, startPosition, delta, endPosition) => {
      const model = new Model();
      setSelection(model, [startPosition]);
      hideColumns(model, hiddenCols);
      model.dispatch("ALTER_SELECTION", { delta: [0, delta as Increment] });
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [[0], "A1", 1, "A1:A2"],
    [[0, 1], "A1", 1, "A1:A3"],
    [[0], "A1", -1, "A1:A2"],
    [[0, 1], "A1", -1, "A1:A3"],
    [[0, 1], "A2", -1, "A2:A3"],

    [[99], "A100", -1, "A99:A100"],
    [[98, 99], "A100", -1, "A98:A100"],
    [[99], "A100", 1, "A99:A100"],
    [[98, 99], "A100", 1, "A98:A100"],
    [[98, 99], "A99", 1, "A98:A99"],
  ])(
    "Alter selection vertically from hidden col",
    (hiddenRows, startPosition, delta, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideRows(model, hiddenRows);
      model.dispatch("ALTER_SELECTION", { delta: [0, delta as Increment] });
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [[0], "A1", 1, "A1"], // won't move
    [[0], "A1:A2", 1, "A1:B2"],
    [[0, 1], "A1:A2", 1, "A1:A2"], // won't move
    [[0, 2], "A1:A3", 1, "A1:B3"],
  ])(
    "Alter selection horizontally from hidden col",
    (hiddenRows, startPosition, delta, endPosition) => {
      const model = new Model();
      setSelection(model, [startPosition]);
      hideRows(model, hiddenRows);
      model.dispatch("ALTER_SELECTION", { delta: [delta as Increment, 0] });
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );
});
