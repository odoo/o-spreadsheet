import {
  Command,
  CommandResult,
  CoreCommand,
  Model,
  isCoreCommand,
  isSheetDependent,
  lockedSheetAllowedCommands,
} from "../../src";
import { createSheet, lockSheet } from "../test_helpers/commands_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";

const allowedCommands: Command["type"][] = [];
const rejectedCommands: Command["type"][] = [];

(Object.keys(TEST_COMMANDS) as CoreCommand["type"][]).forEach((cmdType, cmd) => {
  if (
    lockedSheetAllowedCommands.has(cmdType) ||
    (isCoreCommand(TEST_COMMANDS[cmdType]) && !isSheetDependent(TEST_COMMANDS[cmdType]))
  ) {
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

  test("Can dispatch white-listed commands on a locked sheet", () => {
    const model = new Model();
    createSheet(model, { name: "Another sheet", position: 0 });
    lockSheet(model);
    for (const cmdType of allowedCommands) {
      const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
      expect(result.reasons).not.toContain(CommandResult.SheetLocked);
    }
  });

  //MATHO

  // test("read only commands bypass lock in dashboard mode", () => {
  //   for (const cmdType of readonlyCommands) {
  //     const model = new Model();
  //     createSheet(model, { name: "Another sheet", position: 0 });
  //     createChart(model, { type: "bar" }, "chartId");
  //     addPivot(model);
  //     lockSheet(model);
  //     model.updateMode("dashboard");
  //     const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
  //     expect(result).toBeSuccessfullyDispatched();
  //   }
  // });
});
