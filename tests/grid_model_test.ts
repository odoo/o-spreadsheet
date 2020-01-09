import { GridModel } from "../src/grid_model";

describe("copy/cut/paste", () => {
  test("can copy a cell", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } }
    });
    expect(model.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.selectCell(1, 1);
    model.copySelection();
    model.selectCell(3, 1);
    model.pasteSelection();
    expect(model.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });
  });

  test("can cut/paste a cell", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } }
    });
    expect(model.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.selectCell(1, 1);
    model.copySelection(true);
    expect(model.cells).toEqual({});
    model.selectCell(3, 1);
    model.pasteSelection();
    expect(model.cells).toEqual({
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });
  });
});

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    let n = 0;
    model.on("update", null, () => n++);
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
    let n = 0;
    model.on("update", null, () => n++);

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
    let n = 0;
    model.on("update", null, () => n++);

    expect(Object.keys(model.merges)).toEqual([]);

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.mergeSelection();
    expect(n).toBe(1);

    expect(Object.keys(model.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.merges)).toEqual([]);
  });
});

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const data = {
        colNumber: 3,
        rowNumber: 3,
        cells: {
            A1: { content: "1" },
            B1: { content: "2" },
            C1: { content: "=SUM(A1,B1)" }
        }
    }
    const grid = new GridModel(data);
    expect(grid.cells["C1"].value).toEqual(3)
  });

  test("With empty content", () => {
    const data = {
        colNumber: 3,
        rowNumber: 3,
        cells: {
            A1: { content: "1" },
            B1: { content: "" },
            C1: { content: "=SUM(A1,B1)" }
        }
    }
    const grid = new GridModel(data);
    expect(grid.cells["C1"].value).toEqual(1)
  });

  test("With empty cell", () => {
    const data = {
        colNumber: 3,
        rowNumber: 3,
        cells: {
            A1: { content: "1" },
            C1: { content: "=SUM(A1,B1)" }
        }
    }
    const grid = new GridModel(data);
    expect(grid.cells["C1"].value).toEqual(1)
  });

});
