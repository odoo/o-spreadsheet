import { GridModel } from "../../src/grid_model";

let n = 0;

function observeModel(model: GridModel) {
  n = 0;
  model.on("update", null, () => n++);
}

describe("navigation", () => {
  test("normal move to the right", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10
    });
    observeModel(model);
    expect(model.selection).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.activeCol).toBe(0);
    expect(model.activeRow).toBe(0);

    expect(n).toBe(0);

    model.moveSelection(1, 0);
    expect(model.selection).toEqual({ top: 0, right: 1, left: 1, bottom: 0 });
    expect(model.activeCol).toBe(1);
    expect(model.activeRow).toBe(0);
    expect(n).toBe(1);
  });

  test("move up from top row", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10
    });
    observeModel(model);
    expect(model.selection).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.activeCol).toBe(0);
    expect(model.activeRow).toBe(0);

    expect(n).toBe(0);

    model.moveSelection(0, -1);
    expect(model.selection).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.activeCol).toBe(0);
    expect(model.activeRow).toBe(0);
    expect(n).toBe(0);
  });

  test("move in and out of a merge", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B1:C2"]
    });
    observeModel(model);
    expect(model.activeCol).toBe(0);
    expect(model.activeRow).toBe(0);

    // move to the right, inside the merge
    expect(n).toBe(0);
    model.moveSelection(1, 0);
    expect(n).toBe(1);

    expect(model.selection).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.activeCol).toBe(1);
    expect(model.activeRow).toBe(0);

    // move to the right, outside the merge
    model.moveSelection(1, 0);
    expect(n).toBe(2);
    expect(model.selection).toEqual({ top: 0, right: 3, left: 3, bottom: 0 });
    expect(model.activeCol).toBe(3);
    expect(model.activeRow).toBe(0);
    expect(model.activeXc).toBe("D1");
  });

  test("do nothing if moving out of merge is out of grid", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B1:C2"]
    });
    observeModel(model);
    expect(model.activeCol).toBe(0);
    expect(model.activeRow).toBe(0);

    // put selection below merge
    model.selectCell(1, 2);
    expect(n).toBe(1);

    // enter merge from below
    expect(model.activeXc).toBe("B3");
    model.moveSelection(0, -1);
    expect(model.activeXc).toBe("B2");
    expect(n).toBe(2);

    expect(model.selection).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.activeCol).toBe(1);
    expect(model.activeRow).toBe(1);

    // move to the top, outside the merge
    model.moveSelection(0, -1);
    expect(n).toBe(2);
    expect(model.selection).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.activeCol).toBe(1);
    expect(model.activeRow).toBe(1);
  });
});
