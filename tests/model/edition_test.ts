import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new GridModel();
    // adding
    model.startEditing("a");
    model.stopEditing();
    expect(Object.keys(model.state.cells)).toEqual(["A1"]);
    expect(model.state.cells["A1"].content).toBe("a");

    // removing
    model.startEditing();
    model.state.currentContent = "";
    model.stopEditing();
    expect(model.state.cells).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
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
    expect(model.state.cells["A2"].content).toBe("a2");
    model.selectCell(0, 1);
    model.deleteSelection();
    expect("A2" in model.state.cells).toBeTruthy();
    expect(model.state.cells["A2"].content).toBe("");
  });
});
