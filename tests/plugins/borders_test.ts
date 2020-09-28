import { Model } from "../../src/model";
import { BorderCommand } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";

function getBorder(model: Model, xc: string) {
  const cell = model.getters.getCells()[xc];
  return model.getters.getCellBorder(cell);
}

function setBorder(model: Model, command: BorderCommand) {
  model.dispatch("SET_FORMATTING", {
    sheet: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    border: command,
  });
}

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new Model();

    // select B2, set its top border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "top");
    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    setBorder(model, "clear");

    expect(getCell(model, "B2")).toBeNull();

    // select B2, set its left border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "left");
    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ left: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeNull();

    // select B2, set its bottom border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "bottom");
    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeNull();

    // select B2, set its right border, then clear it
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "right");
    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(getCell(model, "B2")).toBeNull();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new Model();

    // select B2
    model.dispatch("SET_VALUE", { xc: "B2", text: "content" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });

    // set a border top
    setBorder(model, "top");

    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });

    // clear borders
    setBorder(model, "clear");
    expect(getCell(model, "B2")!.border).not.toBeDefined();
  });

  test("can add and remove a top border, on a selection", () => {
    const model = new Model();

    // select B2:C2
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 1] });

    // set a border top
    setBorder(model, "top");

    expect(getCell(model, "B2")!.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    expect(getCell(model, "C2")!.border).toBeDefined();
    expect(getBorder(model, "C2")).toEqual({ top: ["thin", "#000"] });
  });

  test("can clear a zone", () => {
    const model = new Model();

    // select C3 and add a border
    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    setBorder(model, "top");
    expect(getCell(model, "C3")!.border).toBeDefined();

    // select A1:E6
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });

    // clear all borders
    setBorder(model, "clear");

    expect(getCell(model, "C3")).toBeNull();
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
    expect(getCell(model, "B3")).toBeNull();
    expect(getCell(model, "C3")).toBeNull();
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
    expect(getCell(model, "B2")).toBeNull();
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
    expect(getCell(model, "C3")).toBeNull();
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

    // set external borders
    setBorder(model, "h");
    const s = ["thin", "#000"];
    expect(getCell(model, "B2")).toBeNull();
    expect(getCell(model, "C2")).toBeNull();
    expect(getBorder(model, "B3")).toEqual({ top: s });
    expect(getBorder(model, "C3")).toEqual({ top: s });
    expect(getBorder(model, "B4")).toEqual({ top: s });
    expect(getBorder(model, "C4")).toEqual({ top: s });
  });

  test("setting internal vertical borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C4
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 3] });

    // set external borders
    setBorder(model, "v");
    const s = ["thin", "#000"];
    expect(getCell(model, "B2")).toBeNull();
    expect(getCell(model, "B3")).toBeNull();
    expect(getCell(model, "B4")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({ left: s });
    expect(getBorder(model, "C3")).toEqual({ left: s });
    expect(getBorder(model, "C4")).toEqual({ left: s });
  });

  test("setting internal  borders in a zone works", () => {
    const model = new Model();

    // select B2, then expand selection to B2:C4
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 3] });

    // set external borders
    setBorder(model, "hv");
    const s = ["thin", "#000"];
    expect(getCell(model, "B2")).toBeNull();
    expect(getBorder(model, "C2")).toEqual({ left: s });
    expect(getBorder(model, "B3")).toEqual({ top: s });
    expect(getBorder(model, "C3")).toEqual({ top: s, left: s });
    expect(getBorder(model, "B4")).toEqual({ top: s });
    expect(getBorder(model, "C4")).toEqual({ top: s, left: s });
  });

  test("deleting a cell with a border does not remove the border", () => {
    const model = new Model();

    // select B2 and set its top border
    model.dispatch("SET_VALUE", { xc: "B2", text: "content" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "top");

    expect(getCell(model, "B2")!.border).toBeDefined();
    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B2")!.border).toBeDefined();
  });

  test("can undo and redo a setBorder operation on an non empty cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "some content" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    setBorder(model, "all");

    expect(getCell(model, "B2")!.content).toBe("some content");
    expect(getCell(model, "B2")!.border).toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "B2")!.content).toBe("some content");
    expect(getCell(model, "B2")!.border).not.toBeDefined();
  });

  test("can clear formatting (border)", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    setBorder(model, "all");

    expect(getCell(model, "B1")!.border).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheet: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")!.border).not.toBeDefined();
  });

  test("can clear formatting (border) after selecting all cells", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [25, 99] });
    const activeSheet = model.getters.getActiveSheet();
    expect(model.getters.getSelectedZones()[0]).toEqual({
      left: 0,
      top: 0,
      right: activeSheet.colNumber - 1,
      bottom: activeSheet.rowNumber - 1,
    });
    setBorder(model, "all");
    expect(getCell(model, "B1")!.border).toBeDefined();
    setBorder(model, "clear");
    expect(getCell(model, "B1")).toBeNull();
  });
});
