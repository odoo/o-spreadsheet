import { GridModel, GridState } from "../../src/model/index";

function getBorder(state: GridState, xc: string) {
  const cell = state.cells[xc];
  return cell && cell.border ? state.borders[cell.border] : null;
}

describe("borders", () => {
  test("can add and remove a top border, on empty cell", () => {
    const model = new GridModel({});

    // select B2
    model.selectCell(1, 1);

    // set a border top
    model.setBorder("top");

    expect(model.state.cells.B2.border).toBeDefined();
    expect(getBorder(model.state, "B2")).toEqual({ top: ["thin", "#000"] });

    // clear borders
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
});
