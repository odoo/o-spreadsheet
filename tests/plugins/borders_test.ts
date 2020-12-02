import { DEFAULT_BORDER_DESC as b, DEFAULT_BORDER_DESC } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { BorderDescr } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import {
  setBorder,
  getBorder,
  getCell,
  setCellContent,
  addColumns,
  addRows,
  getCellContent,
} from "../helpers";

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new Model();

    // select B2, set its top border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "top");
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    setBorder(model, "clear");

    expect(getBorder(model, "B2")).toBeNull();

    // select B2, set its left border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "left");
    expect(getBorder(model, "B2")).toEqual({ left: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its bottom border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "bottom");
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();

    // select B2, set its right border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "right");
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new Model();

    // select B2
    setCellContent(model, "B2", "content");
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });

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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 1] });

    // set a border top
    setBorder(model, "top");

    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    expect(getBorder(model, "C2")).toEqual({ top: ["thin", "#000"] });
  });

  test("can clear a zone", () => {
    const model = new Model();

    // select C3 and add a border
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    setBorder(model, "top");
    expect(getBorder(model, "C3")).toBeDefined();

    // select A1:E6
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });

    // clear all borders
    setBorder(model, "clear");

    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("can set all borders in a zone", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C3
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "right");
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });

    // select C2 then clear it
    model.dispatch("SELECT_CELL", { col: 2, row: 1 });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("setting external border in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:D4
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
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
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "all");

    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeDefined();
    model.dispatch("UNDO");
    expect(getCellContent(model, "B2")).toBe("some content");
    expect(getBorder(model, "B2")).toBeNull();
  });

  test("can clear formatting (border)", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
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
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
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

  test("ADD_COLUMNS before with external borders", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "B", 1);
    expect(getBorder(model, "B2")).toEqual({ right: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test.skip("[ok] ADD_COLUMNS before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    expect(getBorder(model, "D2")).toBeNull();
  });

  test("ADD_COLUMNS before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "C", 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    // because of border continuity
    expect(getBorder(model, "C2")).toEqual({ left: b, right: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test("ADD_COLUMNS before with external borders in the column after", () => {
    setBorder(model, "external", "B2");
    addColumns(model, "before", "A", 1);
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "B2")).toEqual({ right: b });
    expect(getBorder(model, "C2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "D2")).toEqual({ left: b });
  });

  test("ADD_ROWS before with external borders", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 1, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: b });
    expect(getBorder(model, "B3")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });

  test.skip("[ok] ADD_ROWS before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    expect(getBorder(model, "B3")).toEqual({ top: b });
    expect(getBorder(model, "B4")).toBeNull();
  });

  test("ADD_ROWS before with external borders in the column before", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 2, 1);
    expect(getBorder(model, "A2")).toEqual({ right: b });
    expect(getBorder(model, "B2")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toEqual({ left: b });
    // because of border continuity
    expect(getBorder(model, "B3")).toEqual({ top: b, bottom: b });
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });

  test("ADD_ROWS before with external borders in the column after", () => {
    setBorder(model, "external", "B2");
    addRows(model, "before", 0, 1);
    expect(getBorder(model, "B2")).toEqual({ bottom: b });
    expect(getBorder(model, "B3")).toEqual({ top: b, left: b, right: b, bottom: b });
    expect(getBorder(model, "C2")).toBeNull();
    expect(getBorder(model, "B4")).toEqual({ top: b });
  });
});
