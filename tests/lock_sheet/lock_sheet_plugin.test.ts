import {
  Command,
  CommandResult,
  CoreCommand,
  Model,
  isCoreCommand,
  isSheetDependent,
  lockedSheetAllowedCommands,
} from "../../src";
import { createChart, createSheet, lockSheet } from "../test_helpers/commands_helpers";
import { TEST_COMMANDS } from "../test_helpers/constants";
import { toCellPosition } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

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

  test.each(["UPDATE_CHART", "UPDATE_PIVOT"])(
    "%s command bypass lock in dashboard mode",
    (cmdType: Command["type"]) => {
      const model = new Model();
      createSheet(model, { name: "Another sheet", position: 0 });
      createChart(model, { type: "bar" }, "chartId");
      addPivot(model);
      lockSheet(model);
      model.updateMode("dashboard");
      const result = model.dispatch(cmdType, TEST_COMMANDS[cmdType]);
      expect(result).toBeSuccessfullyDispatched();
    }
  );

  test("sheet navigation commands are allowed on locked sheets", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const lockedSheetId = "locked";
    createSheet(model, {
      name: "Another sheet",
      position: 0,
      sheetId: lockedSheetId,
      activate: true,
    });
    lockSheet(model);
    expect(
      model.dispatch("SCROLL_TO_CELL", toCellPosition(lockedSheetId, "Z100"))
    ).toBeSuccessfullyDispatched();
    expect(model.dispatch("SHIFT_VIEWPORT_UP")).toBeSuccessfullyDispatched();
    expect(model.dispatch("SHIFT_VIEWPORT_DOWN")).toBeSuccessfullyDispatched();
    model.dispatch("ACTIVATE_NEXT_SHEET");
    expect(model.getters.getActiveSheetId()).toBe(firstSheetId);
    lockSheet(model);
    model.dispatch("ACTIVATE_PREVIOUS_SHEET");
    expect(model.getters.getActiveSheetId()).toBe(lockedSheetId);
  });
});
