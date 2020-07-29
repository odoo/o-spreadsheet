import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new Model();
    // adding
    model.dispatch("START_EDITION", { text: "a" });
    model.dispatch("STOP_EDITION");
    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["A1"]);
    expect(model["workbook"].activeSheet.cells["A1"].content).toBe("a");

    // removing
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    model.dispatch("STOP_EDITION");
    expect(model["workbook"].activeSheet.cells).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { A2: { style: 1, content: "a2" } },
        },
      ],
      styles: {
        1: { fillColor: "red" },
      },
    });

    // removing
    expect(model["workbook"].activeSheet.cells["A2"].content).toBe("a2");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect("A2" in model["workbook"].activeSheet.cells).toBeTruthy();
    expect(model["workbook"].activeSheet.cells["A2"].content).toBe("");
  });

  test("editing a cell, then activating a new sheet: edition should be stopped", () => {
    const model = new Model();
    const sheet1 = model["workbook"].visibleSheets[0];
    model.dispatch("START_EDITION", { text: "a" });
    expect(model.getters.getEditionMode()).toBe("editing");
    model.dispatch("CREATE_SHEET", { activate: true, id: "42" });
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCell(model, "A1")).toBe(null);
    model.dispatch("ACTIVATE_SHEET", { from: model.getters.getActiveSheet(), to: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("a");
  });
});
