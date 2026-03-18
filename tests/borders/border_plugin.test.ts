import { DEFAULT_BORDER_DESC } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { BorderDescr, CommandResult } from "../../src/types/index";
import {
  activateSheet,
  addColumns,
  addRows,
  clearFormatting,
  cut,
  deleteCells,
  deleteColumns,
  deleteContent,
  deleteRows,
  duplicateSheet,
  merge,
  moveColumns,
  moveRows,
  paste,
  selectCell,
  setAnchorCorner,
  setBorders,
  setBordersOnTarget,
  setCellContent,
  setZoneBorders,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getComputedBorder,
} from "../test_helpers/getters_helpers";
import "../test_helpers/helpers"; // to have getcontext mocks
import { createModel } from "../test_helpers/helpers";

describe("borders", () => {
  test("can add and remove a border, on empty cell", async () => {
    const model = await createModel();

    // select B2, set its top border, then clear it
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "top" });
    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    await setZoneBorders(model, { position: "clear" });

    expect(getBorder(model, "B2")).toBeNull();

    // select B2, set its left border, then clear it
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "left" });
    expect(getBorder(model, "B2")).toEqual({ left: DEFAULT_BORDER_DESC });
    await setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its bottom border, then clear it
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    await setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its right border, then clear it
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "right" });
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    await setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can add and remove a top border, on existing cell", async () => {
    const model = await createModel();

    // select B2
    await setCellContent(model, "B2", "content");
    await selectCell(model, "B2");

    // set a border top
    await setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });

    // clear borders
    await setZoneBorders(model, { position: "clear" });
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can add and remove a top border, on a selection", async () => {
    const model = await createModel();

    // select B2:C2
    await selectCell(model, "B2");
    await setAnchorCorner(model, "C2");

    // set a border top
    await setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("can clear a zone", async () => {
    const model = await createModel();

    // select C3 and add a border
    await selectCell(model, "C3");
    await setZoneBorders(model, { position: "top" });
    expect(getBorder(model, "C3")).toBeDefined();

    // select A1:F6
    await selectCell(model, "A1");
    await setAnchorCorner(model, "F6");

    // clear all borders
    await setZoneBorders(model, { position: "clear" });

    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("set the same border twice is cancelled", async () => {
    const model = await createModel();
    const border = { top: DEFAULT_BORDER_DESC };
    await setBorders(model, "A1", border);
    expect(await setBorders(model, "A1", border)).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("reset border when there is no border is cancelled", async () => {
    const model = await createModel();
    expect(await setBorders(model, "A1", undefined)).toBeCancelledBecause(CommandResult.NoChanges);
    expect(await setBorders(model, "A1", { top: undefined })).toBeCancelledBecause(
      CommandResult.NoChanges
    );
  });

  test("Can set border on a target", async () => {
    const model = await createModel();
    const border = { top: DEFAULT_BORDER_DESC };
    await setBordersOnTarget(model, ["A1:A2", "B2:B3"], border);
    expect(getBorder(model, "A1")).toEqual({
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "A2")).toEqual({
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("Preserves side borders when combining external and all via command", async () => {
    const model = await createModel();
    const defaultBorder = DEFAULT_BORDER_DESC;

    await setZoneBorders(model, { position: "all" }, ["C3"]);
    await setBordersOnTarget(model, ["C2"], {
      top: defaultBorder,
      right: defaultBorder,
      left: defaultBorder,
    });
    await setBordersOnTarget(model, ["C4"], {
      bottom: defaultBorder,
      left: defaultBorder,
      right: defaultBorder,
    });
    await setBordersOnTarget(model, ["B3"], {
      top: defaultBorder,
      bottom: defaultBorder,
      left: defaultBorder,
    });
    await setBordersOnTarget(model, ["D3"], {
      top: defaultBorder,
      bottom: defaultBorder,
      right: defaultBorder,
    });

    expect(getBorder(model, "C3")).toEqual({
      top: defaultBorder,
      bottom: defaultBorder,
      left: defaultBorder,
      right: defaultBorder,
    });
    expect(getBorder(model, "C2")).toEqual({
      top: defaultBorder,
      left: defaultBorder,
      right: defaultBorder,
    });
    expect(getBorder(model, "C4")).toEqual({
      bottom: defaultBorder,
      left: defaultBorder,
      right: defaultBorder,
    });
    expect(getBorder(model, "B3")).toEqual({
      top: defaultBorder,
      left: defaultBorder,
      bottom: defaultBorder,
    });
    expect(getBorder(model, "D3")).toEqual({
      top: defaultBorder,
      bottom: defaultBorder,
      right: defaultBorder,
    });
  });

  test("import preserves merged cell borders", async () => {
    const b = DEFAULT_BORDER_DESC;
    const allSides = { top: b, bottom: b, left: b, right: b };
    const model = await createModel();

    await setZoneBorders(model, { position: "all" }, ["B2:C3"]);
    await merge(model, "C2:C3");

    const importedModel = await createModel(model.exportData());

    expect(getBorder(importedModel, "B2")).toEqual(allSides);
    expect(getBorder(importedModel, "B3")).toEqual(allSides);
    expect(getBorder(importedModel, "C2")).toEqual({ left: b, top: b, right: b });
    expect(getBorder(importedModel, "C3")).toEqual({ left: b, bottom: b, right: b });
  });

  test("can set all borders in a zone", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:C3
    await selectCell(model, "B2");
    await setAnchorCorner(model, "C3");

    // set all borders
    await setZoneBorders(model, { position: "all" });
    const all = {
      left: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    };
    expect(getBorder(model, "B2")).toEqual(all);
    expect(getBorder(model, "B3")).toEqual(all);
    expect(getBorder(model, "C2")).toEqual(all);
    expect(getBorder(model, "C3")).toEqual(all);
  });

  test("setting top border in a zone only set top row", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:C3
    await selectCell(model, "B2");
    await setAnchorCorner(model, "C3");

    // set all borders
    await setZoneBorders(model, { position: "top" });
    const border = {
      top: DEFAULT_BORDER_DESC,
    };
    expect(getBorder(model, "B2")).toEqual(border);
    expect(getBorder(model, "C2")).toEqual(border);
    expect(getCell(model, "B3")).toBeUndefined();
    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("clearing a common border in a neighbour cell", async () => {
    const model = await createModel();

    // select B2, then set its right border
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "right" });
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });

    // select C2 then clear it
    await selectCell(model, "C2");
    await setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("setting external border in a zone works", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:D4
    await selectCell(model, "B2");
    await setAnchorCorner(model, "D4");

    // set external borders
    await setZoneBorders(model, { position: "external" });
    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC, left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B3")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getCell(model, "C3")).toBeUndefined();
    expect(getBorder(model, "D3")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B4")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C4")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D4")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
  });

  test("setting internal horizontal borders in a zone works", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:C4
    await selectCell(model, "B2");
    await setAnchorCorner(model, "C4");

    await setZoneBorders(model, { position: "h" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B4")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("setting internal horizontal border on a sincel cell does nothing", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "h" }, ["B2"]);
    expect(getBorder(model, "B1")).toBeNull();
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "B3")).toBeNull();
  });

  test("setting internal vertical borders in a zone works", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:D4
    await selectCell(model, "B2");
    await setAnchorCorner(model, "D4");

    await setZoneBorders(model, { position: "v" });
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B4")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toEqual({
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C4")).toEqual({
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D3")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D4")).toEqual({ left: DEFAULT_BORDER_DESC });
  });

  test("setting internal vertical border on a sincel cell does nothing", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "v" }, ["B2"]);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "C2")).toBeNull();
  });

  test("setting internal  borders in a zone works", async () => {
    const model = await createModel();

    // select B2, then expand selection to B2:D4
    await selectCell(model, "B2");
    await setAnchorCorner(model, "D4");

    await setZoneBorders(model, { position: "hv" });
    expect(getBorder(model, "B2")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B3")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B4")).toEqual({
      top: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toEqual({
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C4")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D4")).toEqual({ top: DEFAULT_BORDER_DESC, left: DEFAULT_BORDER_DESC });
  });

  test("setting internal border on a sincel cell does nothing", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "hv" }, ["B2"]);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B1")).toBeNull();
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "B3")).toBeNull();
    expect(getBorder(model, "C2")).toBeNull();
  });

  test("deleting a cell with a border does not remove the border", async () => {
    const model = await createModel();

    // select B2 and set its top border
    await setCellContent(model, "B2", "content");
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toBeDefined();
    await deleteContent(model, ["B2"]);
    expect(getBorder(model, "B2")).toBeDefined();
  });

  test("can undo and redo a setBorder operation on an non empty cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "some content");
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "all" });

    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeDefined();
    await undo(model);
    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can clear formatting (border)", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "b1");
    await selectCell(model, "B1");
    await setZoneBorders(model, { position: "all" });

    expect(getBorder(model, "B1")).toBeDefined();
    await clearFormatting(model, "B1");
    expect(getBorder(model, "B1")).toBeNull();
  });

  test("can clear formatting (border) after selecting all cells", async () => {
    const model = await createModel();
    await selectCell(model, "A1");

    await setAnchorCorner(model, "Z100");
    const activeSheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSelectedZones()[0]).toEqual({
      left: 0,
      top: 0,
      right: model.getters.getNumberCols(activeSheetId) - 1,
      bottom: model.getters.getNumberRows(activeSheetId) - 1,
    });
    await setZoneBorders(model, { position: "all" });
    expect(getBorder(model, "B1")).toBeDefined();
    await setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("set all border of a cell", async () => {
    const model = await createModel();
    const s: BorderDescr = { style: "medium", color: "#FF0000" };
    await setBorders(model, "A1", { bottom: s, top: s, left: s, right: s });
    expect(getBorder(model, "A1")).toEqual({ bottom: s, top: s, left: s, right: s });
  });

  test("cut & paste a border", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    await cut(model, "B2");
    await paste(model, "C4");
    expect(getBorder(model, "C4")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B2")).toBeNull();
  });
});

describe("Grid manipulation", () => {
  let model: Model;
  beforeEach(async () => {
    model = await createModel();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addColumns(model, "before", "B", 1);
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("move duplicated border when col is inserted before", async () => {
    const model = await createModel();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    await duplicateSheet(model, firstSheetId, secondSheetId);
    await addColumns(model, "before", "A", 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B2", secondSheetId)).toBeNull();
    expect(getBorder(model, "C2", secondSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2", secondSheetId)).toBeNull();
  });

  test("move duplicated border when row is inserted before", async () => {
    const model = await createModel();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await duplicateSheet(model, firstSheetId, secondSheetId);
    await addRows(model, "before", 0, 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B3", secondSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column before", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column after", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addColumns(model, "before", "A", 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addRows(model, "before", 1, 1);
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column before", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B3")).toBeNull();
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column after", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    await addRows(model, "before", 0, 1);
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("Remove multiple headers before the borders", async () => {
    const b = DEFAULT_BORDER_DESC;
    await setZoneBorders(model, { position: "external" }, ["C3"]);
    await deleteRows(model, [0, 1]);
    expect(getBorder(model, "B1")).toBeNull();
    expect(getBorder(model, "C1")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D1")).toBeNull();
    expect(getBorder(model, "C2")).toBeNull();

    await deleteColumns(model, ["A", "B"]);
    expect(getBorder(model, "A1")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "B1")).toBeNull();
    expect(getBorder(model, "A2")).toBeNull();
  });

  test("Borders are correctly duplicated on sheet dup", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2"]);
    const sheetId = model.getters.getActiveSheetId();
    const sheetIdTo = "42";
    await duplicateSheet(model, sheetId, sheetIdTo);
    await activateSheet(model, sheetIdTo);
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete cell correctly move borders on shift up", async () => {
    await setZoneBorders(model, { position: "external" }, ["C3:D4"]);
    await deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC, left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C3")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toBeNull();
    expect(getBorder(model, "D3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D4")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete a cell correctly move all the borders on shift up", async () => {
    await setZoneBorders(model, { position: "external" }, ["C3"]);
    await deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toBeNull();
  });

  test("Delete cell correctly move borders on shift left", async () => {
    await setZoneBorders(model, { position: "external" }, ["C3:D4"]);
    await deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({ left: DEFAULT_BORDER_DESC, top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C3")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B4")).toBeNull();
    expect(getBorder(model, "C4")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D4")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete a cell correctly move all the borders on shift left", async () => {
    await setZoneBorders(model, { position: "external" }, ["C3"]);
    await deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toBeNull();
  });

  test("Remove multiple rows before borders at the bottom of the sheet starting from the first column", async () => {
    const b = DEFAULT_BORDER_DESC;
    await setZoneBorders(model, { position: "external" }, ["A98:C100"]);
    await deleteRows(model, [0, 1, 2, 3]);
    expect(getBorder(model, "A94")).toEqual({ left: b, top: b });
    expect(getBorder(model, "B94")).toEqual({ top: b });
    expect(getBorder(model, "C94")).toEqual({ top: b, right: b });
    expect(getBorder(model, "A95")).toEqual({ left: b });
    expect(getBorder(model, "C95")).toEqual({ right: b });
    expect(getBorder(model, "A96")).toEqual({ bottom: b, left: b });
    expect(getBorder(model, "B96")).toEqual({ bottom: b });
    expect(getBorder(model, "C96")).toEqual({ right: b, bottom: b });
  });

  test("Remove multiple rows before borders at the bottom of the sheet starting from the second column", async () => {
    const b = DEFAULT_BORDER_DESC;
    await setZoneBorders(model, { position: "external" }, ["B98:D100"]);
    await deleteRows(model, [0, 1, 2, 3]);
    expect(getBorder(model, "B94")).toEqual({ left: b, top: b });
    expect(getBorder(model, "C94")).toEqual({ top: b });
    expect(getBorder(model, "D94")).toEqual({ top: b, right: b });
    expect(getBorder(model, "B95")).toEqual({ left: b });
    expect(getBorder(model, "D95")).toEqual({ right: b });
    expect(getBorder(model, "B96")).toEqual({ bottom: b, left: b });
    expect(getBorder(model, "C96")).toEqual({ bottom: b });
    expect(getBorder(model, "D96")).toEqual({ right: b, bottom: b });
  });

  test("Removing multiple rows removes internal borders", async () => {
    await setZoneBorders(model, { position: "hv" }, ["B42:E45"]);
    await deleteRows(model, [41, 42, 43, 44]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing multiple columns removes internal borders", async () => {
    await setZoneBorders(model, { position: "hv" }, ["B42:E45"]);
    await deleteColumns(model, ["B", "C", "D", "E"]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing top row removes top border", async () => {
    await setZoneBorders(model, { position: "top" }, ["A1:J1"]);
    await deleteRows(model, [0]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing bottom row removes bottom border", async () => {
    await setZoneBorders(model, { position: "bottom" }, ["A100:J100"]);
    await deleteRows(model, [99]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing left-most cost removes left-most border", async () => {
    await setZoneBorders(model, { position: "left" }, ["A1:A6"]);
    await deleteColumns(model, ["A"]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing right-most row removes right-most border", async () => {
    await setZoneBorders(model, { position: "right" }, ["Z1:Z6"]);
    await deleteColumns(model, ["Z"]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Removing bottom two row removes bottom border", async () => {
    await setZoneBorders(model, { position: "bottom" }, ["A100:J100"]);
    await deleteRows(model, [98, 99]);
    expect(model.exportData().borders).toEqual({});
  });

  test("Adding a border on a cell removes it on the adjacent cells if it differs", async () => {
    const model = await createModel();
    const b = DEFAULT_BORDER_DESC;
    await setZoneBorders(model, { position: "bottom", color: "red", style: "dashed" }, ["B2"]);
    await setZoneBorders(model, { position: "right", color: "red", style: "dashed" }, ["A3"]);
    await setZoneBorders(model, { position: "left", color: "red", style: "dashed" }, ["C3"]);
    await setZoneBorders(model, { position: "top" }, ["D2"]);
    await setZoneBorders(model, { position: "external" }, ["B3"]);
    expect(getBorder(model, "B3")).toEqual({ top: b, bottom: b, left: b, right: b });
    // deleted as the borders are different
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "A3")).toBeNull();
    expect(getBorder(model, "C3")).toBeNull();
    // untouched as the border are the same
    expect(getBorder(model, "D2")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("Moving top row", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2:D4"]);
    await moveRows(model, 9, [1], "after");

    expect(getBorder(model, "B2")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D3")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });

    expect(getBorder(model, "B10")).toEqual({
      left: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D10")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("Moving bottom row", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2:D4"]);
    await moveRows(model, 9, [3], "after");

    expect(getBorder(model, "B2")).toEqual({ left: DEFAULT_BORDER_DESC, top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D2")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D3")).toEqual({ right: DEFAULT_BORDER_DESC });

    expect(getBorder(model, "B10")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D10")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Moving left col", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2:D4"]);
    await moveColumns(model, "F", ["B"], "after");

    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B4")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C4")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });

    expect(getBorder(model, "F2")).toEqual({
      left: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "F3")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "F4")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Moving right col", async () => {
    await setZoneBorders(model, { position: "external" }, ["B2:D4"]);
    await moveColumns(model, "F", ["D"], "after");
    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC, left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B4")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toEqual({ bottom: DEFAULT_BORDER_DESC });

    expect(getBorder(model, "F2")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "F3")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "F4")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Setting a *clear* border on a cell removes the adjacent border cell", async () => {
    const model = await createModel();
    const b = DEFAULT_BORDER_DESC;
    await setZoneBorders(model, { position: "all" }, ["A1:C3"]);
    await setZoneBorders(model, { position: "clear" }, ["B2"]);
    expect(getBorder(model, "A1")).toEqual({ top: b, bottom: b, left: b, right: b });
    expect(getBorder(model, "A2")).toEqual({ top: b, bottom: b, left: b });
    expect(getBorder(model, "A3")).toEqual({ top: b, bottom: b, left: b, right: b });
    expect(getBorder(model, "B1")).toEqual({ top: b, left: b, right: b });
    expect(getBorder(model, "B2")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({ bottom: b, left: b, right: b });
    expect(getBorder(model, "C1")).toEqual({ top: b, bottom: b, left: b, right: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, bottom: b, right: b });
    expect(getBorder(model, "C3")).toEqual({ top: b, bottom: b, left: b, right: b });
  });

  describe("manipulate borders on boundaries of the sheet", () => {
    const b = DEFAULT_BORDER_DESC;
    const defaultBorder = { top: b, bottom: b, left: b, right: b };
    test("delete a border on the top left of sheet", async () => {
      await setZoneBorders(model, { position: "all" }, ["A1"]);
      expect(getBorder(model, "A1")).toEqual(defaultBorder);
      await deleteColumns(model, ["A"]);
      expect(getBorder(model, "A1")).toBeNull();
      await undo(model);
      expect(getBorder(model, "A1")).toEqual(defaultBorder);
      await deleteRows(model, [0]);
      expect(getBorder(model, "A1")).toBeNull();
    });

    test("delete a border on the bottom left of the sheet", async () => {
      await setZoneBorders(model, { position: "all" }, ["A100"]);
      expect(getBorder(model, "A100")).toEqual(defaultBorder);
      await deleteColumns(model, ["A"]);
      expect(getBorder(model, "A100")).toBeNull();
      await undo(model);
      expect(getBorder(model, "A100")).toEqual(defaultBorder);
      await deleteRows(model, [99]);
      expect(getBorder(model, "A100")).toBeNull();
    });

    test("delete a border on the top right of the sheet", async () => {
      await setZoneBorders(model, { position: "all" }, ["Z1"]);
      expect(getBorder(model, "Z1")).toEqual(defaultBorder);
      await deleteColumns(model, ["Z"]);
      expect(getBorder(model, "Z1")).toBeNull();
      await undo(model);
      expect(getBorder(model, "Z1")).toEqual(defaultBorder);
      await deleteRows(model, [0]);
      expect(getBorder(model, "Z1")).toBeNull();
    });

    test("delete a border on the bottom right of the sheet", async () => {
      await setZoneBorders(model, { position: "all" }, ["Z100"]);
      expect(getBorder(model, "Z100")).toEqual(defaultBorder);
      await deleteColumns(model, ["Z"]);
      expect(getBorder(model, "Z100")).toBeNull();
      await undo(model);
      expect(getBorder(model, "Z100")).toEqual(defaultBorder);
      await deleteRows(model, [99]);
      expect(getBorder(model, "Z100")).toBeNull();
    });
  });

  test("no lingering border when deleting a cell with a border", async () => {
    const sheetId = model.getters.getActiveSheetId();
    await setZoneBorders(model, { position: "top", color: "#123456" }, ["C3"]);
    expect(model.getters.getBordersColors(sheetId)).toEqual(["#123456"]);
    await deleteRows(model, [2]);
    expect(model.getters.getBordersColors(sheetId)).toEqual([]);
  });

  test("Borders are not shared through adjacent cells", async () => {
    await setZoneBorders(model, { position: "all" }, ["B2"]);
    expect(getBorder(model, "B1")).toBeNull();
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B3")).toBeNull();
  });
});

describe("Border continuity", () => {
  const border = {
    top: DEFAULT_BORDER_DESC,
    left: DEFAULT_BORDER_DESC,
    right: DEFAULT_BORDER_DESC,
    bottom: DEFAULT_BORDER_DESC,
  };
  test("border continuity is preserved when adding a row before", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await setZoneBorders(model, { position: "external" }, ["A2"]);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toBeNull();
    await addRows(model, "before", 1, 1);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toEqual(border);
  });

  test("border continuity is preserved when adding a row after", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await setZoneBorders(model, { position: "external" }, ["A2"]);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toBeNull();
    await addRows(model, "after", 0, 1);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "A2")).toEqual(border);
    expect(getBorder(model, "A3")).toEqual(border);
  });

  test("border continuity is preserved when adding a column before", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await setZoneBorders(model, { position: "external" }, ["B1"]);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getBorder(model, "C1")).toBeNull();
    await addColumns(model, "before", "B", 1);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getBorder(model, "C1")).toEqual(border);
  });

  test("border continuity is preserved when adding a column after", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await setZoneBorders(model, { position: "external" }, ["B1"]);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getBorder(model, "C1")).toBeNull();
    await addColumns(model, "after", "A", 1);
    expect(getBorder(model, "A1")).toEqual(border);
    expect(getBorder(model, "B1")).toEqual(border);
    expect(getBorder(model, "C1")).toEqual(border);
  });
});

test("Cells that have undefined borders don't override borders of neighboring cells at import", async () => {
  const data = {
    sheets: [
      {
        id: "Sheet1",
        name: "Sheet1",
        colNumber: 26,
        rowNumber: 100,
        cells: {
          B2: "5",
          B1: "3",
          A2: "3",
          B3: "3",
          C2: "3",
        },
        borders: {
          B2: 1,
          B1: 2,
          A2: 2,
          B3: 2,
          C2: 2,
        },
      },
    ],
    borders: {
      "1": {
        top: { style: "thin", color: "#000" },
        bottom: { style: "thin", color: "#000" },
        left: { style: "thin", color: "#000" },
        right: { style: "thin", color: "#000" },
      },
      "2": {
        top: undefined,
        bottom: undefined,
        left: undefined,
        right: undefined,
      },
    },
  };
  const model = await createModel(data);
  expect(model.getters.getCellBorder({ sheetId: "Sheet1", col: 1, row: 1 })).toEqual({
    top: { style: "thin", color: "#000" },
    bottom: { style: "thin", color: "#000" },
    left: { style: "thin", color: "#000" },
    right: { style: "thin", color: "#000" },
  });
});

describe("Borders formatting", () => {
  let model: Model;

  beforeEach(async () => {
    model = await createModel();
  });

  test("Can set a border with style and color", async () => {
    await setZoneBorders(model, { position: "top", color: "#FF0000", style: "thick" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({ top: { style: "thick", color: "#FF0000" } });
  });

  test("Can set a border only with style", async () => {
    await setZoneBorders(model, { position: "bottom", style: "medium" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({ bottom: { style: "medium", color: "#000000" } });
  });

  test("Can overwrite a border", async () => {
    await setZoneBorders(model, { position: "all" }, ["A1"]);
    await setZoneBorders(model, { position: "left", style: "dotted", color: "#00FF00" }, ["A1"]);
    await setZoneBorders(model, { position: "right", style: "dashed", color: "#0000FF" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: { style: "dotted", color: "#00FF00" },
      bottom: DEFAULT_BORDER_DESC,
      right: { style: "dashed", color: "#0000FF" },
    });
  });
});

describe("Computed borders", () => {
  test("SET_BORDER command recomputes the borders", async () => {
    const model = await createModel();
    expect(getComputedBorder(model, "A1")).toBeNull();
    await setBorders(model, "A1", { top: DEFAULT_BORDER_DESC });
    expect(getComputedBorder(model, "A1")).not.toBeNull();
  });

  test("SET_ZONE_BORDERS command recomputes the borders", async () => {
    const model = await createModel();
    expect(getComputedBorder(model, "A1")).toBeNull();
    await setZoneBorders(model, { position: "all" }, ["A1"]);
    expect(getComputedBorder(model, "A1")).not.toBeNull();
  });

  test("SET_BORDERS_ON_TARGET command recomputes the borders", async () => {
    const model = await createModel();
    const border = { top: DEFAULT_BORDER_DESC };
    expect(getComputedBorder(model, "A1")).toBeNull();
    await setBordersOnTarget(model, ["A1"], border);
    expect(getComputedBorder(model, "A1")).not.toBeNull();
  });
});
