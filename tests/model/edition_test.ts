import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new GridModel();
    // adding
    model.startEditing("a");
    model.stopEditing();
    expect(Object.keys(model.workbook.cells)).toEqual(["A1"]);
    expect(model.workbook.cells["A1"].content).toBe("a");

    // removing
    model.startEditing();
    model.workbook.currentContent = "";
    model.stopEditing();
    expect(model.workbook.cells).toEqual({});
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
    expect(model.workbook.cells["A2"].content).toBe("a2");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
    model.deleteSelection();
    expect("A2" in model.workbook.cells).toBeTruthy();
    expect(model.workbook.cells["A2"].content).toBe("");
  });
});
