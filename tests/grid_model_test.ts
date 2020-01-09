import { GridModel } from "../src/grid_model";

describe("copy/cut/paste", () => {
  test("can copy a cell", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } }
    });
    expect(model.cells).toEqual({
        B2: {col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2"}
    });

    model.selectCell(1, 1);
    model.copySelection();
    model.selectCell(3, 1);
    model.pasteSelection();
    expect(model.cells).toEqual({
        B2: {col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2"},
        D2: {col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2"}
    });
  });
});
