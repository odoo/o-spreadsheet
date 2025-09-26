import { Command, CommandResult, Model } from "../../src";
import { whiteListedTypes } from "../../src/plugins/ui_feature/lock_sheet";
import { createSheet, deleteSheet, lockSheet } from "../test_helpers/commands_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";

const allowedCommands: Command["type"][] = [];
const rejectedCommands: Command["type"][] = [];
whiteListedTypes;

(Object.keys(TEST_COMMANDS) as Command["type"][]).forEach((cmdType) => {
  if (whiteListedTypes.includes(cmdType)) {
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
});
