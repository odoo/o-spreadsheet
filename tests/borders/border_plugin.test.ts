import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { Model } from "../../src/model";
import { BorderDescr, CommandResult } from "../../src/types/index";
import {
  addColumns,
  addRows,
  createSheet,
  cut,
  deleteCells,
  deleteColumns,
  deleteRows,
  paste,
  selectCell,
  setAnchorCorner,
  setBorders,
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

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new Model();

    // select B2, set its top border, then clear it
    selectCell(model, "B2");
    setZoneBorders(model, { position: "top" });
    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    setZoneBorders(model, { position: "clear" });

    expect(getBorder(model, "B2")).toBeNull();

    // select B2, set its left border, then clear it
    selectCell(model, "B2");
    setZoneBorders(model, { position: "left" });
    expect(getBorder(model, "B2")).toEqual({ left: DEFAULT_BORDER_DESC });
    setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its bottom border, then clear it
    selectCell(model, "B2");
    setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its right border, then clear it
    selectCell(model, "B2");
    setZoneBorders(model, { position: "right" });
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new Model();

    // select B2
    setCellContent(model, "B2", "content");
    selectCell(model, "B2");

    // set a border top
    setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });

    // clear borders
    setZoneBorders(model, { position: "clear" });
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can add and remove a top border, on a selection", () => {
    const model = new Model();

    // select B2:C2
    selectCell(model, "B2");
    setAnchorCorner(model, "C2");

    // set a border top
    setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("can clear a zone", () => {
    const model = new Model();

    // select C3 and add a border
    selectCell(model, "C3");
    setZoneBorders(model, { position: "top" });
    expect(getBorder(model, "C3")).toBeDefined();

    // select A1:F6
    selectCell(model, "A1");
    setAnchorCorner(model, "F6");

    // clear all borders
    setZoneBorders(model, { position: "clear" });

    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("set the same border twice is cancelled", () => {
    const model = new Model();
    const border = { top: DEFAULT_BORDER_DESC };
    setBorders(model, "A1", border);
    expect(setBorders(model, "A1", border)).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("reset border when there is no border is cancelled", () => {
    const model = new Model();
    expect(setBorders(model, "A1", undefined)).toBeCancelledBecause(CommandResult.NoChanges);
    expect(setBorders(model, "A1", { top: undefined })).toBeCancelledBecause(
      CommandResult.NoChanges
    );
  });

  test("can set all borders in a zone", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C3
    selectCell(model, "B2");
    setAnchorCorner(model, "C3");

    // set all borders
    setZoneBorders(model, { position: "all" });
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

  test("setting top border in a zone only set top row", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C3
    selectCell(model, "B2");
    setAnchorCorner(model, "C3");

    // set all borders
    setZoneBorders(model, { position: "top" });
    const border = {
      top: DEFAULT_BORDER_DESC,
    };
    expect(getBorder(model, "B2")).toEqual(border);
    expect(getBorder(model, "C2")).toEqual(border);
    expect(getCell(model, "B3")).toBeUndefined();
    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("clearing a common border in a neighbour cell", () => {
    const model = new Model();

    // select B2, then set its right border
    selectCell(model, "B2");
    setZoneBorders(model, { position: "right" });
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });

    // select C2 then clear it
    selectCell(model, "C2");
    setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("setting external border in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    selectCell(model, "B2");
    setAnchorCorner(model, "D4");

    // set external borders
    setZoneBorders(model, { position: "external" });
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

  test("setting internal horizontal borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C4
    selectCell(model, "B2");
    setAnchorCorner(model, "C4");

    setZoneBorders(model, { position: "h" });
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

  test("setting internal vertical borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    selectCell(model, "B2");
    setAnchorCorner(model, "D4");

    setZoneBorders(model, { position: "v" });
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

  test("setting internal  borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    selectCell(model, "B2");
    setAnchorCorner(model, "D4");

    setZoneBorders(model, { position: "hv" });
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

  test("deleting a cell with a border does not remove the border", () => {
    const model = new Model();

    // select B2 and set its top border
    setCellContent(model, "B2", "content");
    selectCell(model, "B2");
    setZoneBorders(model, { position: "top" });

    expect(getBorder(model, "B2")).toBeDefined();
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getBorder(model, "B2")).toBeDefined();
  });

  test("can undo and redo a setBorder operation on an non empty cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "some content");
    selectCell(model, "B2");
    setZoneBorders(model, { position: "all" });

    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeDefined();
    undo(model);
    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can clear formatting (border)", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    setZoneBorders(model, { position: "all" });

    expect(getBorder(model, "B1")).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getBorder(model, "B1")).toBeNull();
  });

  test("can clear formatting (border) after selecting all cells", () => {
    const model = new Model();
    selectCell(model, "A1");

    setAnchorCorner(model, "Z100");
    const activeSheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSelectedZones()[0]).toEqual({
      left: 0,
      top: 0,
      right: model.getters.getNumberCols(activeSheetId) - 1,
      bottom: model.getters.getNumberRows(activeSheetId) - 1,
    });
    setZoneBorders(model, { position: "all" });
    expect(getBorder(model, "B1")).toBeDefined();
    setZoneBorders(model, { position: "clear" });
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("set all border of a cell", () => {
    const model = new Model();
    const s: BorderDescr = { style: "medium", color: "#FF0000" };
    model.dispatch("SET_BORDER", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      border: { bottom: s, top: s, left: s, right: s },
    });
    expect(getBorder(model, "A1")).toEqual({ bottom: s, top: s, left: s, right: s });
  });

  test("cut & paste a border", () => {
    const model = new Model();
    setZoneBorders(model, { position: "external" }, ["B2"]);
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    cut(model, "B2");
    paste(model, "C4");
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
  beforeEach(() => {
    model = new Model();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addColumns(model, "before", "B", 1);
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ left: DEFAULT_BORDER_DESC });
  });

  test("move duplicated border when col is inserted before", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    setZoneBorders(model, { position: "external" }, ["B2"]);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    addColumns(model, "before", "A", 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B2", secondSheetId)).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2", secondSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("move duplicated border when row is inserted before", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    setZoneBorders(model, { position: "external" }, ["B2"]);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    addRows(model, "before", 0, 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B2", secondSheetId)).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3", secondSheetId)).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test.skip("[ok] ADD_COLUMNS_ROWS with dimension col before with external borders in the column before", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column before", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    // because of border continuity
    expect(getBorder(model, "C2")).toEqual({
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ left: DEFAULT_BORDER_DESC });
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column after", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addColumns(model, "before", "A", 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ left: DEFAULT_BORDER_DESC });
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addRows(model, "before", 1, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test.skip("[ok] ADD_COLUMNS_ROWS with dimension row before with external borders in the column before", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toEqual({ left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column before", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toEqual({ left: DEFAULT_BORDER_DESC });
    // because of border continuity
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B4")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column after", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    addRows(model, "before", 0, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("Remove multiple headers before the borders", () => {
    const b = DEFAULT_BORDER_DESC;
    setZoneBorders(model, { position: "external" }, ["C3"]);
    deleteRows(model, [0, 1]);
    expect(getBorder(model, "B1")).toEqual({ right: b });
    expect(getBorder(model, "C1")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D1")).toEqual({ left: b });
    expect(getBorder(model, "C2")).toEqual({ top: b });

    deleteColumns(model, ["A", "B"]);
    expect(getBorder(model, "A1")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "B1")).toEqual({ left: b });
    expect(getBorder(model, "A2")).toEqual({ top: b });
  });

  test("Remove multiple rows before borders at the bottom of the sheet", () => {
    createSheet(model, { activate: true, sheetId: "sh1", rows: 5, cols: 2 });
    const b = DEFAULT_BORDER_DESC;
    setZoneBorders(model, { position: "external" }, ["A4:B5"]);
    deleteRows(model, [0, 1]);
    expect(getBorder(model, "A2")).toEqual({ left: b, top: b });
    expect(getBorder(model, "A3")).toEqual({ left: b, bottom: b });
    expect(getBorder(model, "B2")).toEqual({ right: b, top: b });
    expect(getBorder(model, "B3")).toEqual({ right: b, bottom: b });
  });

  test("Borders are correctly duplicated on sheet dup", () => {
    setZoneBorders(model, { position: "external" }, ["B2"]);
    const sheetId = model.getters.getActiveSheetId();
    const sheetIdTo = "42";
    model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo });
    expect(getBorder(model, "B2")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete cell correctly move borders on shift up", () => {
    setZoneBorders(model, { position: "external" }, ["C3:D4"]);
    deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ top: DEFAULT_BORDER_DESC, left: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C3")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "D3")).toEqual({
      top: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D4")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete a cell correctly move all the borders on shift up", () => {
    setZoneBorders(model, { position: "external" }, ["C3"]);
    deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("Delete cell correctly move borders on shift left", () => {
    setZoneBorders(model, { position: "external" }, ["C3:D4"]);
    deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({ left: DEFAULT_BORDER_DESC, top: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C3")).toEqual({
      right: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B4")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "D4")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
    });
  });

  test("Delete a cell correctly move all the borders on shift left", () => {
    setZoneBorders(model, { position: "external" }, ["C3"]);
    deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toEqual({ right: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "B3")).toEqual({
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "C3")).toEqual({ left: DEFAULT_BORDER_DESC });
  });
});

test("Cells that have undefined borders don't override borders of neighboring cells at import", () => {
  const data = {
    sheets: [
      {
        id: "Sheet1",
        name: "Sheet1",
        colNumber: 26,
        rowNumber: 100,
        cells: {
          B2: {
            content: "5",
            border: 1,
          },
          B1: {
            content: "3",
            border: 2,
          },
          A2: {
            content: "3",
            border: 2,
          },
          B3: {
            content: "3",
            border: 2,
          },
          C2: {
            content: "3",
            border: 2,
          },
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
  const model = new Model(data);
  expect(model.getters.getCellBorder({ sheetId: "Sheet1", col: 1, row: 1 })).toEqual({
    top: { style: "thin", color: "#000" },
    bottom: { style: "thin", color: "#000" },
    left: { style: "thin", color: "#000" },
    right: { style: "thin", color: "#000" },
  });
});

describe("Borders formatting", () => {
  let model: Model;

  beforeEach(() => {
    model = new Model();
  });

  test("Can set a border with style and color", () => {
    setZoneBorders(model, { position: "top", color: "#FF0000", style: "thick" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({ top: { style: "thick", color: "#FF0000" } });
  });

  test("Can set a border only with style", () => {
    setZoneBorders(model, { position: "bottom", style: "medium" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({ bottom: { style: "medium", color: "#000000" } });
  });

  test("Can overwrite a border", () => {
    setZoneBorders(model, { position: "all" }, ["A1"]);
    setZoneBorders(model, { position: "left", style: "dotted", color: "#00FF00" }, ["A1"]);
    setZoneBorders(model, { position: "right", style: "dashed", color: "#0000FF" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({
      top: DEFAULT_BORDER_DESC,
      left: { style: "dotted", color: "#00FF00" },
      bottom: DEFAULT_BORDER_DESC,
      right: { style: "dashed", color: "#0000FF" },
    });
  });
});

describe("Computed borders", () => {
  test("SET_BORDER command recomputes the borders", () => {
    const model = new Model();
    expect(getComputedBorder(model, "A1")).toBeNull();
    setBorders(model, "A1", { top: DEFAULT_BORDER_DESC });
    expect(getComputedBorder(model, "A1")).not.toBeNull();
  });

  test("SET_ZONE_BORDERS command recomputes the borders", () => {
    const model = new Model();
    expect(getComputedBorder(model, "A1")).toBeNull();
    setZoneBorders(model, { position: "all" }, ["A1"]);
    expect(getComputedBorder(model, "A1")).not.toBeNull();
  });
});
