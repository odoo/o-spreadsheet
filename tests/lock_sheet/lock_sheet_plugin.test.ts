import { Command, CommandResult, Model, overrideLockCommands } from "../../src";
import {
  createSheet,
  deleteSheet,
  duplicateSheet,
  lockSheet,
} from "../test_helpers/commands_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";

const allowedCommands: Command["type"][] = [];
const rejectedCommands: Command["type"][] = [];

(Object.keys(TEST_COMMANDS) as Command["type"][]).forEach((cmdType) => {
  if (overrideLockCommands.has(cmdType)) {
    allowedCommands.push(cmdType);
  } else {
    rejectedCommands.push(cmdType);
  }
});

describe("Lock Sheet plugin", () => {
  test.each<Command["type"]>(rejectedCommands)(
    "Cannot dispatch blacklisted command %s on a locked sheet",
    (cmdType) => {
      const model = new Model();
      lockSheet(model);
      const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
      expect(result.reasons).toContain(CommandResult.SheetLocked);
    }
  );

  test.each<Command["type"]>(allowedCommands)(
    "Can dispatch white listed command %s on a locked sheet",
    (cmdType) => {
      const model = new Model();
      createSheet(model, { name: "Another sheet", position: 0 });
      lockSheet(model);
      const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
      expect(result).toBeSuccessfullyDispatched();
    }
  );

  test("Commands rejected on locked sheet trigger a notification", () => {
    const model = new Model();
    lockSheet(model);
    const spyTrigger = jest.spyOn(model, "trigger");
    const result = deleteSheet(model, model.getters.getActiveSheetId());
    expect(result.reasons).toContain(CommandResult.SheetLocked);
    expect(spyTrigger).toHaveBeenCalledWith("raise-error-ui", {
      text: "This sheet is locked and cannot be modified. Please unlock it first.",
    });
  });

  test("Duplicating a locked sheet creates an unlocked copy", () => {
    const model = new Model();
    createSheet(model, { name: "Another sheet", position: 0 });
    const sheetId = model.getters.getActiveSheetId();
    lockSheet(model);
    const result = duplicateSheet(model, sheetId, "Duplicated");
    expect(result).toBeSuccessfullyDispatched();
    const newSheet = model.getters.getSheet("Duplicated");
    expect(newSheet).toBeDefined();
    expect(newSheet?.isLocked).toBe(false);
  });
});
