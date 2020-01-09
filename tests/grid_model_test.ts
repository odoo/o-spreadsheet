import { GridModel } from "../src/grid_model";

describe("copy/cut/paste", () => {
  test("can copy a cell", () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" } }
    });
    expect(model.cells).toBe({});
  });
});
