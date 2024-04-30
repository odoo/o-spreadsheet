import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsRowsCommand,
  AddConditionalFormatCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  MoveReferencesCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
} from "../../../src/types";
import {
  OT_TESTS_RANGE_DEPENDANT_COMMANDS,
  OT_TESTS_SINGLE_CELL_COMMANDS,
  OT_TESTS_TARGET_DEPENDANT_COMMANDS,
  OT_TESTS_ZONE_DEPENDANT_COMMANDS,
  TEST_COMMANDS,
} from "../../test_helpers/constants";
import { toRangesData } from "../../test_helpers/helpers";

describe("OT with DELETE_SHEET", () => {
  const deletedSheetId = "deletedSheet";
  const sheetId = "stillPresent";
  const deleteSheet: DeleteSheetCommand = { type: "DELETE_SHEET", sheetId: deletedSheetId };

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
    ...OT_TESTS_TARGET_DEPENDANT_COMMANDS,
    ...OT_TESTS_RANGE_DEPENDANT_COMMANDS,
    ...OT_TESTS_ZONE_DEPENDANT_COMMANDS,
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
  ])("Delete sheet", (cmd) => {
    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete a sheet other than the one on which the command is triggered", () => {
      const command = { ...cmd, sheetId };
      const result = transform(command, deleteSheet);
      expect(result).toEqual(command);
    });
  });

  describe("Delete sheet with duplicate sheet", () => {
    const cmd: Omit<DuplicateSheetCommand, "sheetId"> = {
      type: "DUPLICATE_SHEET",
      sheetIdTo: "sheetIdTo",
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet on which the command is triggered", () => {
      const command = { ...cmd, sheetId };
      const result = transform(command, deleteSheet);
      expect(result).toEqual(command);
    });
  });

  describe("Delete sheet with move references", () => {
    const cmd: MoveReferencesCommand = {
      type: "MOVE_REFERENCES",
      sheetId,
      targetSheetId: "sheet2",
      targetCol: 0,
      targetRow: 0,
      zone: toZone("A1"),
    };

    test("Delete the source sheet", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the target sheet", () => {
      const result = transform({ ...cmd, targetSheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete another sheet", () => {
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });

    test("Delete the sheet source and target sheet", () => {
      const result = transform(
        { ...cmd, sheetId: deletedSheetId, targetSheetId: deletedSheetId },
        deleteSheet
      );
      expect(result).toBeUndefined();
    });
  });

  describe("Delete sheet with range dependant command", () => {
    const addCF: AddConditionalFormatCommand = { ...TEST_COMMANDS.ADD_CONDITIONAL_FORMAT };

    test("Delete the sheet of the command", () => {
      const cmd = { ...addCF, sheetId: deletedSheetId, ranges: toRangesData(sheetId, "A1:B1") };
      const result = transform(cmd, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet of the ranges", () => {
      const cmd = { ...addCF, sheetId: sheetId, ranges: toRangesData(deletedSheetId, "A1:B1") };
      const result = transform(cmd, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet of some of the ranges", () => {
      const cmd = {
        ...addCF,
        sheetId: sheetId,
        ranges: [...toRangesData(deletedSheetId, "A1:B1"), ...toRangesData(sheetId, "A1:B1")],
      };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual({ ...cmd, ranges: toRangesData(sheetId, "A1:B1") });
    });
  });
});
