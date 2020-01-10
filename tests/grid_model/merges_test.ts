import { GridModel } from "../../src/grid_model";

let n = 0;

function observeModel(model: GridModel) {
  n = 0;
  model.on("update", null, () => n++);
}

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    observeModel(model);
    expect(Object.keys(model.cells)).toEqual(["B2", "B3"]);
    expect(Object.keys(model.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.merges)).toEqual([]);

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.updateSelection(1, 2);
    expect(n).toBe(2);
    model.mergeSelection();
    expect(n).toBe(3);

    expect(Object.keys(model.cells)).toEqual(["B2"]);
    expect(model.cells.B2.content).toBe("b2");
    expect(Object.keys(model.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });
  });

  test("can unmerge two cells", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } },
      merges: ["B2:B3"]
    });
    observeModel(model);

    expect(Object.keys(model.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.unmergeSelection();
    expect(n).toBe(2);
    expect(Object.keys(model.cells)).toEqual(["B2"]);
    expect(Object.keys(model.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.merges)).toEqual([]);
  });

  test("a single cell is not merged", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } }
    });
    observeModel(model);

    expect(Object.keys(model.merges)).toEqual([]);

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.mergeSelection();
    expect(n).toBe(1);

    expect(Object.keys(model.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.merges)).toEqual([]);
  });

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
});
