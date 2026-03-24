import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { HeaderSizePlugin } from "@odoo/o-spreadsheet-engine/plugins/core/header_size";
import { CommandResult, Model } from "../../src";
import { numberToLetters, toZone } from "../../src/helpers";
import {
  addColumns,
  addRows,
  deleteColumns,
  deleteRows,
  duplicateSheet,
  hideColumns,
  hideRows,
  merge,
  redo,
  setFormatting,
  setSelection,
  setSheetviewSize,
  undo,
  unhideColumns,
  unhideRows,
} from "../test_helpers/commands_helpers";
import { createModel, getPlugin } from "../test_helpers/helpers";

//------------------------------------------------------------------------------
// Hide/unhide
//------------------------------------------------------------------------------

let model: Model;

describe("Hide Columns", () => {
  const sheetId = "1";
  beforeEach(async () => {
    model = await createModel({ sheets: [{ id: sheetId, colNumber: 6, rowNumber: 2 }] });
  });

  test("hide single column", async () => {
    await hideColumns(model, ["B"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple columns", async () => {
    await hideColumns(model, ["B", "E", "F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide columns", async () => {
    await hideColumns(model, ["B", "E", "F"]);
    await unhideColumns(model, ["F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide columns on invalid sheetId", async () => {
    expect(await hideColumns(model, ["A"], "INVALID")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("delete column before hidden column", async () => {
    await hideColumns(model, ["B"]);
    await deleteColumns(model, ["A"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[0]]);
  });

  test("delete column after hidden column", async () => {
    await hideColumns(model, ["B"]);
    await deleteColumns(model, ["C"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("delete hidden column", async () => {
    await hideColumns(model, ["B"]);
    await deleteColumns(model, ["B"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([]);
  });

  test("add columns before hidden column", async () => {
    await hideColumns(model, ["B"]);
    await addColumns(model, "before", "B", 2);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[3]]);
  });

  test("add columns after hidden column", async () => {
    await hideColumns(model, ["B"]);
    await addColumns(model, "after", "B", 2);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide/unhide Column on small sheet", async () => {
    model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 1 }] });
    await setSheetviewSize(model, 1000, DEFAULT_CELL_WIDTH);
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    await hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    await unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("hide/ unhide Column on big sheet", async () => {
    model = await createModel();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    await hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    await unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("undo/redo hiding", async () => {
    model = await createModel();
    const beforeHidden = model.exportData();
    await hideColumns(model, ["B"]);
    const afterHidden1 = model.exportData();
    await unhideColumns(model, ["B"]);
    const afterUnhidden1 = model.exportData();
    await hideColumns(model, ["D"]);
    const afterHidden2 = model.exportData();
    await undo(model);
    expect(model).toExport(afterUnhidden1);
    await redo(model);
    expect(model).toExport(afterHidden2);
    await undo(model);
    await undo(model);
    expect(model).toExport(afterHidden1);
    await undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("update selection when hiding one columns", async () => {
    model = await createModel();
    await setSelection(model, ["E1:E4"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
    await hideColumns(model, ["E"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
  });

  test("don't update selection when hiding a column within a merge", async () => {
    model = await createModel();
    await merge(model, "A4:D4");
    await setSelection(model, ["A1:A4"]);
    await hideColumns(model, ["A"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });

  test("update selection when hiding multiple columns", async () => {
    model = await createModel();
    await setSelection(model, ["A1:A4", "E1:E4"]);
    await hideColumns(model, ["A", "E"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:A4"), toZone("E1:E4")]);
  });
});

describe("Hide Rows", () => {
  const sheetId = "2";
  beforeEach(async () => {
    model = await createModel({ sheets: [{ id: sheetId, colNumber: 2, rowNumber: 6 }] });
  });

  test("hide single row", async () => {
    await hideRows(model, [1]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple rows", async () => {
    await hideRows(model, [1, 4, 5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide rows", async () => {
    await hideRows(model, [1, 4, 5]);
    await unhideRows(model, [5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide rows on invalid sheetId", async () => {
    expect(await hideRows(model, [0], "INVALID")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("hide/unhide Row on small sheet", async () => {
    model = await createModel({ sheets: [{ colNumber: 1, rowNumber: 5 }] });
    await setSheetviewSize(model, DEFAULT_CELL_HEIGHT, 1000);
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    await hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    await unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("hide/ unhide Row on big sheet", async () => {
    model = await createModel();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMainViewportRect();
    await hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    await unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMainViewportRect();
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("undo/redo hiding", async () => {
    model = await createModel();
    const beforeHidden = model.exportData();
    await hideRows(model, [1]);
    const afterHidden1 = model.exportData();
    await unhideRows(model, [1]);
    const afterUnhidden1 = model.exportData();
    await hideRows(model, [3]);
    const afterHidden2 = model.exportData();
    await undo(model);
    expect(model).toExport(afterUnhidden1);
    await redo(model);
    expect(model).toExport(afterHidden2);
    await undo(model);
    await undo(model);
    expect(model).toExport(afterHidden1);
    await undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("delete row before hidden row", async () => {
    await hideRows(model, [2]);
    await deleteRows(model, [1]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("delete row after hidden row", async () => {
    await hideRows(model, [2]);
    await deleteRows(model, [3]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[2]]);
  });

  test("delete hidden row", async () => {
    await hideRows(model, [2]);
    await deleteRows(model, [2]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([]);
  });

  test.each([
    [9, 2],
    [2, 9],
  ])(
    "delete multiple rows with alphabetical order different from natural order",
    async (...deletedRows) => {
      model = await createModel({ sheets: [{ id: sheetId, colNumber: 10, rowNumber: 10 }] });
      await hideRows(model, [5, 8]);
      await deleteRows(model, deletedRows);
      expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[4], [7]]);
    }
  );

  test("add rows before hidden row", async () => {
    await hideRows(model, [1]);
    await addRows(model, "after", 0, 2);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[3]]);
  });

  test("add rows after hidden row", async () => {
    await hideRows(model, [1]);
    await addRows(model, "after", 1, 2);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("update selection when hiding a single row", async () => {
    model = await createModel();
    await setSelection(model, ["A3:D3"]);
    await hideRows(model, [2]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:D3"));
  });

  test("update selection when hiding multiple rows", async () => {
    model = await createModel();
    const zone1 = toZone("A1:D1");
    const zone2 = toZone("A3:D3");
    await setSelection(model, ["A1:D1", "A3:D3"]);
    await hideRows(model, [0, 2]);
    expect(model.getters.getSelectedZones()).toEqual([zone1, zone2]);
  });

  test("don't update selection when hiding a row within a merge", async () => {
    model = await createModel();
    await merge(model, "A4:D4");
    await setSelection(model, ["A1:A4"]);
    await hideRows(model, [0]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });

  test("Cannot hide unexisting columns", async () => {
    model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    const originalNumberCols = model.getters.getNumberCols(sheetId);
    const result = await hideColumns(model, [1, 2, originalNumberCols + 10].map(numberToLetters));
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    await hideColumns(model, [1, 2].map(numberToLetters));
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1, 2]]);
  });

  test("Cannot hide unexisting rows", async () => {
    model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    const originalNumberRows = model.getters.getNumberRows(sheetId);
    const result = await hideRows(model, [1, 2, originalNumberRows + 1]);
    expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderIndex);
    await hideRows(model, [1, 2]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1, 2]]);
  });

  test("Do not compute row of empty cell", async () => {
    model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    // Will force an UPDATE_CELL subcommand upon addRows
    await setFormatting(model, "A100", { fillColor: "red" });
    await addRows(model, "after", 99, 1);
    const plugin = getPlugin(model, HeaderSizePlugin);
    expect(plugin.sizes[sheetId].ROW.length).toEqual(101);
    await duplicateSheet(model, sheetId, "sheet2");
    expect(plugin.sizes["sheet2"].ROW.length).toEqual(101);
  });
});
