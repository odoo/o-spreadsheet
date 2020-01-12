import { GridModel } from "../../src/grid_model";

let n = 0;

function observeModel(model: GridModel) {
  n = 0;
  model.on("update", null, () => n++);
}

describe("selection", () => {
  test("if A1 is in a merge, it is initially properly selected", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["A1:B3"]
    });
    expect(model.selection).toEqual({ left: 0, top: 0, right: 1, bottom: 2 });
  });

  test("can select selection with shift-arrow", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B1:C2"]
    });
    observeModel(model);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    expect(n).toBe(0);
    model.moveSelection(1, 0);
    expect(n).toBe(1);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("cannot expand select selection with shift-arrow if it is out of bound", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10
    });
    model.selectCell(0, 1);
    observeModel(model);
    expect(n).toBe(0);
    model.moveSelection(0, -1);
    expect(n).toBe(1);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    model.moveSelection(0, -1);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 0, bottom: 1 });
    expect(n).toBe(1);
  });

  test("can expand selection with mouse", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B1:C2"]
    });
    observeModel(model);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    expect(n).toBe(0);
    model.updateSelection(1, 0);
    expect(n).toBe(1);
    expect(model.selection).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });

  test("move selection in and out of a merge (in opposite direction)", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["C1:D2"]
    });
    model.selectCell(1, 0);
    observeModel(model);

    // move to the right, inside the merge
    expect(n).toBe(0);
    model.moveSelection(1, 0);
    expect(n).toBe(1);

    expect(model.selection).toEqual({ top: 0, right: 3, left: 1, bottom: 1 });
    expect(model.activeXc).toBe("B1");

    // move to the left, outside the merge
    model.moveSelection(-1, 0);
    expect(n).toBe(2);
    expect(model.selection).toEqual({ top: 0, right: 1, left: 1, bottom: 1 });
    expect(model.activeXc).toBe("B1");
  });

  test("update selection in some different directions", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B2:C3"]
    });
    // move sell to B4
    model.selectCell(1, 3);
    expect(model.activeXc).toBe("B4");
    observeModel(model);

    // move up, inside the merge
    expect(n).toBe(0);
    model.moveSelection(0, -1);
    expect(n).toBe(1);

    expect(model.selection).toEqual({ top: 1, right: 2, left: 1, bottom: 3 });

    // move to the left, outside the merge
    model.moveSelection(-1, 0);
    expect(n).toBe(2);
    expect(model.selection).toEqual({ top: 1, right: 2, left: 0, bottom: 3 });
  });

  test("expand selection when encountering a merge", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      merges: ["B2:B3", "C2:D2"]
    });
    // move sell to B4
    model.selectCell(1, 2);
    expect(model.activeXc).toBe("B3");

    // select right cell C3
    model.updateSelection(2, 2);

    expect(model.selection).toEqual({ top: 1, right: 3, left: 1, bottom: 2 });
  });

});
