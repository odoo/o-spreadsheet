import { Model } from "../../src";
import { redo, undo } from "../test_helpers/commands_helpers";

describe("Transaction", () => {
  let model: Model;
  beforeEach(() => {
    model = new Model();
  });
  test("TRANSACTION dispatches multiple commands to all plugins", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    model.dispatch("TRANSACTION", {
      commands: [
        {
          type: "CREATE_SHEET",
          position: 1,
          name: "Sheet2",
          sheetId: firstSheetId,
        },
        {
          type: "RENAME_SHEET",
          sheetId: firstSheetId,
          name: "superSheet",
        },
        {
          type: "EVALUATE_CELLS",
        },
      ],
    });
    expect(model.getters.getSheetIds().length).toBe(2);
    expect(model.getters.getSheet(firstSheetId).name).toBe("superSheet");
  });

  test("Commands of TRANSACTION are in the same history batch", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const firstSheetName = model.getters.getSheet(firstSheetId).name;
    model.dispatch("TRANSACTION", {
      commands: [
        {
          type: "CREATE_SHEET",
          position: 1,
          name: "Sheet2",
          sheetId: firstSheetId,
        },
        {
          type: "RENAME_SHEET",
          sheetId: firstSheetId,
          name: "superSheet",
        },
      ],
    });
    expect(model.getters.getSheetIds().length).toBe(2);
    expect(model.getters.getSheet(firstSheetId).name).toBe("superSheet");
    undo(model);
    expect(model.getters.getSheetIds().length).toBe(1);
    expect(model.getters.getSheet(firstSheetId).name).toBe(firstSheetName);
    redo(model);
    expect(model.getters.getSheetIds().length).toBe(2);
    expect(model.getters.getSheet(firstSheetId).name).toBe("superSheet");
  });
});
