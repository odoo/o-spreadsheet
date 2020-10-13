import "./canvas.mock";
import { CommandResult } from "../src/types";
import { MultiuserInstance } from "./multiuser_helpers";

describe.skip("Multiuser", () => {
  test("Can share a basic command", () => {
    const instance = new MultiuserInstance();
    instance.getClient("1").getModel().dispatch = jest.fn(
      () => ({ status: "SUCCESS" } as CommandResult)
    );
    instance.getClient("0").dispatch("CREATE_SHEET", { sheetId: "42" });
    expect(instance.getClient("1").getModel().dispatch).toHaveBeenCalledWith("MULTIUSER", {
      command: { type: "CREATE_SHEET", sheetId: "42" },
    });
  });
  test("Can share a UPDATE_CELL command", () => {
    const instance = new MultiuserInstance();
    const sheetId = instance.getClient("0").getters().getActiveSheetId();
    instance.getClient("0").dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "test" });
    expect(instance.getClient("0").getters().getCell(0, 0)!.content).toBe("test");
    expect(instance.getClient("1").getters().getCell(0, 0)!.content).toBe("test");
  });
  test("State of queue is correct", () => {
    const instance = new MultiuserInstance(3, { autoDispatch: false });
    const sheetId = instance.getClient("0").getters().getActiveSheetId();
    instance.getClient("0").dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "test" });
    expect(instance.getServer().getQueue("0")).toHaveLength(0);
    expect(instance.getServer().getQueue("1")).toHaveLength(1);
    expect(instance.getServer().getQueue("2")).toHaveLength(1);
  });
});
describe.skip("Operational Transform", () => {
  test("CREATE_SHEET and MOVE_SHEET", () => {
    const instance = new MultiuserInstance(
      2,
      { autoDispatch: false },
      {
        sheets: [
          {
            id: "1",
            name: "1",
          },
          {
            id: "2",
            name: "2",
          },
        ],
      }
    );
    const sheetId = "3";
    instance.getClient("0").dispatch("CREATE_SHEET", { sheetId });
    instance.getClient("1").dispatch("MOVE_SHEET", { sheetId: "1", direction: "right" });
    instance.getServer().processQueue("1");
    instance.getServer().processQueue("0");
    // process
    expect(instance.getClient("0").getters().getVisibleSheets()).toEqual(["2", "1", "3"]);
    expect(instance.getClient("1").getters().getVisibleSheets()).toEqual(["2", "1", "3"]);
  });
});
