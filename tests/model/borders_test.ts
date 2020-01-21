import { GridModel, GridState } from "../../src/model/index";

function getBorder(state: GridState, xc: string) {
  const cell = state.cells[xc];
  return cell && cell.border ? state.borders[cell.border] : null;
}

describe("borders", () => {
  test("can add and remove a border, on empty cell", () => {
    const model = new GridModel({});

    // select B2, set its top border, then clear it
    model.selectCell(1, 1);
    model.setBorder("top");
    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ top: ["thin", "#000"] });
    model.setBorder("clear");
    expect(model.state.cells.B2).not.toBeDefined();

    // select B2, set its left border, then clear it
    model.selectCell(1, 1);
    model.setBorder("left");
    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ left: ["thin", "#000"] });
    model.setBorder("clear");
    expect(model.state.cells.B2).not.toBeDefined();

    // select B2, set its bottom border, then clear it
    model.selectCell(1, 1);
    model.setBorder("bottom");
    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ bottom: ["thin", "#000"] });
    model.setBorder("clear");
    expect(model.state.cells.B2).not.toBeDefined();

    // select B2, set its right border, then clear it
    model.selectCell(1, 1);
    model.setBorder("right");
    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ right: ["thin", "#000"] });
    model.setBorder("clear");
    expect(model.state.cells.B2).not.toBeDefined();
  });

  test("can add and remove a top border, on existing cell", () => {
    const model = new GridModel({});

    // select B2
    model.setValue("B2", "content");
    model.selectCell(1, 1);

    // set a border top
    model.setBorder("top");

    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ top: ["thin", "#000"] });

    // clear borders
    model.setBorder("clear");
    expect(model.state.cells.B2.border).not.toBeDefined();
  });

  test("can add and remove a top border, on a selection", () => {
    const model = new GridModel({});

    // select B2:C2
    model.selectCell(1, 1);
    model.updateSelection(2, 1);

    // set a border top
    model.setBorder("top");

    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ top: ["thin", "#000"] });
    expect(model.state.cells.C2.border).toBeDefined();
    expect(getBorder(model.state, "C2")).toEqual({ top: ["thin", "#000"] });
  });

  test("can clear a zone", () => {
    const model = new GridModel({});

    // select C3 and add a border
    model.selectCell(2, 2);
    model.setBorder("top");
    expect(model.state.cells.C3.border).toBeDefined();

    // select A1:E6
    model.selectCell(0, 0);
    model.updateSelection(5, 5);

    // clear all borders
    model.setBorder("clear");

    expect(model.state.cells.C3).not.toBeDefined();
  });

  test("can set all borders in a zone", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:C3
    model.selectCell(1, 1);
    model.updateSelection(2, 2);

    // set all borders
    model.setBorder("all");
    const all = {
      left: ["thin", "#000"],
      top: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"]
    };
    expect(getBorder(model.state, "B2")).toEqual(all);
    expect(getBorder(model.state, "B3")).toEqual(all);
    expect(getBorder(model.state, "C2")).toEqual(all);
    expect(getBorder(model.state, "C3")).toEqual(all);
  });

  test("setting top border in a zone only set top row", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:C3
    model.selectCell(1, 1);
    model.updateSelection(2, 2);

    // set all borders
    model.setBorder("top");
    const border = {
      top: ["thin", "#000"]
    };
    expect(getBorder(model.state, "B2")).toEqual(border);
    expect(getBorder(model.state, "C2")).toEqual(border);
    expect(model.state.cells.B3).not.toBeDefined();
    expect(model.state.cells.C3).not.toBeDefined();
  });

  test("clearing a common border in a neighbour cell", () => {
    const model = new GridModel({});

    // select B2, then set its right border
    model.selectCell(1, 1);
    model.setBorder("right");
    expect(getBorder(model.state, "B2")).toEqual({ right: ["thin", "#000"] });

    // select C2 then clear it
    model.selectCell(2, 1);
    model.setBorder("clear");
    expect(model.state.cells.B2).not.toBeDefined();
  });

  test("setting external border in a zone works", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:D4
    model.selectCell(1, 1);
    model.updateSelection(3, 3);

    // set external borders
    model.setBorder("external");
    const s = ["thin", "#000"];
    expect(getBorder(model.state, "B2")).toEqual({ top: s, left: s });
    expect(getBorder(model.state, "C2")).toEqual({ top: s });
    expect(getBorder(model.state, "D2")).toEqual({ top: s, right: s });
    expect(getBorder(model.state, "B3")).toEqual({ left: s });
    expect(model.state.cells.C3).not.toBeDefined();
    expect(getBorder(model.state, "D3")).toEqual({ right: s });
    expect(getBorder(model.state, "B4")).toEqual({ bottom: s, left: s });
    expect(getBorder(model.state, "C4")).toEqual({ bottom: s });
    expect(getBorder(model.state, "D4")).toEqual({ bottom: s, right: s });
  });

  test("setting internal horizontal borders in a zone works", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:C4
    model.selectCell(1, 1);
    model.updateSelection(2, 3);

    // set external borders
    model.setBorder("h");
    const s = ["thin", "#000"];
    expect(model.state.cells.B2).not.toBeDefined();
    expect(model.state.cells.C2).not.toBeDefined();
    expect(getBorder(model.state, "B3")).toEqual({ top: s });
    expect(getBorder(model.state, "C3")).toEqual({ top: s });
    expect(getBorder(model.state, "B4")).toEqual({ top: s });
    expect(getBorder(model.state, "C4")).toEqual({ top: s });
  });

  test("setting internal vertical borders in a zone works", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:C4
    model.selectCell(1, 1);
    model.updateSelection(2, 3);

    // set external borders
    model.setBorder("v");
    const s = ["thin", "#000"];
    expect(model.state.cells.B2).not.toBeDefined();
    expect(model.state.cells.B3).not.toBeDefined();
    expect(model.state.cells.B4).not.toBeDefined();
    expect(getBorder(model.state, "C2")).toEqual({ left: s });
    expect(getBorder(model.state, "C3")).toEqual({ left: s });
    expect(getBorder(model.state, "C4")).toEqual({ left: s });
  });

  test("setting internal  borders in a zone works", () => {
    const model = new GridModel({});

    // select B2, then expand selection to B2:C4
    model.selectCell(1, 1);
    model.updateSelection(2, 3);

    // set external borders
    model.setBorder("hv");
    const s = ["thin", "#000"];
    expect(model.state.cells.B2).not.toBeDefined();
    expect(getBorder(model.state, "C2")).toEqual({ left: s });
    expect(getBorder(model.state, "B3")).toEqual({ top: s });
    expect(getBorder(model.state, "C3")).toEqual({ top: s, left: s });
    expect(getBorder(model.state, "B4")).toEqual({ top: s });
    expect(getBorder(model.state, "C4")).toEqual({ top: s, left: s });
  });
});
