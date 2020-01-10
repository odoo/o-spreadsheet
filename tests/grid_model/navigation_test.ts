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
});
