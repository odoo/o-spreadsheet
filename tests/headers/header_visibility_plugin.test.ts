import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { numberToLetters, toZone } from "../../src/helpers";
import { HeaderSizePlugin } from "../../src/plugins/core/header_size";
import {
  addColumns,
  addRows,
  deleteColumns,
  deleteRows,
  hideColumns,
  hideRows,
  merge,
  redo,
  setSelection,
  setStyle,
  undo,
  unhideColumns,
  unhideRows,
} from "../test_helpers/commands_helpers";
import { getPlugin } from "../test_helpers/helpers";

//------------------------------------------------------------------------------
// Hide/unhide
//------------------------------------------------------------------------------

let model: Model;

describe("Hide Columns", () => {
  const sheetId = "1";
  beforeEach(() => {
    model = Model.BuildSync({ sheets: [{ id: sheetId, colNumber: 6, rowNumber: 2 }] });
  });

  test("hide single column", () => {
    hideColumns(model, ["B"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple columns", () => {
    hideColumns(model, ["B", "E", "F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide columns", () => {
    hideColumns(model, ["B", "E", "F"]);
    unhideColumns(model, ["F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide columns on invalid sheetId", () => {
    expect(hideColumns(model, ["A"], "INVALID")).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("delete column before hidden column", () => {
    hideColumns(model, ["B"]);
    deleteColumns(model, ["A"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[0]]);
  });

  test("delete column after hidden column", () => {
    hideColumns(model, ["B"]);
    deleteColumns(model, ["C"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("delete hidden column", () => {
    hideColumns(model, ["B"]);
    deleteColumns(model, ["B"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([]);
  });

  test("add columns before hidden column", () => {
    hideColumns(model, ["B"]);
    addColumns(model, "before", "B", 2);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[3]]);
  });

  test("add columns after hidden column", () => {
    hideColumns(model, ["B"]);
    addColumns(model, "after", "B", 2);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide/unhide Column on small sheet", () => {
    model = Model.BuildSync({ sheets: [{ colNumber: 5, rowNumber: 1 }] });
    model.dispatch("RESIZE_SHEETVIEW", { width: DEFAULT_CELL_WIDTH, height: 1000 });
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("hide/ unhide Column on big sheet", () => {
    model = Model.BuildSync();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("undo/redo hiding", () => {
    model = Model.BuildSync();
    const beforeHidden = model.exportData();
    hideColumns(model, ["B"]);
    const afterHidden1 = model.exportData();
    unhideColumns(model, ["B"]);
    const afterUnhidden1 = model.exportData();
    hideColumns(model, ["D"]);
    const afterHidden2 = model.exportData();
    undo(model);
    expect(model).toExport(afterUnhidden1);
    redo(model);
    expect(model).toExport(afterHidden2);
    undo(model);
    undo(model);
    expect(model).toExport(afterHidden1);
    undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("update selection when hiding one columns", () => {
    model = Model.BuildSync();
    setSelection(model, ["E1:E4"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
    hideColumns(model, ["E"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
  });

  test("don't update selection when hiding a column within a merge", () => {
    model = Model.BuildSync();
    merge(model, "A4:D4");
    setSelection(model, ["A1:A4"]);
    hideColumns(model, ["A"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });

  test("update selection when hiding multiple columns", () => {
    model = Model.BuildSync();
    setSelection(model, ["A1:A4", "E1:E4"]);
    hideColumns(model, ["A", "E"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:A4"), toZone("E1:E4")]);
  });
});

describe("Hide Rows", () => {
  const sheetId = "2";
  beforeEach(() => {
    model = Model.BuildSync({ sheets: [{ id: sheetId, colNumber: 2, rowNumber: 6 }] });
  });

  test("hide single row", () => {
    hideRows(model, [1]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple rows", () => {
    hideRows(model, [1, 4, 5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide rows", () => {
    hideRows(model, [1, 4, 5]);
    unhideRows(model, [5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide rows on invalid sheetId", () => {
    expect(hideRows(model, [0], "INVALID")).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("hide/unhide Row on small sheet", () => {
    model = Model.BuildSync({ sheets: [{ colNumber: 1, rowNumber: 5 }] });
    model.dispatch("RESIZE_SHEETVIEW", { width: 1000, height: DEFAULT_CELL_HEIGHT });
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("hide/ unhide Row on big sheet", () => {
    model = Model.BuildSync();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("undo/redo hiding", () => {
    model = Model.BuildSync();
    const beforeHidden = model.exportData();
    hideRows(model, [1]);
    const afterHidden1 = model.exportData();
    unhideRows(model, [1]);
    const afterUnhidden1 = model.exportData();
    hideRows(model, [3]);
    const afterHidden2 = model.exportData();
    undo(model);
    expect(model).toExport(afterUnhidden1);
    redo(model);
    expect(model).toExport(afterHidden2);
    undo(model);
    undo(model);
    expect(model).toExport(afterHidden1);
    undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("delete row before hidden row", () => {
    hideRows(model, [2]);
    deleteRows(model, [1]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("delete row after hidden row", () => {
    hideRows(model, [2]);
    deleteRows(model, [3]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[2]]);
  });

  test("delete hidden row", () => {
    hideRows(model, [2]);
    deleteRows(model, [2]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([]);
  });

  test.each([
    [9, 2],
    [2, 9],
  ])(
    "delete multiple rows with alphabetical order different from natural order",
    (...deletedRows) => {
      model = Model.BuildSync({ sheets: [{ id: sheetId, colNumber: 10, rowNumber: 10 }] });
      hideRows(model, [5, 8]);
      deleteRows(model, deletedRows);
      expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[4], [7]]);
    }
  );

  test("add rows before hidden row", () => {
    hideRows(model, [1]);
    addRows(model, "after", 0, 2);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[3]]);
  });

  test("add rows after hidden row", () => {
    hideRows(model, [1]);
    addRows(model, "after", 1, 2);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("update selection when hiding a single row", () => {
    model = Model.BuildSync();
    setSelection(model, ["A3:D3"]);
    hideRows(model, [2]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:D3"));
  });

  test("update selection when hiding multiple rows", () => {
    model = Model.BuildSync();
    const zone1 = toZone("A1:D1");
    const zone2 = toZone("A3:D3");
    setSelection(model, ["A1:D1", "A3:D3"]);
    hideRows(model, [0, 2]);
    expect(model.getters.getSelectedZones()).toEqual([zone1, zone2]);
  });

  test("don't update selection when hiding a row within a merge", () => {
    model = Model.BuildSync();
    merge(model, "A4:D4");
    setSelection(model, ["A1:A4"]);
    hideRows(model, [0]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });

  test("Cannot hide unexisting columns", () => {
    model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    const originalNumberCols = model.getters.getNumberCols(sheetId);
    const result = hideColumns(model, [1, 2, originalNumberCols + 10].map(numberToLetters));
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    hideColumns(model, [1, 2].map(numberToLetters));
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1, 2]]);
  });

  test("Cannot hide unexisting rows", () => {
    model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    const originalNumberRows = model.getters.getNumberRows(sheetId);
    const result = hideRows(model, [1, 2, originalNumberRows + 1]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    hideRows(model, [1, 2]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1, 2]]);
  });

  test("Do not compute row of empty cell", () => {
    model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    // Will force an UPDATE_CELL subcommand upon addRows
    setStyle(model, "A100", { fillColor: "red" });
    addRows(model, "after", 99, 1);
    const plugin = getPlugin(model, HeaderSizePlugin);
    expect(plugin.sizes[sheetId].ROW.length).toEqual(101);
    model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo: "sheet2" });
    expect(plugin.sizes["sheet2"].ROW.length).toEqual(101);
  });
});
