import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new Model();
    // adding
    model.dispatch("START_EDITION", { text: "a" });
    model.dispatch("STOP_EDITION");
    expect(Object.keys(model.workbook.cells)).toEqual(["A1"]);
    expect(model.workbook.cells["A1"].content).toBe("a");

    // removing
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    model.dispatch("STOP_EDITION");
    expect(model.workbook.cells).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new Model({
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
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("DELETE_CONTENT", {
      sheet: model.state.activeSheet,
      target: model.getters.getSelectedZones()
    });
    expect("A2" in model.workbook.cells).toBeTruthy();
    expect(model.workbook.cells["A2"].content).toBe("");
  });
});
