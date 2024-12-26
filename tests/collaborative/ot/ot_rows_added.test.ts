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

describe("OT with ADD_COLUMNS_ROWS with dimension ROW", () => {
  const sheetId = "Sheet1";
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
    position: "before",
    base: 10,
    quantity: 2,
    sheetId,
  };
  const updateCell: Omit<UpdateCellCommand, "row"> = {
    type: "UPDATE_CELL",
    sheetId,
    content: "test",
    col: 1,
  };
  const updateCellPosition: Omit<UpdateCellPositionCommand, "row"> = {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId,
    col: 1,
  };
  const clearCell: Omit<ClearCellCommand, "row"> = {
    type: "CLEAR_CELL",
    sheetId,
    col: 1,
  };
  const setBorder: Omit<SetBorderCommand, "row"> = {
    type: "SET_BORDER",
    sheetId,
    col: 1,
    border: { left: ["thin", "#000"] },
  };
  describe.each([updateCell, updateCellPosition, clearCell, setBorder])(
    "OT with ADD_COLUMNS_ROW with dimension ROW",
    (cmd) => {
      test(`${cmd.type} before added rows`, () => {
        const command = { ...cmd, row: 1 };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} after added rows`, () => {
        const command = { ...cmd, row: 10 };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, row: 12 });
      });
      test(`${cmd.type} in pivot row with rows added before`, () => {
        const command = { ...cmd, row: 10 };
        const result = transform(command, addRowsBefore);
        expect(result).toEqual({ ...command, row: 12 });
      });
      test(`${cmd.type} in pivot row with rows added after`, () => {
        const command = { ...cmd, row: 5 };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} after added rows, in another sheet`, () => {
        const command = { ...cmd, row: 10, sheetId: "42" };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
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
      test(`add rows after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:C1")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`add rows after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A10:B11")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A12:B13")] });
      });
      test(`add rows after in ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A5:B6")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A5:B6")] });
      });
      test(`add rows before in ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A5:B6")] };
        const result = transform(command, addRowsBefore);
        expect(result).toEqual({ ...command, target: [toZone("A5:B6")] });
      });
      test(`${cmd.type} and rows added in different sheets`, () => {
        const command = { ...cmd, target: [toZone("A1:F3")], sheetId: "42" };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} with two targets, one before and one after`, () => {
        const command = { ...cmd, target: [toZone("A1:C1"), toZone("A10:B11")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A1:C1"), toZone("A12:B13")] });
      });
    }
  );

  describe.each([addConditionalFormat])("Range dependant commands", (cmd) => {
    test(`add rows after ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A1:C1") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
    test(`add rows before ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A10:B11") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A12:B13") });
    });
    test(`add rows before in the sheet of the range ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A10:B11"), sheetId: "42" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A12:B13") });
    });
    test(`add rows after in ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A5:B6") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A5:B6") });
    });
    test(`add rows before in ${cmd.type}`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A5:B6") };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A5:B6") });
    });
    test(`${cmd.type} and rows added in different sheets`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A1:F3"), sheetId: "42" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with two targets, one before and one after`, () => {
      const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A1:C1,A10:B11") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A1:C1,A12:B13") });
    });

    describe("With unbounded zones", () => {
      test(`add rows after ${cmd.type}`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "1:1") };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`add rows before ${cmd.type}`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "A10:11") };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "A12:13") });
      });
      test(`add rows in ${cmd.type}`, () => {
        const command = { ...cmd, ranges: toRangesData(cmd.sheetId, "5:8") };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, ranges: toRangesData(cmd.sheetId, "5:10") });
      });
    });
  });

  const resizeRowsCommand: Omit<ResizeColumnsRowsCommand, "elements"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "ROW",
    sheetId,
    size: 10,
  };

  const removeRowsCommands: Omit<RemoveColumnsRowsCommand, "elements"> = {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "ROW",
    sheetId,
  };

  describe.each([resizeRowsCommand, removeRowsCommands])("delete or resize rows", (toTransform) => {
    test(`${toTransform.type} which are positioned before the added rows`, () => {
      const command = { ...toTransform, elements: [1, 2] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });

    test(`${toTransform.type} which are positioned before AND after the added rows`, () => {
      const command = { ...toTransform, elements: [1, 10] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, elements: [1, 12] });
    });

    test(`${toTransform.type} which is the row on which the added command is triggered, with before position`, () => {
      const command = { ...toTransform, elements: [10] };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command, elements: [12] });
    });

    test(`${toTransform.type} which is the row on which the added command is triggered, with after position`, () => {
      const command = { ...toTransform, elements: [5] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });

    test(`${toTransform.type} in another sheet`, () => {
      const command = { ...toTransform, elements: [1, 10], sheetId: "coucou" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
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
  describe.each([addMerge, removeMerge])("merge", (cmd) => {
    test(`add rows before merge`, () => {
      const command = { ...cmd, target: target("A1:C1") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
    test(`add rows after merge`, () => {
      const command = { ...cmd, target: target("A10:B11") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, target: target("A12:B13") });
    });
    test(`add rows in merge`, () => {
      const command = { ...cmd, target: target("A5:B7") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, target: target("A5:B9") });
    });
    test(`merge and rows added in different sheets`, () => {
      const command = { ...cmd, target: target("A1:F3"), sheetId: "42" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("ADD_COLUMNS_ROWS with dimension ROW & ADD_COLUMNS_ROWS with dimension ROW", () => {
    test("same base row, one after, one before", () => {
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
        position: "before",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addRowsBefore, addRowsAfter);
      expect(result).toEqual(addRowsBefore);
    });
    test("same base row, one before, one after", () => {
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
        position: "before",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addRowsAfter, addRowsBefore);
      expect(result).toEqual({ ...addRowsAfter, base: 7 });
    });
    test("Base row before the one already added", () => {
      const addRowsAfter: AddColumnsRowsCommand = {
        type: "ADD_COLUMNS_ROWS",
        dimension: "ROW",
        position: "after",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addRowsAfter, base: 0 }, addRowsAfter);
      expect(result).toEqual({ ...addRowsAfter, base: 0 });
    });
    test("Base row after the one already added", () => {
      const addRowsAfter: AddColumnsRowsCommand = {
        type: "ADD_COLUMNS_ROWS",
        dimension: "ROW",
        position: "after",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addRowsAfter, base: 10 }, addRowsAfter);
      expect(result).toEqual({ ...addRowsAfter, base: 12 });
    });
    test("add a row on another sheet", () => {
      const command = { ...addRowsAfter, sheetId: "other" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("Adding column does not impact commands in dimension 'ROW'", () => {
    test("Add rows after add columns after", () => {
      const command = { ...addRowsAfter, dimension: "COL" } as AddColumnsRowsCommand;
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
    test("Add rows after add columns before", () => {
      const command = { ...addRowsBefore, dimension: "COL" } as AddColumnsRowsCommand;
      const result = transform(command, addRowsBefore);
      expect(result).toEqual(command);
    });
  });

  describe("OT with AddRows before - FREEZE_ROWS", () => {
    const toTransform: Omit<FreezeRowsCommand, "quantity"> = {
      type: "FREEZE_ROWS",
      sheetId,
    };

    test("freeze a row before the left-most added row", () => {
      const command = { ...toTransform, quantity: 8 };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command });
    });

    test("Freeze row after the added ones", () => {
      const command = { ...toTransform, quantity: 12 };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command, quantity: 14 });
    });

    test("Freeze a row before the added ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual(command);
    });

    test("Freeze row on another sheet", () => {
      const command = { ...toTransform, quantity: 11, sheetId: "42" };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual(command);
    });
  });

  describe("OT with AddRows after - FREEZE_ROWS", () => {
    const toTransform: Omit<FreezeRowsCommand, "quantity"> = {
      type: "FREEZE_ROWS",
      sheetId,
    };

    test("freeze a row before the left-most added row", () => {
      const command = { ...toTransform, quantity: 5 };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command });
    });

    test("Freeze row after the added ones", () => {
      const command = { ...toTransform, quantity: 12 };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, quantity: 14 });
    });

    test("Freeze a row before the added ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });

    test("Freeze row on another sheet", () => {
      const command = { ...toTransform, quantity: 11, sheetId: "42" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("OT with addRows after/ before FREEZE_COLUMNS has no effect", () => {
    const toTransform: Omit<FreezeColumnsCommand, "quantity"> = {
      type: "FREEZE_COLUMNS",
      sheetId,
    };

    test("freeze a columns after added after row", () => {
      const command = { ...toTransform, quantity: 6 };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command });
    });

    test("freeze a column after added before row", () => {
      const command = { ...toTransform, quantity: 2 };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command });
    });
  });

  describe("OT with MOVE_REFERENCES", () => {
    const moveReferencesCmd: MoveReferencesCommand = {
      type: "MOVE_REFERENCES",
      sheetId,
      zone: toZone("A1:B2"),
      targetSheetId: "Sheet2",
      targetCol: 0,
      targetRow: 0,
    };

    test("Rows added before origin zone", () => {
      const addRowsCmd = { ...addRowsBefore, quantity: 2, base: 0 };
      const result = transform(moveReferencesCmd, addRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("A3:B4") });
    });

    test("Rows added inside origin zone", () => {
      const addRowsCmd = { ...addRowsBefore, quantity: 2, base: 1 };
      const result = transform(moveReferencesCmd, addRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("A1:B4") });
    });

    test("Rows added after origin zone", () => {
      const addRowsCmd = { ...addRowsAfter, quantity: 2, base: 2 };
      const result = transform(moveReferencesCmd, addRowsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });

    test("Rows added before target position", () => {
      const addRowsCmd = { ...addRowsBefore, quantity: 2, base: 0, sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, addRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, targetRow: 2 });
    });

    test("Rows added after target position", () => {
      const addRowsCmd = { ...addRowsAfter, quantity: 2, base: 2, sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, addRowsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });
  });
});
