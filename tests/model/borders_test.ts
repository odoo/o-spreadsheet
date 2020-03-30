import { GridModel } from "../../src/model/index";
import { BorderCommand } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks

function getBorder(model: GridModel, xc: string) {
  const cell = model.workbook.cells[xc];
  return model.getters.getCellBorder(cell);
}

function setBorder(model: GridModel, command: BorderCommand) {
  model.dispatch({
    type: "SET_FORMATTING",
    sheet: model.state.activeSheet,
    target: model.getters.getSelectedZones(),
    border: command
  });
}

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new GridModel();

    // select B2, set its top border, then clear it
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "top");
    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    setBorder(model, "clear");

    expect(model.workbook.cells.B2).not.toBeDefined();

    // select B2, set its left border, then clear it
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "left");
    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ left: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(model.workbook.cells.B2).not.toBeDefined();

    // select B2, set its bottom border, then clear it
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "bottom");
    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(model.workbook.cells.B2).not.toBeDefined();

    // select B2, set its right border, then clear it
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "right");
    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });
    setBorder(model, "clear");
    expect(model.workbook.cells.B2).not.toBeDefined();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new GridModel();

    // select B2
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "content" });
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });

    // set a border top
    setBorder(model, "top");

    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });

    // clear borders
    setBorder(model, "clear");
    expect(model.workbook.cells.B2.border).not.toBeDefined();
  });

  test("can add and remove a top border, on a selection", () => {
    const model = new GridModel();

    // select B2:C2
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 1] });

    // set a border top
    setBorder(model, "top");

    expect(model.workbook.cells.B2.border).toBeDefined();
    expect(getBorder(model, "B2")).toEqual({ top: ["thin", "#000"] });
    expect(model.workbook.cells.C2.border).toBeDefined();
    expect(getBorder(model, "C2")).toEqual({ top: ["thin", "#000"] });
  });

  test("can clear a zone", () => {
    const model = new GridModel();

    // select C3 and add a border
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    setBorder(model, "top");
    expect(model.workbook.cells.C3.border).toBeDefined();

    // select A1:E6
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [5, 5] });

    // clear all borders
    setBorder(model, "clear");

    expect(model.workbook.cells.C3).not.toBeDefined();
  });

  test("can set all borders in a zone", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:C3
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 2] });

    // set all borders
    setBorder(model, "all");
    const all = {
      left: ["thin", "#000"],
      top: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"]
    };
    expect(getBorder(model, "B2")).toEqual(all);
    expect(getBorder(model, "B3")).toEqual(all);
    expect(getBorder(model, "C2")).toEqual(all);
    expect(getBorder(model, "C3")).toEqual(all);
  });

  test("setting top border in a zone only set top row", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:C3
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 2] });

    // set all borders
    setBorder(model, "top");
    const border = {
      top: ["thin", "#000"]
    };
    expect(getBorder(model, "B2")).toEqual(border);
    expect(getBorder(model, "C2")).toEqual(border);
    expect(model.workbook.cells.B3).not.toBeDefined();
    expect(model.workbook.cells.C3).not.toBeDefined();
  });

  test("clearing a common border in a neighbour cell", () => {
    const model = new GridModel();

    // select B2, then set its right border
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "right");
    expect(getBorder(model, "B2")).toEqual({ right: ["thin", "#000"] });

    // select C2 then clear it
    model.dispatch({ type: "SELECT_CELL", col: 2, row: 1 });
    setBorder(model, "clear");
    expect(model.workbook.cells.B2).not.toBeDefined();
  });

  test("setting external border in a zone works", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:D4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [3, 3] });

    // set external borders
    setBorder(model, "external");
    const s = ["thin", "#000"];
    expect(getBorder(model, "B2")).toEqual({ top: s, left: s });
    expect(getBorder(model, "C2")).toEqual({ top: s });
    expect(getBorder(model, "D2")).toEqual({ top: s, right: s });
    expect(getBorder(model, "B3")).toEqual({ left: s });
    expect(model.workbook.cells.C3).not.toBeDefined();
    expect(getBorder(model, "D3")).toEqual({ right: s });
    expect(getBorder(model, "B4")).toEqual({ bottom: s, left: s });
    expect(getBorder(model, "C4")).toEqual({ bottom: s });
    expect(getBorder(model, "D4")).toEqual({ bottom: s, right: s });
  });

  test("setting internal horizontal borders in a zone works", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:C4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 3] });

    // set external borders
    setBorder(model, "h");
    const s = ["thin", "#000"];
    expect(model.workbook.cells.B2).not.toBeDefined();
    expect(model.workbook.cells.C2).not.toBeDefined();
    expect(getBorder(model, "B3")).toEqual({ top: s });
    expect(getBorder(model, "C3")).toEqual({ top: s });
    expect(getBorder(model, "B4")).toEqual({ top: s });
    expect(getBorder(model, "C4")).toEqual({ top: s });
  });

  test("setting internal vertical borders in a zone works", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:C4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 3] });

    // set external borders
    setBorder(model, "v");
    const s = ["thin", "#000"];
    expect(model.workbook.cells.B2).not.toBeDefined();
    expect(model.workbook.cells.B3).not.toBeDefined();
    expect(model.workbook.cells.B4).not.toBeDefined();
    expect(getBorder(model, "C2")).toEqual({ left: s });
    expect(getBorder(model, "C3")).toEqual({ left: s });
    expect(getBorder(model, "C4")).toEqual({ left: s });
  });

  test("setting internal  borders in a zone works", () => {
    const model = new GridModel();

    // select B2, then expand selection to B2:C4
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [2, 3] });

    // set external borders
    setBorder(model, "hv");
    const s = ["thin", "#000"];
    expect(model.workbook.cells.B2).not.toBeDefined();
    expect(getBorder(model, "C2")).toEqual({ left: s });
    expect(getBorder(model, "B3")).toEqual({ top: s });
    expect(getBorder(model, "C3")).toEqual({ top: s, left: s });
    expect(getBorder(model, "B4")).toEqual({ top: s });
    expect(getBorder(model, "C4")).toEqual({ top: s, left: s });
  });

  test("deleting a cell with a border does not remove the border", () => {
    const model = new GridModel();

    // select B2 and set its top border
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "content" });
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "top");

    expect(model.workbook.cells.B2.border).toBeDefined();
    model.dispatch({
      type: "DELETE_CONTENT",
      sheet: model.state.activeSheet,
      target: model.state.selection.zones
    });
    expect(model.workbook.cells.B2.border).toBeDefined();
  });

  test("can undo and redo a setBorder operation on an non empty cell", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "some content" });
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    setBorder(model, "all");

    expect(model.workbook.cells.B2.content).toBe("some content");
    expect(model.workbook.cells.B2.border).toBeDefined();
    model.undo();
    expect(model.workbook.cells.B2.content).toBe("some content");
    expect(model.workbook.cells.B2.border).not.toBeDefined();
  });

  test("can clear formatting (border)", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "B1", text: "b1" });
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 0 });
    setBorder(model, "all");

    expect(model.workbook.cells.B1.border).toBeDefined();
    model.dispatch({
      type: "CLEAR_FORMATTING",
      sheet: model.state.activeSheet,
      target: model.getters.getSelectedZones()
    });
    expect(model.workbook.cells.B1.border).not.toBeDefined();
  });

  test("can clear formatting (border) after selecting all cells", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.dispatch({ type: "ALTER_SELECTION", cell: [25, 99] });
    expect(model.workbook.selection.zones[0]).toEqual({
      left: 0,
      top: 0,
      right: model.workbook.cols.length - 1,
      bottom: model.workbook.rows.length - 1
    });
    setBorder(model, "all");
    expect(model.workbook.cells.B1.border).toBeDefined();
    setBorder(model, "clear");
    expect(model.workbook.cells.B1).not.toBeDefined();
  });
});
