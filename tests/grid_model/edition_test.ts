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

  test("deleting a cell with style does not remove it", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { A2: { style: 1, content: "a2" } }
        }
      ],
      styles: {
        1: { fillColor: "red" }
      }
    });

    // removing
    expect(model.cells["A2"].content).toBe("a2");
    model.deleteCell("A2");
    expect("A2" in model.cells).toBeTruthy();
    expect(model.cells["A2"].content).toBe("");
  });
});
