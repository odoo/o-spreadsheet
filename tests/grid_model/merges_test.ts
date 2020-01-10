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
});
