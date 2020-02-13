import { GridModel } from "../../src/model/index";

describe("sheets", () => {
  test("can create a new sheet, then undo, then redo", () => {
    const model = new GridModel();
    expect(model.state.sheets.length).toBe(1);
    model.state.activeSheet = 0;
    model.state.activeSheetName = "Sheet1";

    model.createSheet();
    expect(model.state.sheets.length).toBe(2);
    model.state.activeSheet = 1;
    model.state.activeSheetName = "Sheet2";

    model.undo();
    expect(model.state.sheets.length).toBe(1);
    model.state.activeSheet = 0;
    model.state.activeSheetName = "Sheet1";

    model.redo();
    expect(model.state.sheets.length).toBe(2);
    model.state.activeSheet = 1;
    model.state.activeSheetName = "Sheet2";
  });
});
