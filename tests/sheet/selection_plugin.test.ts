import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import {
  numberToLetters,
  positionToZone,
  toCartesian,
  toXC,
  toZone,
  zoneToXc,
} from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, Direction } from "../../src/types";
import {
  activateSheet,
  addCellToSelection,
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  hideColumns,
  hideRows,
  merge,
  moveAnchorCell,
  moveColumns,
  moveRows,
  redo,
  resizeAnchorZone,
  resizeColumns,
  resizeRows,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  setAnchorCorner,
  setCellContent,
  setSelection,
  setViewportOffset,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getActivePosition,
  getCellContent,
  getSelectionAnchorCellXc,
} from "../test_helpers/getters_helpers";

let model: Model;
const hiddenContent = "hidden content to be skipped";
describe("simple selection", () => {
  test("if A1 is in a merge, it is initially properly selected", () => {
    const model = new Model({ sheets: [{ merges: ["A1:B3"] }] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 2 });
  });

  test("Adding a cell of a merge in the selection adds the whole merge", () => {
    const model = new Model({ sheets: [{ merges: ["A2:B3"] }] });

    expect(model.getters.getSelectedZones()).toEqual([{ left: 0, top: 0, right: 0, bottom: 0 }]);
    addCellToSelection(model, "A2");
    expect(model.getters.getSelectedZones()).toEqual([
      { left: 0, top: 0, right: 0, bottom: 0 },
      { left: 0, top: 1, right: 1, bottom: 2 },
    ]);
  });

  test("can select selection with shift-arrow", () => {
    const model = new Model({ sheets: [{ merges: ["B1:C2"] }] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("can grow/shrink selection with shift-arrow", () => {
    const model = new Model();
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 1, bottom: 0 });
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  test("cannot expand select selection with shift-arrow if it is out of bound", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    selectCell(model, "A2");
    resizeAnchorZone(model, "up");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    resizeAnchorZone(model, "up");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });

    selectCell(model, "J1");
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 9, top: 0, right: 9, bottom: 0 });
    selectCell(model, "A10");
    resizeAnchorZone(model, "down");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 9, right: 0, bottom: 9 });
  });

  test("can expand selection with mouse", () => {
    const model = new Model({ sheets: [{ merges: ["B1:C2"] }] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    setAnchorCorner(model, "B1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("move selection in and out of a merge (in opposite direction)", () => {
    const model = new Model({ sheets: [{ merges: ["C1:D2"] }] });
    selectCell(model, "B1");

    // move to the right, inside the merge
    resizeAnchorZone(model, "right");

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 3, left: 1, bottom: 1 });
    expect(getSelectionAnchorCellXc(model)).toBe("B1");

    // move to the left, outside the merge
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 1 });
    expect(getSelectionAnchorCellXc(model)).toBe("B1");
  });

  test("select a cell outside the sheet", () => {
    const model = new Model({ sheets: [{ colNumber: 3, rowNumber: 3 }] });
    selectCell(model, "D4");
    const A1Zone = toZone("A1");
    expect(model.getters.getSelection()).toEqual({
      anchor: {
        zone: A1Zone,
        cell: { col: A1Zone.left, row: A1Zone.top },
      },
      zones: [A1Zone],
    });
    expect(getActivePosition(model)).toBe("A1");
  });
  test("update selection in some different directions", () => {
    const model = new Model({ sheets: [{ merges: ["B2:C3"] }] });
    // move sell to B4
    selectCell(model, "B4");
    expect(getSelectionAnchorCellXc(model)).toBe("B4");

    // move up, inside the merge
    resizeAnchorZone(model, "up");

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 1, bottom: 3 });

    // move to the left, outside the merge
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 1, right: 2, left: 0, bottom: 3 });
  });

  test("expand selection when encountering a merge", () => {
    const model = new Model({ sheets: [{ merges: ["B2:B3", "C2:D2"] }] });
    // move sell to B4
    selectCell(model, "B3");
    expect(getSelectionAnchorCellXc(model)).toBe("B3");

    // select right cell C3
    setAnchorCorner(model, "C3");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B2:D3"));
  });

  test("expand selection when starting from a merge", () => {
    const model = new Model({ sheets: [{ merges: ["B2:B3", "E2:G2"] }] });
    selectCell(model, "B2");
    resizeAnchorZone(model, "down");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B2:B4"));

    selectCell(model, "B2");
    resizeAnchorZone(model, "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1:B3"));

    selectCell(model, "B3");
    resizeAnchorZone(model, "down");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B2:B4"));

    selectCell(model, "B3");
    resizeAnchorZone(model, "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1:B3"));

    selectCell(model, "E2");
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone("E2:H2"));

    selectCell(model, "E2");
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("D2:G2"));

    selectCell(model, "G2");
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone("E2:H2"));

    selectCell(model, "G2");
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("D2:G2"));
  });

  test("extend and reduce selection through hidden columns", () => {
    const model = new Model({
      sheets: [{ cols: { 2: { isHidden: true }, 3: { isHidden: true } } }],
    });
    selectCell(model, "B1");
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1:E1"));
    resizeAnchorZone(model, "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1"));
  });

  test("extend and reduce selection through hidden rows", () => {
    const model = new Model({
      sheets: [{ rows: { 2: { isHidden: true }, 3: { isHidden: true } } }],
    });
    selectCell(model, "A5");
    resizeAnchorZone(model, "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A2:A5"));
    resizeAnchorZone(model, "down");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A5"));
  });

  test("move selection left through hidden cols, with scrolling", () => {
    const model = new Model({ sheets: [{ colNumber: 100, rowNumber: 1 }] });
    hideColumns(model, ["B"]);
    selectCell(model, "C1");
    setViewportOffset(model, DEFAULT_CELL_WIDTH, 0);

    moveAnchorCell(model, "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({ scrollX: 0, scrollY: 0 });
  });

  test("move selection right through hidden cols, with scrolling", () => {
    const model = new Model({ sheets: [{ colNumber: 100, rowNumber: 1 }] });
    const visibleCols = model.getters.getSheetViewVisibleCols();
    const lastVisibleCol = visibleCols[visibleCols.length - 1];
    hideColumns(model, [numberToLetters(lastVisibleCol + 1), numberToLetters(lastVisibleCol + 2)]);
    selectCell(model, toXC(lastVisibleCol, 0));
    moveAnchorCell(model, "right");

    expect(model.getters.getSelectedZone()).toEqual(toZone(toXC(lastVisibleCol + 3, 0)));
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });
  });

  test("move selection up through hidden rows, with scrolling", () => {
    const model = new Model({ sheets: [{ colNumber: 1, rowNumber: 100 }] });
    hideRows(model, [1]);
    selectCell(model, "A3");
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);

    moveAnchorCell(model, "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({ scrollX: 0, scrollY: 0 });
  });

  test("move selection down through hidden cols, with scrolling", () => {
    const model = new Model({ sheets: [{ colNumber: 1, rowNumber: 100 }] });
    const visibleRows = model.getters.getSheetViewVisibleRows();
    const lastVisibleRow = visibleRows[visibleRows.length - 1];
    hideRows(model, [lastVisibleRow + 1, lastVisibleRow + 2]);
    selectCell(model, toXC(0, lastVisibleRow));

    moveAnchorCell(model, "down");
    expect(model.getters.getSelectedZone()).toEqual(toZone(toXC(0, lastVisibleRow + 3)));
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });
  });

  test("can select a whole column", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection");

    expect(getSelectionAnchorCellXc(model)).toBe("E1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 4, top: 0, right: 4, bottom: 9 });
  });

  test("can select a whole column with a merged cell", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B1"] }] });
    selectColumn(model, 0, "overrideSelection");

    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 0, bottom: 9 });
  });

  test("selection is clipped to sheet size", () => {
    const model = new Model({ sheets: [{ colNumber: 3, rowNumber: 3 }] });
    setSelection(model, ["A1:Z20"]);
    const zone = toZone("A1:C3");
    expect(model.getters.getSelection()).toEqual({
      anchor: { cell: { col: 0, row: 0 }, zone },
      zones: [zone],
    });
  });

  test("can select a whole row", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });

    selectRow(model, 4, "overrideSelection");
    expect(getSelectionAnchorCellXc(model)).toBe("A5");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 4, right: 9, bottom: 4 });
  });

  test("can select a whole row with a merged cell", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }] });

    selectRow(model, 0, "overrideSelection");
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 0 });
  });

  test("cannot select out of bound row", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    expect(selectRow(model, -1, "overrideSelection")).toBeCancelledBecause(
      CommandResult.SelectionOutOfBound
    );
    expect(selectRow(model, 11, "overrideSelection")).toBeCancelledBecause(
      CommandResult.SelectionOutOfBound
    );
  });

  test("cannot select out of bound column", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    expect(selectColumn(model, -1, "overrideSelection")).toBeCancelledBecause(
      CommandResult.SelectionOutOfBound
    );
    expect(selectColumn(model, 11, "overrideSelection")).toBeCancelledBecause(
      CommandResult.SelectionOutOfBound
    );
  });

  test("can select the whole sheet", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    selectAll(model);
    expect(getSelectionAnchorCellXc(model)).toBe("A1");

    expect(model.getters.getSelectedZones()[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
  });

  test("invalid selection is updated after undo", () => {
    const model = new Model({ sheets: [{ id: "42", colNumber: 3, rowNumber: 3 }] });
    addColumns(model, "after", "A", 1);
    selectCell(model, "D1");
    undo(model);
    expect(getActivePosition(model)).toBe("C1");
    expect(model.getters.getSheetPosition("42")).toEqual({ sheetId: "42", ...toCartesian("C1") });
  });

  test("invalid selection is updated after redo", () => {
    const model = new Model({ sheets: [{ id: "42", colNumber: 3, rowNumber: 3 }] });
    deleteColumns(model, ["A"]);
    undo(model);
    selectCell(model, "C1");
    redo(model);
    expect(getActivePosition(model)).toBe("B1");
    expect(model.getters.getSheetPosition("42")).toEqual({ sheetId: "42", ...toCartesian("B1") });
  });

  test("initial revision adding a column before A does not shift the selection", () => {
    const data = {
      sheets: [{ id: "sheet1" }],
      revisionId: "initialRevision",
    };
    const model = new Model(data, {}, [
      {
        type: "REMOTE_REVISION",
        nextRevisionId: "1",
        serverRevisionId: "initialRevision",
        commands: [
          {
            type: "ADD_COLUMNS_ROWS",
            sheetId: "sheet1",
            dimension: "COL",
            position: "before",
            base: 0,
            quantity: 1,
          },
        ],
        clientId: "1",
        version: 1,
      },
    ]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
  });

  test("Select a merge when its topLeft column is hidden", () => {
    const model = new Model({
      sheets: [{ colNumber: 3, rowNumber: 2, merges: ["A1:B2"], cols: { 0: { isHidden: true } } }],
    });
    selectCell(model, "B1");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:B2"));
    selectCell(model, "C2");
    moveAnchorCell(model, "left");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:B2"));
  });

  test("Select a merge when its topLeft row is hidden", () => {
    const model = new Model({
      sheets: [{ merges: ["A1:B2"], rows: { 0: { isHidden: true } } }],
    });
    selectCell(model, "A2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:B2"));
    selectCell(model, "A3");
    moveAnchorCell(model, "up");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:B2"));
  });

  test("Selecting figure and undo cleanup selectedFigureId in selection plugin", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });
    expect(model.getters.getSelectedFigureId()).toBe(null);
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    undo(model);
    expect(model.getters.getSelectedFigureId()).toBe(null);
  });
});

describe("multiple selections", () => {
  test("can select a new range", () => {
    const model = new Model();
    selectCell(model, "C3");
    let selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor.cell).toEqual(toCartesian("C3"));
    setAnchorCorner(model, "C4");
    selection = model.getters.getSelection();
    expect(selection.zones.length).toBe(1);
    expect(selection.anchor.cell).toEqual(toCartesian("C3"));

    // create new range
    addCellToSelection(model, "F3");
    selection = model.getters.getSelection();
    expect(selection.zones).toHaveLength(2);
    expect(selection.anchor.cell).toEqual(toCartesian("F3"));
  });
});

describe("multiple sheets", () => {
  test("activating same sheet does not change selection", () => {
    const model = new Model();
    const sheet1 = model.getters.getSheetIds()[0];
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

    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    activateSheet(model, sheet1);
    expect(model.getters.getSelectedZones()).toEqual([toZone("C3")]);
    activateSheet(model, sheet2);
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2")]);
  });

  test("Selection is updated when deleting the active sheet", () => {
    const model = new Model();
    selectCell(model, "B2");
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createSheet(model, { sheetId: secondSheetId, activate: true });
    selectCell(model, "C4");
    activateSheet(model, firstSheetId);
    model.dispatch("DELETE_SHEET", { sheetId: firstSheetId });
    expect(model.getters.getSelectedZone()).toEqual(toZone("C4"));
    expect(model.getters.getActiveSheetId()).toBe(secondSheetId);
    moveAnchorCell(model, "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone("D4"));
    expect(model.getters.getActiveSheetId()).toBe(secondSheetId);
  });

  test("Do not share selections between sheets", () => {
    const model = new Model();
    selectCell(model, "B2");
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    selectCell(model, "C4");
    activateSheet(model, sheetId);
    // any action that can be undone
    createSheet(model, { sheetId: "test to undo" });
    undo(model);
    expect(model.getters.getSheetPosition(sheetId)).toEqual({ sheetId, ...toCartesian("B2") });
    expect(model.getters.getSheetPosition("42")).toEqual({ sheetId: "42", ...toCartesian("C4") });
  });

  test("Activating an unvisited sheet selects its first visible cell", () => {
    const model = new Model({
      sheets: [
        { sheetId: "Sheet1" },
        {
          sheetId: "Sheet2",
          cols: { 0: { isHidden: true }, 1: { isHidden: true } },
          rows: { 0: { isHidden: true } },
          merges: ["C2:C3"],
        },
      ],
    });
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
    activateSheet(model, "Sheet2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("C2:C3"));
  });
});

describe("Alter selection starting from hidden cells", () => {
  test("Cannot change selection if the current one is completely hidden", () => {
    const model = new Model();
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    hideRows(model, [0]);

    const alter1 = resizeAnchorZone(model, "down");
    expect(alter1).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
    const alter2 = resizeAnchorZone(model, "right");
    expect(alter2).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
  });

  test("Cannot move position vertically from hidden column", () => {
    const model = new Model();
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    const move1 = moveAnchorCell(model, "down");
    expect(move1).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
    const move2 = moveAnchorCell(model, "up");
    expect(move2).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
  });

  test.each([
    [["A"], "A1", "right", "A1:B1"],
    [["A", "B"], "A1", "right", "A1:C1"],
    [["A"], "A1", "left", "A1:B1"],
    [["A", "B"], "A1", "left", "A1:C1"],
    [["A", "B"], "B1", "left", "B1:C1"],

    [["Z"], "Z1", "left", "Y1:Z1"],
    [["Y", "Z"], "Z1", "left", "X1:Z1"],
    [["Z"], "Z1", "right", "Y1:Z1"],
    [["Y", "Z"], "Z1", "right", "X1:Z1"],
    [["Y", "Z"], "Y1", "right", "X1:Y1"],
  ])(
    "Alter selection horizontally from hidden col",
    (hiddenCols, startPosition, direction, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideColumns(model, hiddenCols);
      resizeAnchorZone(model, direction as Direction);
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [["A"], "A1", "A1"], // won't move
    [["A"], "A1:B1", "A1:B2"],
    [["A", "B"], "A1:B1", "A1:B1"], //won't move
    [["A", "C"], "A1:C1", "A1:C2"],
  ])(
    "Alter selection vertically from hidden col needs at least one visible selected cell",
    (hiddenCols, startPosition, endPosition) => {
      const model = new Model();
      setSelection(model, [startPosition]);
      hideColumns(model, hiddenCols);
      resizeAnchorZone(model, "down");
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [[0], "A1", "down", "A1:A2"],
    [[0, 1], "A1", "down", "A1:A3"],
    [[0], "A1", "up", "A1:A2"],
    [[0, 1], "A1", "up", "A1:A3"],
    [[0, 1], "A2", "up", "A2:A3"],

    [[99], "A100", "up", "A99:A100"],
    [[98, 99], "A100", "up", "A98:A100"],
    [[99], "A100", "down", "A99:A100"],
    [[98, 99], "A100", "down", "A98:A100"],
    [[98, 99], "A99", "down", "A98:A99"],
  ])(
    "Alter selection vertically from hidden col",
    (hiddenRows, startPosition, direction, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideRows(model, hiddenRows);
      resizeAnchorZone(model, direction as Direction);
      expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
    }
  );

  test.each([
    [[0], "A1", "A1"], // won't move
    [[0], "A1:A2", "A1:B2"],
    [[0, 1], "A1:A2", "A1:A2"], // won't move
    [[0, 2], "A1:A3", "A1:B3"],
  ])("Alter selection horizontally from hidden col", (hiddenRows, startPosition, endPosition) => {
    const model = new Model();
    setSelection(model, [startPosition]);
    hideRows(model, hiddenRows);
    resizeAnchorZone(model, "right");
    expect(model.getters.getSelectedZone()).toEqual(toZone(endPosition));
  });
});

describe("Change selection to sheet extremities", () => {
  test.each([
    [[], [], "F10", "left", "A10"],
    [["A"], [], "F10", "left", "B10"],
    [[], [], "F10", "right", "Z10"],
    [["Z", "Y"], [], "F10", "right", "X10"],
    [["A"], ["B1:C20"], "F10", "left", "B1:C20"],
  ])(
    "Move selection horizontally to sheet extremities",
    (hiddenCols, merges, selection, direction, result) => {
      const model = new Model();
      selectCell(model, selection);
      for (const mergeXc of merges) {
        merge(model, mergeXc);
      }
      hideColumns(model, hiddenCols);
      moveAnchorCell(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(result));
    }
  );

  test.each([
    [[], [], "F10", "up", "F1"],
    [[0], [], "F10", "up", "F2"],
    [[], [], "F10", "down", "F100"],
    [[99, 98], [], "F10", "down", "F98"],
    [[0], ["A2:G3"], "F10", "up", "A2:G3"],
  ])(
    "Move selection vertically to sheet extremities",
    (hiddenRows, merges, selection, direction, result) => {
      const model = new Model();
      selectCell(model, selection);
      for (const mergeXc of merges) {
        merge(model, mergeXc);
      }
      hideRows(model, hiddenRows);
      moveAnchorCell(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(result));
    }
  );

  test.each([
    [[], [], "F10", "left", "A10:F10"],
    [["A"], [], "F10", "left", "B10:F10"],
    [[], [], "F10", "right", "F10:Z10"],
    [["Z", "Y"], [], "F10", "right", "F10:X10"],
    [["A"], ["B1:C20"], "F10", "left", "B1:F20"],
  ])(
    "Alter selection horizontally to sheet extremities",
    (hiddenCols, merges, selection, direction, result) => {
      const model = new Model();
      selectCell(model, selection);
      for (const mergeXc of merges) {
        merge(model, mergeXc);
      }
      hideColumns(model, hiddenCols);
      resizeAnchorZone(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(result));
    }
  );

  test.each([
    [[], [], "F10", "up", "F1:F10"],
    [[0], [], "F10", "up", "F2:F10"],
    [[], [], "F10", "down", "F10:F100"],
    [[99, 98], [], "F10", "down", "F10:F98"],
    [[0], ["A2:G3"], "F10", "up", "A2:G10"],
  ])(
    "Alter selection vertically to sheet extremities",
    (hiddenRows, merges, selection, direction, result) => {
      const model = new Model();
      selectCell(model, selection);
      for (const mergeXc of merges) {
        merge(model, mergeXc);
      }
      hideRows(model, hiddenRows);
      resizeAnchorZone(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(result));
    }
  );
});

describe("Change selection to next clusters", () => {
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          colNumber: 9,
          rowNumber: 16,
          cols: { 4: { isHidden: true } },
          rows: { 8: { isHidden: true } },
          // prettier-ignore
          cells: {
                                B2: "content" ,                                                 E2: hiddenContent,                     G2: "same line as merge topLeft",
                                                                                                E3: hiddenContent,                     G3: "line of merge but aligned with topLeft",
                                B6: "content on same line as empty merge topLeft",              E6: hiddenContent,
                                B7: "line of empty merge but aligned with topLeft",             E7: hiddenContent,
            A9: hiddenContent,  B9: hiddenContent,      C9: hiddenContent,  D9: hiddenContent,  E9: hiddenContent,  F9: hiddenContent, G9: hiddenContent,
            A11: "A11",         B11: "B9",              C11: "C9",                              E11: hiddenContent,                    G11: "F9", H11: "G9",
            A13: '=""',         B13: "B11",             C13: "C11",         D13: "D11",
            A14: '=""',         B14: "B12",             C14: "C12",
            A15: '=""',                                 C15: "=TRANSPOSE(A13:A15)",
          },
          styles: {
            F11: 1,
          },
          merges: ["B2:D4", "C6:D7"],
        },
      ],
      styles: { 1: { textColor: "#fe0000" } },
    });
  });
  test.each([
    ["A2", "right", ["B2:D4", "G2", "I2"]],
    ["A3", "right", ["B2:D4", "G3", "I3"]],
    ["A6", "right", ["B6", "I6"]],
    ["B11", "right", ["C11", "G11", "H11", "I11"]],
    ["A13", "right", ["B13", "D13", "I13"]],
    ["I1", "right", ["I1", "I1"]],
    ["I2", "left", ["G2", "B2:D4", "A2"]],
    ["I3", "left", ["G3", "B2:D4", "A3"]],
    ["I6", "left", ["B6", "A6"]],
    ["I11", "left", ["H11", "G11", "C11", "A11"]],
    ["I13", "left", ["D13", "B13", "A13"]],
    ["A1", "left", ["A1", "A1"]],
  ])("Move selection horizontally", (startPosition: string, direction, targetXCs: string[]) => {
    selectCell(model, startPosition);
    for (let targetXC of targetXCs) {
      moveAnchorCell(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
    }
  });

  test.each([
    ["A1", "down", ["A11", "A16"]],
    ["B1", "down", ["B2:D4", "B6", "B7", "B11", "B13", "B14", "B16"]],
    ["C1", "down", ["B2:D4", "C11", "C13", "C14", "C16"]],
    ["F1", "down", ["F16"]],
    ["G1", "down", ["G2", "G3", "G11", "G16"]],
    ["A16", "down", ["A16", "A16"]],
    ["A16", "up", ["A11", "A1"]],
    ["B16", "up", ["B14", "B13", "B11", "B7", "B6", "B2:D4", "B1"]],
    ["C16", "up", ["C14", "C13", "C11", "B2:D4", "C1"]],
    ["F16", "up", ["F1"]],
    ["G16", "up", ["G11", "G3", "G2", "G1"]],
    ["A1", "up", ["A1", "A1"]],
  ])("Move selection vertically", (startPosition: string, direction, targetXCs: string[]) => {
    selectCell(model, startPosition);
    for (let targetXC of targetXCs) {
      moveAnchorCell(model, direction as Direction, "end");
      expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
    }
  });

  test.each([
    ["A2", "A2", "right", ["A2:D4", "A2:G4", "A2:I4"]],
    ["A3", "A3", "right", ["A2:D4", "A2:G4", "A2:I4"]],
    ["A6", "A6", "right", ["A6:B6", "A6:I7"]],
    ["B11", "B11", "right", ["B11:C11", "B11:G11", "B11:H11", "B11:I11"]],
    ["A13", "A13", "right", ["A13:B13", "A13:D13", "A13:I13"]],
    ["A13", "A13:A14", "right", ["A13:B14", "A13:D14", "A13:I14"]],
    ["A14", "A13:A14", "right", ["A13:B14", "A13:C14", "A13:I14"]],
    ["I1", "I1", "right", ["I1", "I1"]],
    ["G2", "G2", "left", ["B2:G4", "A2:G4"]],
    ["H4", "H4", "left", ["B2:H4"]],
    ["I7", "I7", "left", ["B6:I7", "A6:I7"]],
    ["I11", "I11", "left", ["H11:I11", "G11:I11", "C11:I11", "A11:I11"]],
  ])(
    "Alter selection horizontally",
    (anchor: string, selection: string, direction, targetXCs: string[]) => {
      setSelection(model, [selection], { anchor });
      for (let targetXC of targetXCs) {
        resizeAnchorZone(model, direction as Direction, "end");
        expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
      }
    }
  );

  test.each([
    ["A1", "A1", "down", ["A1:A11", "A1:A16"]],
    ["B1", "B1", "down", ["B1:D4", "B1:D7", "B1:D11", "B1:D13", "B1:D14", "B1:D16"]],
    ["C1", "C1", "down", ["B1:D4", "B1:D11", "B1:D13", "B1:D14", "B1:D16"]],
    ["F1", "F1", "down", ["F1:F16"]],
    ["G1", "G1", "down", ["G1:G2", "G1:G3", "G1:G11", "G1:G16"]],
    ["B12", "B12:D12", "down", ["B12:D13", "B12:D14", "B12:D16"]],
    ["D12", "B12:D12", "down", ["B12:D13", "B12:D16"]],
    ["A16", "A16", "down", ["A16", "A16"]],
    ["B16", "B16", "up", ["B14:B16", "B13:B16", "B11:B16", "B7:B16", "B6:B16", "B2:D16", "B1:D16"]],
    ["C16", "C16", "up", ["C14:C16", "C13:C16", "C11:C16", "B2:D16", "B1:D16"]],
    ["F16", "F16", "up", ["F1:F16"]],
    ["B13", "B13:D15", "up", ["B13:D14", "B13:D13"]],
    ["D13", "B13:D15", "up", ["B13:D13"]],
    ["A1", "A1", "up", ["A1", "A1"]],
  ])(
    "Alter selection vertically",
    (anchor: string, selection: string, direction, targetXCs: string[]) => {
      setSelection(model, [selection], { anchor });
      for (let targetXC of targetXCs) {
        resizeAnchorZone(model, direction as Direction, "end");
        expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
      }
    }
  );
});

describe("Alter Selection with content in selection", () => {
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          colNumber: 9,
          rowNumber: 9,
          cells: { C3: "1", C4: "2", D3: "3" },
        },
      ],
    });
  });

  test.each([
    ["C3", "C3:D4", "left", ["C3:C4", "A3:C4"]],
    ["C3", "C3:E4", "left", ["C3:D4", "C3:C4", "A3:C4"]],
    ["B3", "B3:E4", "left", ["B3:D4", "B3:C4", "A3:B4"]],
    ["E3", "E3:D4", "left", ["E3:C4", "A3:E4"]],
    ["E3", "E3:C4", "left", ["A3:E4"]],

    ["B3", "B3:C4", "right", ["B3:D4", "B3:I4"]],
    ["E3", "B3:E4", "right", ["C3:E4", "D3:E4", "E3:I4"]],
    ["C3", "C3:D4", "right", ["C3:I4"]],
    ["D3", "C3:D4", "right", ["D3:D4"]],
  ])(
    "Alter selection horizontally",
    (anchor: string, selection: string, direction, targetXCs: string[]) => {
      setSelection(model, [selection], { anchor });
      for (let targetXC of targetXCs) {
        resizeAnchorZone(model, direction as Direction, "end");
        expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
      }
    }
  );

  test.each([
    ["C3", "C3:D4", "up", ["C3:D3", "C1:D3"]],
    ["C4", "C3:D4", "up", ["C1:D4"]],
    ["C5", "C4:D5", "up", ["C3:D5", "C1:D5"]],

    ["C2", "C2:D3", "down", ["C2:D4", "C2:D9"]],
    ["C5", "C2:D5", "down", ["C3:D5", "C4:D5", "C5:D9"]],
  ])(
    "Alter selection vertically",
    (anchor: string, selection: string, direction, targetXCs: string[]) => {
      setSelection(model, [selection], { anchor });
      for (let targetXC of targetXCs) {
        resizeAnchorZone(model, direction as Direction, "end");
        expect(model.getters.getSelectedZone()).toEqual(toZone(targetXC));
      }
    }
  );
});

describe("move elements(s)", () => {
  beforeEach(() => {
    model = new Model({ sheets: [{ id: "1", merges: ["C3:D4", "G7:H8"] }] });
  });
  test("can't move columns whose merges overflow from the selection", () => {
    const result = moveColumns(model, "F", ["B", "C"]);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });
  test("can't move columns between columns containing common merged ", () => {
    const result = moveColumns(model, "H", ["B", "C"]);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });
  test("can't move rows whose merges overflow from the selection", () => {
    const result = moveRows(model, 5, [1, 2]);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });
  test("can't move rows between rows containing common merged ", () => {
    const result = moveRows(model, 7, [1, 2]);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });

  test("Move a resized column preserves its size", () => {
    const model = new Model();
    resizeColumns(model, ["A"], 10);
    resizeColumns(model, ["C"], 20);
    moveColumns(model, "D", ["A"]);
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getColSize(sheetId, 0)).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(sheetId, 1)).toEqual(20);
    expect(model.getters.getColSize(sheetId, 2)).toEqual(10);
  });

  test("Move a resized row preserves its size", () => {
    const model = new Model();
    resizeRows(model, [0], 10);
    resizeRows(model, [2], 20);
    moveRows(model, 3, [0]);
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 1)).toEqual(20);
    expect(model.getters.getRowSize(sheetId, 2)).toEqual(10);
  });

  test("Can move a column to the end of the sheet", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    moveColumns(model, "Z", ["A"], "after");
    expect(getCellContent(model, "Z1")).toEqual("5");
  });

  test("Can move a row to the end of the sheet", () => {
    const model = new Model();
    setCellContent(model, "A1", "5");
    moveRows(model, 99, [0], "after");
    expect(getCellContent(model, "A100")).toEqual("5");
  });

  test("cannot move column out of bound", () => {
    const model = new Model();
    let result = moveColumns(model, "AAA", ["A"]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    result = moveColumns(model, "A", ["AAA"]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    result = model.dispatch("MOVE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      base: -1,
      elements: [0],
      position: "after",
      dimension: "COL",
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
  });

  test("cannot move row out of bound", () => {
    const model = new Model();
    let result = moveRows(model, 100, [0]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    result = moveRows(model, 19, [100]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    result = moveRows(model, -1, [0]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
  });
});

describe("Selection loop (ctrl + a)", () => {
  describe("Selection content", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model({
        sheets: [
          {
            colNumber: 10,
            rowNumber: 10,
            // prettier-ignore
            cells: {
                        B2: "a", C2: "a",
                                              C3: "merged", D3: "merged", E3: "a",
                                              C4: "a",
              A6: "a",
                                              C8: '=""',    D8: '=""',
              A9: "=TRANSPOSE(C8:D8)",
            },
            merges: ["C3:D3"],
            styles: { B1: 1 },
          },
        ],
        styles: { 1: { textColor: "#fe0000" } },
      });
    });

    test.each([
      ["B2", ["B2:E4", "A1:J10", "B2"]],
      ["A2", ["A2:E4", "A1:J10", "A2"]],
      ["B1", ["B1:E4", "A1:J10", "B1"]],
      ["E3", ["B2:E4", "A1:J10", "E3"]],
      ["A1", ["A1:J10", "A1"]],
      ["A6", ["A1:J10", "A6"]],
      ["E8", ["C8:E8", "A1:J10", "E8"]],
      ["A9", ["A9:A10", "A1:J10", "A9"]],
    ])("Selection loop with anchor %s", (anchor: string, expectedZones: string[]) => {
      selectCell(model, anchor);
      for (const zone of expectedZones) {
        model.selection.loopSelection();
        const selection = model.getters.getSelectedZone();
        expect(zoneToXc(selection)).toEqual(zone);
        expect(zoneToXc(toZone(getActivePosition(model)))).toEqual(anchor);
      }
    });

    test.each([
      ["B2", "B2:E4"],
      ["A2", "A2:E4"],
      ["B1", "B1:E4"],
      ["E3", "B2:E4"],
      ["A1", "A1"],
      ["A6", "A6"],
    ])("Select table around the anchor %s", (anchor: string, expectedZone: string) => {
      selectCell(model, anchor);
      model.selection.selectTableAroundSelection();
      const selection = model.getters.getSelectedZone();
      expect(zoneToXc(selection)).toEqual(expectedZone);
      expect(zoneToXc(positionToZone(model.getters.getActivePosition()))).toEqual(anchor);
    });
  });

  describe("Viewport doesn't move", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model();
    });

    test("Selection loop doesn't scroll the viewport", () => {
      setCellContent(model, "A1", "a");
      setCellContent(model, "A2", "a");
      selectCell(model, "A2");
      setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);
      const initialScroll = model.getters.getActiveSheetScrollInfo();

      model.selection.loopSelection();
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1:A2");
      expect(model.getters.getActiveSheetScrollInfo()).toEqual(initialScroll);

      model.selection.loopSelection();
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1:Z100");
      expect(model.getters.getActiveSheetScrollInfo()).toEqual(initialScroll);

      model.selection.loopSelection();
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A2");
      expect(model.getters.getActiveSheetScrollInfo()).toEqual(initialScroll);
    });

    test("selectTableAroundSelection doesn't scroll the viewport", () => {
      setCellContent(model, "A1", "a");
      setCellContent(model, "A2", "a");
      selectCell(model, "A2");
      setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);
      const initialScroll = model.getters.getActiveSheetScrollInfo();

      model.selection.selectTableAroundSelection();
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1:A2");
      expect(model.getters.getActiveSheetScrollInfo()).toEqual(initialScroll);
    });
  });
});

describe("Multiple selection updates after insertion and deletion", () => {
  test("after inserting column before", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    addColumns(model, "before", "A", 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("K1"));
    expect(selection.zones).toEqual([
      { left: 5, right: 5, top: 0, bottom: 9 },
      { left: 10, right: 10, top: 0, bottom: 9 },
    ]);
  });

  test("after inserting column between", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    addColumns(model, "before", "H", 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("K1"));
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 10, right: 10, top: 0, bottom: 9 },
    ]);
  });

  test("after inserting column after", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    addColumns(model, "after", "K", 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
  });

  test("after inserting row before", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    addRows(model, "before", 0, 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A11"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 5, bottom: 5 },
      { left: 0, right: 9, top: 10, bottom: 10 },
    ]);
  });

  test("after inserting row between", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    addRows(model, "before", 6, 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A11"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 10, bottom: 10 },
    ]);
  });

  test("after inserting rows after", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    addRows(model, "after", 11, 1);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
  });

  test("after deleting column before", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    deleteColumns(model, ["A"]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("I1"));
    expect(selection.zones).toEqual([
      { left: 3, right: 3, top: 0, bottom: 9 },
      { left: 8, right: 8, top: 0, bottom: 9 },
    ]);
  });

  test("after deleting column between", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    deleteColumns(model, ["H"]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("I1"));
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 8, right: 8, top: 0, bottom: 9 },
    ]);
  });

  test("after deleting column after", () => {
    const model = new Model({ sheets: [{ colNumber: 20, rowNumber: 10 }] });
    selectColumn(model, 4, "overrideSelection"); // select E
    selectColumn(model, 9, "newAnchor"); // select J
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));

    deleteColumns(model, ["K"]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("J1"));
    expect(selection.zones).toEqual([
      { left: 4, right: 4, top: 0, bottom: 9 },
      { left: 9, right: 9, top: 0, bottom: 9 },
    ]);
  });

  test("after deleting row before", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    deleteRows(model, [1]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A9"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 3, bottom: 3 },
      { left: 0, right: 9, top: 8, bottom: 8 },
    ]);
  });

  test("after deleting row between", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    deleteRows(model, [6]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A9"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 8, bottom: 8 },
    ]);
  });

  test("after deleting row after", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 20 }] });
    selectRow(model, 4, "overrideSelection"); // select 5
    selectRow(model, 9, "newAnchor"); // select 10
    let selection = model.getters.getSelection();
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));

    deleteRows(model, [10]);
    selection = model.getters.getSelection();
    expect(selection.anchor.cell).toEqual(toCartesian("A10"));
    expect(selection.zones).toEqual([
      { left: 0, right: 9, top: 4, bottom: 4 },
      { left: 0, right: 9, top: 9, bottom: 9 },
    ]);
  });
});
