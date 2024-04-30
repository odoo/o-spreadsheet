import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsRowsCommand,
  AddConditionalFormatCommand,
  AddMergeCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  CreateFilterTableCommand,
  DeleteContentCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
  MoveReferencesCommand,
  RemoveColumnsRowsCommand,
  RemoveFilterTableCommand,
  RemoveMergeCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../../src/types";
import { createEqualCF, target, toRangesData } from "../../test_helpers/helpers";

describe("OT with REMOVE_COLUMN", () => {
  const sheetId = "Sheet1";
  const removeColumns: RemoveColumnsRowsCommand = {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "COL",
    elements: [2, 5, 3],
    sheetId,
  };

  const updateCell: Omit<UpdateCellCommand, "col"> = {
    type: "UPDATE_CELL",
    sheetId,
    content: "test",
    row: 10,
  };
  const updateCellPosition: Omit<UpdateCellPositionCommand, "col"> = {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId,
    row: 10,
  };
  const clearCell: Omit<ClearCellCommand, "col"> = {
    type: "CLEAR_CELL",
    sheetId,
    row: 10,
  };
  const setBorder: Omit<SetBorderCommand, "col"> = {
    type: "SET_BORDER",
    sheetId,
    row: 1,
    border: { left: ["thin", "#000"] },
  };

  describe.each([updateCell, updateCellPosition, clearCell, setBorder])(
    "single cell commands",
    (cmd) => {
      test(`remove columns before ${cmd.type}`, () => {
        const command = { ...cmd, col: 10 };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, col: 7 });
      });
      test(`remove columns after ${cmd.type}`, () => {
        const command = { ...cmd, col: 1 };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns before and after ${cmd.type}`, () => {
        const command = { ...cmd, col: 4 };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, col: 2 });
      });
      test(`${cmd.type} in removed columns`, () => {
        const command = { ...cmd, col: 2 };
        const result = transform(command, removeColumns);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} and columns removed in different sheets`, () => {
        const command = { ...cmd, col: 10, sheetId: "42" };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`with many col elements in growing order`, () => {
        const command = { ...cmd, col: 8 };
        const result = transform(command, { ...removeColumns, elements: [2, 3, 4, 5, 6] });
        expect(result).toEqual({ ...cmd, col: 3 });
      });
    }
  );

  const deleteContent: Omit<DeleteContentCommand, "target"> = {
    type: "DELETE_CONTENT",
    sheetId,
  };

  const setFormatting: Omit<SetFormattingCommand, "target"> = {
    type: "SET_FORMATTING",
    sheetId,
    style: { fillColor: "#000000" },
  };

  const clearFormatting: Omit<ClearFormattingCommand, "target"> = {
    type: "CLEAR_FORMATTING",
    sheetId,
  };

  const addConditionalFormat: Omit<AddConditionalFormatCommand, "ranges"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    sheetId,
    cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
  };
  const createFilters: Omit<CreateFilterTableCommand, "target"> = {
    type: "CREATE_FILTER_TABLE",
    sheetId,
  };

  const removeFilters: Omit<RemoveFilterTableCommand, "target"> = {
    type: "REMOVE_FILTER_TABLE",
    sheetId,
  };

  describe.each([deleteContent, setFormatting, clearFormatting, createFilters, removeFilters])(
    "target commands",
    (cmd) => {
      test(`remove columns after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:A3")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns before ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("M1:O2")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: [toZone("J1:L2")] });
      });
      test(`remove columns before and after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("E1:E2")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: [toZone("C1:C2")] });
      });
      test(`${cmd.type} in removed columns`, () => {
        const command = { ...cmd, target: [toZone("F1:G2")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: [toZone("D1:D2")] });
      });
      test(`${cmd.type} and columns removed in different sheets`, () => {
        const command = { ...cmd, target: [toZone("A1:F3")], sheetId: "42" };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} with a target removed`, () => {
        const command = { ...cmd, target: [toZone("C1:D2")] };
        const result = transform(command, removeColumns);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} with a target removed, but another valid`, () => {
        const command = { ...cmd, target: [toZone("C1:D2"), toZone("A1")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: [toZone("A1")] });
      });
    }
  );

  describe.each([addConditionalFormat])("ranges dependant commands", (cmd) => {
    test(`remove columns after ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A1:A3") };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns before ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "M1:O2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "J1:L2") });
    });
    test(`remove columns before in the shhet of the range ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "M1:O2"), sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "J1:L2") });
    });
    test(`remove columns before and after ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "E1:E2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "C1:C2") });
    });
    test(`${cmd.type} in removed columns`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "F1:G2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "D1:D2") });
    });
    test(`${cmd.type} and columns removed in different sheets`, () => {
      const command = { ...cmd, ranges: toRangesData("42", "A1:F3"), sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "C1:D2") };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "C1:D2,A1") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A1") });
    });

    describe("With unbounded ranges", () => {
      test(`remove columns after ${cmd.type}`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A:A") };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns before ${cmd.type}`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "M5:O") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "J5:L") });
      });
      test(`${cmd.type} in removed columns`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "F:G") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "D:D") });
      });
      test(`${cmd.type} with a target removed`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "C:D") };
        const result = transform(command, removeColumns);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} with a target removed, but another valid`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "C:D,A2:A") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A2:A") });
      });
    });
  });

  describe("OT with RemoveColumns - AddColumns", () => {
    const toTransform: Omit<AddColumnsRowsCommand, "base"> = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "COL",
      position: "after",
      quantity: 10,
      sheetId,
    };

    test("Add a removed columns", () => {
      const command = { ...toTransform, base: 2 };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });

    test("Add a column after the removed ones", () => {
      const command = { ...toTransform, base: 10 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, base: 7 });
    });

    test("Add a column before the removed ones", () => {
      const command = { ...toTransform, base: 0 };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Add on another sheet", () => {
      const command = { ...toTransform, base: 2, sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
  });

  describe("OT with two remove columns", () => {
    const toTransform: Omit<RemoveColumnsRowsCommand, "elements"> = {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: "COL",
      sheetId,
    };

    test("Remove a column which is in the removed columns", () => {
      const command = { ...toTransform, elements: [2] };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });

    test("Remove columns with one in the removed columns", () => {
      const command = { ...toTransform, elements: [0, 2] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, elements: [0] });
    });

    test("Remove a column before removed columns", () => {
      const command = { ...toTransform, elements: [0] };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Remove a column after removed columns", () => {
      const command = { ...toTransform, elements: [8] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, elements: [5] });
    });

    test("Remove a column inside removed columns", () => {
      const command = { ...toTransform, elements: [4] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, elements: [2] });
    });

    test("Remove a column on another sheet", () => {
      const command = { ...toTransform, elements: [4], sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Remove a column adjacent to removed columns", () => {
      const command = { ...toTransform, elements: [2] };
      const result = transform(command, { ...removeColumns, elements: [0, 1] });
      expect(result).toEqual({ ...command, elements: [0] });
    });
  });

  const resizeColumnsCommand: Omit<ResizeColumnsRowsCommand, "elements"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "COL",
    sheetId,
    size: 10,
  };

  describe("Columns removed - Resize columns", () => {
    test("Resize columns which are positioned before the removed columns", () => {
      const command = { ...resizeColumnsCommand, elements: [0, 1] };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Resize columns which are positioned before AND after the removed columns", () => {
      const command = { ...resizeColumnsCommand, elements: [0, 10] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, elements: [0, 7] });
    });

    test("Resize a column which is a deleted column", () => {
      const command = { ...resizeColumnsCommand, elements: [5] };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });

    test("Resize columns one of which is a deleted column", () => {
      const command = { ...resizeColumnsCommand, elements: [0, 5] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, elements: [0] });
    });
  });

  const addMerge: Omit<AddMergeCommand, "target"> = {
    type: "ADD_MERGE",
    sheetId,
  };
  const removeMerge: Omit<RemoveMergeCommand, "target"> = {
    type: "REMOVE_MERGE",
    sheetId,
  };
  describe.each([addMerge, removeMerge])("Remove Columns - Merge", (cmd) => {
    test(`remove columns before merge`, () => {
      const command = { ...cmd, target: target("A1:A3") };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns after merge`, () => {
      const command = { ...cmd, target: target("M1:O2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: target("J1:L2") });
    });
    test(`remove columns before and after merge`, () => {
      const command = { ...cmd, target: target("E1:E2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: target("C1:C2") });
    });
    test(`merge in removed columns`, () => {
      const command = { ...cmd, target: target("F1:G2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: target("D1:D2") });
    });
    test(`merge and columns removed in different sheets`, () => {
      const command = { ...cmd, target: target("A1:F3"), sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`merge with a target removed`, () => {
      const command = { ...cmd, target: target("C1:D2") };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });
  });

  describe("Removing column does not transform commands in dimension 'ROW'", () => {
    const addRowsAfter: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "ROW",
      position: "after",
      base: 5,
      quantity: 2,
      sheetId,
    };
    const addRowsBefore: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "ROW",
      position: "after",
      base: 5,
      quantity: 2,
      sheetId,
    };

    test("Add rows (after) after delete columns", () => {
      const result = transform(addRowsAfter, removeColumns);
      expect(result).toEqual(addRowsAfter);
    });
    test("Add rows (before) after delete columns", () => {
      const result = transform(addRowsBefore, removeColumns);
      expect(result).toEqual(addRowsBefore);
    });
  });

  describe("OT with RemoveColumns - FREEZE_COLUMNS", () => {
    const toTransform: Omit<FreezeColumnsCommand, "quantity"> = {
      type: "FREEZE_COLUMNS",
      sheetId,
    };

    test("freeze a column before the left-most deleted column", () => {
      const command = { ...toTransform, quantity: 2 };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Freeze a removed column", () => {
      const command = { ...toTransform, quantity: 3 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, quantity: 2 });
    });

    test("Freeze column after the removed ones", () => {
      const command = { ...toTransform, quantity: 10 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, quantity: 7 });
    });

    test("Freeze a column before the removed ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Freeze column on another sheet", () => {
      const command = { ...toTransform, quantity: 2, sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
  });

  describe("OT with removeColumns after/ before FREEZE_ROWS has no effect", () => {
    const toTransform: Omit<FreezeRowsCommand, "quantity"> = {
      type: "FREEZE_ROWS",
      sheetId,
    };

    test("freeze a row after added after column", () => {
      const command = { ...toTransform, quantity: 3 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command });
    });
  });

  describe("OT with MOVE_REFERENCES", () => {
    const moveReferencesCmd: MoveReferencesCommand = {
      type: "MOVE_REFERENCES",
      sheetId,
      zone: toZone("B2:C3"),
      targetSheetId: "Sheet2",
      targetCol: 1,
      targetRow: 1,
    };

    test("Columns removed before origin zone", () => {
      const removeColsCmd = { ...removeColumns, elements: [0] };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("A2:B3") });
    });

    test("Columns removed inside origin zone", () => {
      const removeColsCmd = { ...removeColumns, elements: [1] };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("B2:B3") });
    });

    test("Columns removed after origin zone", () => {
      const removeColsCmd = { ...removeColumns, elements: [4] };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });

    test("Remove all columns of origin zone", () => {
      const removeColsCmd = { ...removeColumns, elements: [1, 2] };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual(undefined);
    });

    test("Columns removed before target position", () => {
      const removeColsCmd = { ...removeColumns, elements: [0], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, targetCol: 0 });
    });

    test("Columns removed after target position", () => {
      const removeColsCmd = { ...removeColumns, elements: [5], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });

    test("Remove column of target position ", () => {
      const removeColsCmd = { ...removeColumns, elements: [1], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeColsCmd);
      expect(result).toEqual(undefined);
    });
  });
});
