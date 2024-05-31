import { DEFAULT_BORDER_DESC as b, DEFAULT_BORDER_DESC } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { BorderDescr } from "../../src/types/index";
import {
  addColumns,
  addRows,
  deleteCells,
  deleteRows,
  selectCell,
  setBorder,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent } from "../test_helpers/getters_helpers";
import "../test_helpers/helpers"; // to have getcontext mocks

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new Model();

    // select B2, set its top border, then clear it
    selectCell(model, "B2");
    setBorder(model, "top");
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    setBorder(model, "clear");

    expect(getBorder(model, "B2")).toBeNull();

    // select B2, set its left border, then clear it
    selectCell(model, "B2");
    setBorder(model, "left");
    expect(getBorder(model, "B2")).toEqual({ left: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its bottom border, then clear it
    selectCell(model, "B2");
    setBorder(model, "bottom");
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its right border, then clear it
    selectCell(model, "B2");
    setBorder(model, "right");
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new Model();

    // select B2
    setCellContent(model, "B2", "content");
    selectCell(model, "B2");

    // set a border top
    setBorder(model, "top");

    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });

    // clear borders
    setBorder(model, "clear");
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can add and remove a top border, on a selection", () => {
    const model = new Model();

    // select B2:C2
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [2, 1] });

    // set a border top
    setBorder(model, "top");

    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    expect(getBorder(model, "C2")).toEqual({ top: ["thin", "#000"] });
  });

  test("can clear a zone", () => {
    const model = new Model();

    // select C3 and add a border
    selectCell(model, "C3");
    setBorder(model, "top");
    expect(getBorder(model, "C3")).toBeDefined();

    // select A1:E6
    selectCell(model, "A1");
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });

    // clear all borders
    setBorder(model, "clear");

    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("can set all borders in a zone", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C3
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // set all borders
    setBorder(model, "all");
    const all = {
      left: ["thin", "#000"],
      top: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"],
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
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    // set all borders
    setBorder(model, "top");
    const border = {
      top: ["thin", "#000"],
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
    setBorder(model, "right");
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });

    // select C2 then clear it
    selectCell(model, "C2");
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("setting external border in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [3, 3] });

    // set external borders
    setBorder(model, "external");
    const s = ["thin", "#000"];
    expect(getBorder(model, "B2")).toEqual({ top: s, left: s });
    expect(getBorder(model, "C2")).toEqual({ top: s });
    expect(getBorder(model, "D2")).toEqual({ top: s, right: s });
    expect(getBorder(model, "B3")).toEqual({ left: s });
    expect(getCell(model, "C3")).toBeUndefined();
    expect(getBorder(model, "D3")).toEqual({ right: s });
    expect(getBorder(model, "B4")).toEqual({ bottom: s, left: s });
    expect(getBorder(model, "C4")).toEqual({ bottom: s });
    expect(getBorder(model, "D4")).toEqual({ bottom: s, right: s });
  });

  test("setting internal horizontal borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C4
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [2, 3] });

    setBorder(model, "h");
    const s = ["thin", "#000"];
    expect(getBorder(model, "B2")).toEqual({ bottom: s });
    expect(getBorder(model, "C2")).toEqual({ bottom: s });
    expect(getBorder(model, "B3")).toEqual({ top: s, bottom: s });
    expect(getBorder(model, "C3")).toEqual({ top: s, bottom: s });
    expect(getBorder(model, "B4")).toEqual({ top: s });
    expect(getBorder(model, "C4")).toEqual({ top: s });
  });

  test("setting internal vertical borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [3, 3] });

    setBorder(model, "v");
    const s = ["thin", "#000"];
    expect(getBorder(model, "B2")).toEqual({ right: s });
    expect(getBorder(model, "B3")).toEqual({ right: s });
    expect(getBorder(model, "B4")).toEqual({ right: s });
    expect(getBorder(model, "C2")).toEqual({ left: s, right: s });
    expect(getBorder(model, "C3")).toEqual({ left: s, right: s });
    expect(getBorder(model, "C4")).toEqual({ left: s, right: s });
    expect(getBorder(model, "D2")).toEqual({ left: s });
    expect(getBorder(model, "D3")).toEqual({ left: s });
    expect(getBorder(model, "D4")).toEqual({ left: s });
  });

  test("setting internal  borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C4
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { cell: [3, 3] });

    setBorder(model, "hv");
    const s = ["thin", "#000"];
    expect(getBorder(model, "B2")).toEqual({ bottom: s, right: s });
    expect(getBorder(model, "B3")).toEqual({ bottom: s, top: s, right: s });
    expect(getBorder(model, "B4")).toEqual({ top: s, right: s });
    expect(getBorder(model, "C2")).toEqual({ left: s, right: s, bottom: s });
    expect(getBorder(model, "C3")).toEqual({ top: s, left: s, bottom: s, right: s });
    expect(getBorder(model, "C4")).toEqual({ top: s, left: s, right: s });
    expect(getBorder(model, "D2")).toEqual({ left: s, bottom: s });
    expect(getBorder(model, "D3")).toEqual({ top: s, left: s, bottom: s });
    expect(getBorder(model, "D4")).toEqual({ top: s, left: s });
  });

  test("deleting a cell with a border does not remove the border", () => {
    const model = new Model();

    // select B2 and set its top border
    setCellContent(model, "B2", "content");
    selectCell(model, "B2");
    setBorder(model, "top");

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
    setBorder(model, "all");

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
    setBorder(model, "all");

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
    model.dispatch("ALTER_SELECTION", { cell: [25, 99] });
    const activeSheet = model.getters.getActiveSheet();
    expect(model.getters.getSelectedZones()[0]).toEqual({
      left: 0,
      top: 0,
      right: activeSheet.cols.length - 1,
      bottom: activeSheet.rows.length - 1,
    });
    setBorder(model, "all");
    expect(getBorder(model, "B1")).toBeDefined();
    setBorder(model, "clear");
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("set all border of a cell", () => {
    const model = new Model();
    const s: BorderDescr = ["thin", "#000"];
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
    setBorder(model, "external", "B2");
    const s = DEFAULT_BORDER_DESC;
    expect(getBorder(model, "B2")).toEqual({ top: s, bottom: s, right: s, left: s });
    model.dispatch("CUT", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C4")] });
    expect(getBorder(model, "C4")).toEqual({ top: s, bottom: s, right: s, left: s });
    expect(getBorder(model, "B2")).toBeNull();
  });
});

describe("Grid manipulation", () => {
  let model: Model;
  beforeEach(() => {
    model = new Model();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "B", 1);
    expect(getBorder(model, "B2")).toEqual({ right: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test("move duplicated border when col is inserted before", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    setBorder(model, "external", "B2");
    expect(getBorder(model, "B2", firstSheetId)).toEqual({ top: b, left: b, right: b, bottom: b });
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    addColumns(model, "before", "A", 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "B2", secondSheetId)).toEqual({ right: b });
    expect(getBorder(model, "C2", secondSheetId)).toEqual({ top: b, left: b, right: b, bottom: b });
  });

  test("move duplicated border when row is inserted before", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    setBorder(model, "external", "B2");
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    addRows(model, "before", 0, 1, secondSheetId);
    expect(getBorder(model, "B2", firstSheetId)).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "B2", secondSheetId)).toEqual({ bottom: b });
    expect(getBorder(model, "B3", secondSheetId)).toEqual({ top: b, left: b, right: b, bottom: b });
  });

  test.skip("[ok] ADD_COLUMNS_ROWS with dimension col before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    // because of border continuity
    expect(getBorder(model, "C2")).toEqual({ left: b, right: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test("ADD_COLUMNS_ROWS with dimension col before with external borders in the column after", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "A", 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toEqual({ right: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 1, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: b });
    expect(getBorder(model, "B3")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });

  test.skip("[ok] ADD_COLUMNS_ROWS with dimension row before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    expect(getBorder(model, "B3")).toEqual({ top: b });
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    // because of border continuity
    expect(getBorder(model, "B3")).toEqual({ top: b, bottom: b });
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });

  test("ADD_COLUMNS_ROWS with dimension row before with external borders in the column after", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 0, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: b });
    expect(getBorder(model, "B3")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });

  test("Borders are correctly duplicated on sheet dup", () => {
    setBorder(model, "external", "B2");
    const sheetId = model.getters.getActiveSheetId();
    const sheetIdTo = "42";
    model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
  });

  test("Delete cell correctly move borders on shift up", () => {
    setBorder(model, "external", "C3:D4");
    deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toEqual({ bottom: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, left: b });
    expect(getBorder(model, "C3")).toEqual({ bottom: b, left: b });
    expect(getBorder(model, "D2")).toEqual({ bottom: b });
    expect(getBorder(model, "D3")).toEqual({ top: b, right: b });
    expect(getBorder(model, "D4")).toEqual({ bottom: b, right: b });
  });

  test("Delete a cell correctly move all the borders on shift up", () => {
    setBorder(model, "external", "C3");
    deleteCells(model, "C1", "up");
    expect(getBorder(model, "C1")).toEqual({ bottom: b });
    expect(getBorder(model, "C2")).toEqual({ bottom: b, top: b, left: b, right: b });
    expect(getBorder(model, "C3")).toEqual({ top: b });
  });

  test("Delete cell correctly move borders on shift left", () => {
    setBorder(model, "external", "C3:D4");
    deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toEqual({ right: b });
    expect(getBorder(model, "B3")).toEqual({ left: b, top: b });
    expect(getBorder(model, "C3")).toEqual({ right: b, top: b });
    expect(getBorder(model, "B4")).toEqual({ right: b });
    expect(getBorder(model, "C4")).toEqual({ left: b, bottom: b });
    expect(getBorder(model, "D4")).toEqual({ right: b, bottom: b });
  });

  test("Delete a cell correctly move all the borders on shift left", () => {
    setBorder(model, "external", "C3");
    deleteCells(model, "A3", "left");
    expect(getBorder(model, "A3")).toEqual({ right: b });
    expect(getBorder(model, "B3")).toEqual({ bottom: b, top: b, left: b, right: b });
    expect(getBorder(model, "C3")).toEqual({ left: b });
  });

  test("Remove multiple rows before borders at the bottom of the sheet starting from the first column", () => {
    const b = DEFAULT_BORDER_DESC;
    setBorder(model, "external", "A98:C100");
    deleteRows(model, [0, 1, 2, 3]);
    expect(getBorder(model, "A94")).toEqual({ left: b, top: b });
    expect(getBorder(model, "B94")).toEqual({ top: b });
    expect(getBorder(model, "C94")).toEqual({ top: b, right: b });
    expect(getBorder(model, "A95")).toEqual({ left: b });
    expect(getBorder(model, "C95")).toEqual({ right: b });
    expect(getBorder(model, "A96")).toEqual({ bottom: b, left: b });
    expect(getBorder(model, "B96")).toEqual({ bottom: b });
    expect(getBorder(model, "C96")).toEqual({ right: b, bottom: b });
  });

  test("Remove multiple rows before borders at the bottom of the sheet starting from the second column", () => {
    const b = DEFAULT_BORDER_DESC;
    setBorder(model, "external", "B98:D100");
    deleteRows(model, [0, 1, 2, 3]);
    expect(getBorder(model, "B94")).toEqual({ left: b, top: b });
    expect(getBorder(model, "C94")).toEqual({ top: b });
    expect(getBorder(model, "D94")).toEqual({ top: b, right: b });
    expect(getBorder(model, "B95")).toEqual({ left: b });
    expect(getBorder(model, "D95")).toEqual({ right: b });
    expect(getBorder(model, "B96")).toEqual({ bottom: b, left: b });
    expect(getBorder(model, "C96")).toEqual({ bottom: b });
    expect(getBorder(model, "D96")).toEqual({ right: b, bottom: b });
  });
});
