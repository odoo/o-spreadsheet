import {
  Command,
  CommandResult,
  Model,
  lockedSheetAllowedCommands,
  readonlyAllowedCommands,
} from "../../src";
import { createChart, createSheet, deleteSheet, lockSheet } from "../test_helpers/commands_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";
import { addPivot } from "../test_helpers/pivot_helpers";

const allowedCommands: Command["type"][] = [];
const rejectedCommands: Command["type"][] = [];
const readonlyCommands: Command["type"][] = [];

(Object.keys(TEST_COMMANDS) as Command["type"][]).forEach((cmdType) => {
  if (lockedSheetAllowedCommands.has(cmdType)) {
    allowedCommands.push(cmdType);
  } else {
    rejectedCommands.push(cmdType);
  }
  if (readonlyAllowedCommands.has(cmdType)) {
    readonlyCommands.push(cmdType);
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

  describe("white-liste commands", () => {
    let model: Model;
    beforeAll(() => {
      model = new Model();
      createSheet(model, { name: "Another sheet", position: 0 });
      lockSheet(model);
    });

    test.each<Command["type"]>(allowedCommands)(
      "Can dispatch white-listed command %s on a locked sheet",
      (cmdType) => {
        const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
        expect(result).toBeSuccessfullyDispatched();
      }
    );
  });

  test("Commands rejected on locked sheet trigger a notification", () => {
    const model = new Model();
    lockSheet(model);
    const spyTrigger = jest.spyOn(model, "trigger");
    const result = deleteSheet(model, model.getters.getActiveSheetId());
    expect(result.reasons).toContain(CommandResult.SheetLocked);
    expect(spyTrigger).toHaveBeenCalledWith("notify-ui", {
      text: "This sheet is locked and cannot be modified. Please unlock it first.",
      type: "info",
      sticky: false,
    });
  });

  describe("white-liste commands", () => {
    let model: Model;
    beforeAll(() => {
      model = new Model();
      createSheet(model, { name: "Another sheet", position: 0 });
      createChart(model, { type: "bar" }, "chartId");
      addPivot(model);
      lockSheet(model);
      model.updateMode("dashboard");
    });

    test.each<Command["type"]>(readonlyCommands)(
      "read only commands bypass lock in dashboard mode: %s",
      (cmdType) => {
        const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
        expect(result).toBeSuccessfullyDispatched();
      }
    );
  });
});
