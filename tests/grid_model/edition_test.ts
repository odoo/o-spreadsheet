import { GridModel } from "../../src/grid_model";

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {}
        }
      ]
    });
    // adding
    model.startEditing("a");
    model.stopEditing();
    expect(Object.keys(model.cells)).toEqual(["A1"]);
    expect(model.cells["A1"].content).toBe("a");

    // removing
    model.startEditing();
    model.currentContent = "";
    model.stopEditing();
    expect(model.cells).toEqual({});
  });
});
