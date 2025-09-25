import { transform } from "@odoo/o-spreadsheet-engine/collaborative/ot/ot";
import {
  AddColumnsRowsCommand,
  LockSheetCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
} from "../../../src/types";
import {
  OT_TESTS_SINGLE_CELL_COMMANDS,
  TEST_COMMANDS,
  TEST_COMMANDS_RANGE_DEPENDENT,
  TEST_COMMANDS_TARGET_DEPENDENT,
  TEST_COMMANDS_ZONE_DEPENDENT,
} from "../../test_helpers/constants";

describe("OT with LOCK_SHEET", () => {
  const lockedSheetId = "lockedSheet";
  const sheetId = "unlockedSheet";
  const lockSheet: LockSheetCommand = {
    type: "LOCK_SHEET",
    sheetId: lockedSheetId,
  };

  const addColumns: Omit<AddColumnsRowsCommand, "sheetId"> = {
    ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
    dimension: "COL",
  };
  const addRows: Omit<AddColumnsRowsCommand, "sheetId"> = {
    ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
    dimension: "ROW",
  };
  const removeColumn: RemoveColumnsRowsCommand = {
    ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
    dimension: "COL",
  };
  const removeRows: RemoveColumnsRowsCommand = {
    ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
    dimension: "ROW",
  };

  const resizeColumns: ResizeColumnsRowsCommand = {
    ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
    dimension: "COL",
  };
  const resizeRows: ResizeColumnsRowsCommand = {
    ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
    dimension: "ROW",
  };

  describe.each([
    ...OT_TESTS_SINGLE_CELL_COMMANDS,
    ...TEST_COMMANDS_TARGET_DEPENDENT,
    ...TEST_COMMANDS_RANGE_DEPENDENT,
    ...TEST_COMMANDS_ZONE_DEPENDENT,
    addColumns,
    addRows,
    removeColumn,
    removeRows,
    TEST_COMMANDS.ADD_MERGE,
    TEST_COMMANDS.REMOVE_MERGE,
    TEST_COMMANDS.MOVE_SHEET,
    TEST_COMMANDS.HIDE_SHEET,
    TEST_COMMANDS.SHOW_SHEET,
    TEST_COMMANDS.RENAME_SHEET,
    TEST_COMMANDS.COLOR_SHEET,
    TEST_COMMANDS.CREATE_FIGURE,
    TEST_COMMANDS.CREATE_CHART,
    resizeColumns,
    resizeRows,
    TEST_COMMANDS.REMOVE_CONDITIONAL_FORMAT,
    TEST_COMMANDS.DELETE_SHEET,
    TEST_COMMANDS.MOVE_RANGES,
    TEST_COMMANDS.GROUP_HEADERS,
    TEST_COMMANDS.UNGROUP_HEADERS,
    TEST_COMMANDS.FOLD_HEADER_GROUP,
    TEST_COMMANDS.UNFOLD_HEADER_GROUP,
    TEST_COMMANDS.REMOVE_DATA_VALIDATION_RULE,
  ])("Lock sheet", (cmd) => {
    test("lock the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetId: lockedSheetId }, lockSheet);
      expect(result).toBeUndefined();
    });

    test("lock a sheet other than the one on which the command is triggered", () => {
      const command = { ...cmd, sheetId };
      const result = transform(command, lockSheet);
      expect(result).toEqual(command);
    });
  });
});
