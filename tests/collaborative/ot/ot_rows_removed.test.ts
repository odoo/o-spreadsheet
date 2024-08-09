import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsRowsCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
  MoveReferencesCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
  UpdateTableCommand,
} from "../../../src/types";
import {
  OT_TESTS_HEADER_GROUP_COMMANDS,
  OT_TESTS_RANGE_DEPENDANT_COMMANDS,
  OT_TESTS_SINGLE_CELL_COMMANDS,
  OT_TESTS_TARGET_DEPENDANT_COMMANDS,
  OT_TESTS_ZONE_DEPENDANT_COMMANDS,
  TEST_COMMANDS,
} from "../../test_helpers/constants";
import { target, toRangeData, toRangesData } from "../../test_helpers/helpers";

describe("OT with REMOVE_COLUMNS_ROWS with dimension ROW", () => {
  const sheetId = "Sheet1";
  const removeRows: RemoveColumnsRowsCommand = {
    type: "REMOVE_COLUMNS_ROWS",
    elements: [2, 5, 3],
    dimension: "ROW",
    sheetId,
  };

  describe.each(OT_TESTS_SINGLE_CELL_COMMANDS)("single cell commands", (cmd) => {
    test(`remove rows before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, row: 10 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, row: 7 });
    });
    test(`remove rows after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, row: 1 };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, row: 4 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, row: 2 });
    });
    test(`${cmd.type} in removed rows`, () => {
      const command = { ...cmd, sheetId, row: 2 };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} and rows removed in different sheets`, () => {
      const command = { ...cmd, row: 10, sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`with many row elements in growing order`, () => {
      const command = { ...cmd, sheetId, row: 8 };
      const result = transform(command, { ...removeRows, elements: [2, 3, 4, 5, 6] });
      expect(result).toEqual({ ...command, row: 3 });
    });
  });

  describe.each(OT_TESTS_TARGET_DEPENDANT_COMMANDS)("target commands", (cmd) => {
    test(`remove rows after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A1:C1")] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A12:B14")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toZone("A9:B11")] });
    });
    test(`remove rows before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A5:B5")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toZone("A3:B3")] });
    });
    test(`${cmd.type} in removed rows`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A6:B7")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toZone("A4:B4")] });
    });
    test(`${cmd.type} and rows removed in different sheets`, () => {
      const command = { ...cmd, target: [toZone("A1:C6")], sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A3:B4")] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A3:B4"), toZone("A1")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toZone("A1")] });
    });
  });

  describe.each(OT_TESTS_ZONE_DEPENDANT_COMMANDS)("zone dependant commands", (cmd) => {
    test(`remove rows after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A1:C1") };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A12:B14") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A9:B11") });
    });
    test(`remove rows before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A5:B5") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A3:B3") });
    });
    test(`${cmd.type} in removed rows`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A6:B7") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A4:B4") });
    });
    test(`${cmd.type} and rows removed in different sheets`, () => {
      const command = { ...cmd, zone: toZone("A1:C6"), sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
  });

  describe.each(OT_TESTS_RANGE_DEPENDANT_COMMANDS)("Range dependant commands", (cmd) => {
    test(`remove rows after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A1:C1") };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A12:B14") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A9:B11") });
    });
    test(`remove rows before ${cmd.type} in the sheet of the ranges`, () => {
      const command = {
        ...cmd,
        ranges: toRangesData(sheetId, "A12:B14"),
        sheetId: "42",
      };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A9:B11") });
    });
    test(`remove rows before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A5:B5") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A3:B3") });
    });
    test(`${cmd.type} in removed rows`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A6:B7") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A4:B4") });
    });
    test(`${cmd.type} and rows removed in different sheets`, () => {
      const command = { ...cmd, ranges: toRangesData("42", "A1:C6"), sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A3:B4") };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A3:B4, A1") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A1") });
    });

    describe("With unbounded ranges", () => {
      test(`remove rows after ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "1:1") };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`remove rows before ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A12:14") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A9:11") });
      });
      test(`${cmd.type} in removed rows`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "6:7") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "4:4") });
      });
      test(`${cmd.type} with a target removed`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "C3:4") };
        const result = transform(command, removeRows);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} with a target removed, but another valid`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "3:4,1:1") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "1:1") });
      });
    });
  });

  describe("OT with RemoveRows - ADD_COLUMNS_ROWS with dimension ROW", () => {
    const toTransform: Omit<AddColumnsRowsCommand, "base"> = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "ROW",
      position: "after",
      quantity: 10,
      sheetId,
    };

    test("Add a removed rows", () => {
      const command = { ...toTransform, base: 2 };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Add a row after the removed ones", () => {
      const command = { ...toTransform, base: 10 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, base: 7 });
    });

    test("Add a row before the removed ones", () => {
      const command = { ...toTransform, base: 0 };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Add on another sheet", () => {
      const command = { ...toTransform, base: 2, sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
  });

  describe("OT with two remove rows", () => {
    const toTransform: Omit<RemoveColumnsRowsCommand, "elements"> = {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: "ROW",
      sheetId,
    };

    test("Remove a row which is in the removed rows", () => {
      const command = { ...toTransform, elements: [2] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Remove rows with one in the removed rows", () => {
      const command = { ...toTransform, elements: [0, 2] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [0] });
    });

    test("Remove a row before removed rows", () => {
      const command = { ...toTransform, elements: [0] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Remove a row after removed rows", () => {
      const command = { ...toTransform, elements: [8] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [5] });
    });

    test("Remove a row inside removed rows", () => {
      const command = { ...toTransform, elements: [4] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [2] });
    });

    test("Remove a row on another sheet", () => {
      const command = { ...toTransform, elements: [4], sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Remove a row adjacent to removed row", () => {
      const command = { ...toTransform, elements: [2] };
      const result = transform(command, { ...removeRows, elements: [0, 1] });
      expect(result).toEqual({ ...command, elements: [0] });
    });
  });

  const resizeRowsCommand: Omit<ResizeColumnsRowsCommand, "elements"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "ROW",
    sheetId,
    size: 10,
  };

  describe("Rows removed - Resize rows", () => {
    test("Resize rows which are positioned before the removed rows", () => {
      const command = { ...resizeRowsCommand, elements: [0, 1] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Resize rows which are positioned before AND after the removed rows", () => {
      const command = { ...resizeRowsCommand, elements: [0, 10] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [0, 7] });
    });

    test("Resize a row which is a deleted row", () => {
      const command = { ...resizeRowsCommand, elements: [5] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Resize rows one of which is a deleted row", () => {
      const command = { ...resizeRowsCommand, elements: [0, 5] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [0] });
    });
  });

  describe.each([TEST_COMMANDS.ADD_MERGE, TEST_COMMANDS.REMOVE_MERGE])(
    "Remove Columns - Merge",
    (cmd) => {
      test(`remove rows before Merge`, () => {
        const command = { ...cmd, sheetId, target: target("A1:C1") };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`remove rows after Merge`, () => {
        const command = { ...cmd, sheetId, target: target("A12:B14") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: target("A9:B11") });
      });
      test(`remove rows before and after Merge`, () => {
        const command = { ...cmd, sheetId, target: target("A5:B5") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: target("A3:B3") });
      });
      test(`Merge in removed rows`, () => {
        const command = { ...cmd, sheetId, target: target("A6:B7") };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: target("A4:B4") });
      });
      test(`Merge and rows removed in different sheets`, () => {
        const command = { ...cmd, target: target("A1:C6"), sheetId: "42" };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`Merge with a target removed`, () => {
        const command = { ...cmd, sheetId, target: target("A3:B4") };
        const result = transform(command, removeRows);
        expect(result).toBeUndefined();
      });
    }
  );

  describe("Removing column does not transform commands in dimension 'ROW'", () => {
    const addColumnsAfter: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "COL",
      position: "after",
      base: 5,
      quantity: 2,
      sheetId,
    };
    const addColumnsBefore: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "COL",
      position: "after",
      base: 5,
      quantity: 2,
      sheetId,
    };

    test("Add columns (after) after delete columns", () => {
      const result = transform(addColumnsAfter, removeRows);
      expect(result).toEqual(addColumnsAfter);
    });
    test("Add rows (before) after delete columns", () => {
      const result = transform(addColumnsBefore, removeRows);
      expect(result).toEqual(addColumnsBefore);
    });
  });

  describe("OT with RemoveRows - FREEZE_COLUMNS_ROWS with dimension ROW", () => {
    const toTransform: Omit<FreezeRowsCommand, "quantity"> = {
      type: "FREEZE_ROWS",
      sheetId,
    };

    test("freeze a row before the left-most deleted row", () => {
      const command = { ...toTransform, quantity: 2 };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Freeze a removed row", () => {
      const command = { ...toTransform, quantity: 3 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, quantity: 2 });
    });

    test("Freeze row after the removed ones", () => {
      const command = { ...toTransform, quantity: 10 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, quantity: 7 });
    });

    test("Freeze a row before the removed ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Freeze row on another sheet", () => {
      const command = { ...toTransform, quantity: 2, sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
  });

  describe("OT with removeRows after/ before FREEZE_COLUMNS has no effect", () => {
    const toTransform: Omit<FreezeColumnsCommand, "quantity"> = {
      type: "FREEZE_COLUMNS",
      sheetId,
    };

    test("freeze a row after added after column", () => {
      const command = { ...toTransform, quantity: 3 };
      const result = transform(command, removeRows);
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

    test("Rows removed before origin zone", () => {
      const removeRowsCmd = { ...removeRows, elements: [0] };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("B1:C2") });
    });

    test("Rows removed inside origin zone", () => {
      const removeRowsCmd = { ...removeRows, elements: [1] };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, zone: toZone("B2:C2") });
    });

    test("Rows removed after origin zone", () => {
      const removeRowsCmd = { ...removeRows, elements: [4] };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });

    test("Remove all columns of origin zone", () => {
      const removeRowsCmd = { ...removeRows, elements: [1, 2] };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual(undefined);
    });

    test("Rows removed before target position", () => {
      const removeRowsCmd = { ...removeRows, elements: [0], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual({ ...moveReferencesCmd, targetRow: 0 });
    });

    test("Rows removed after target position", () => {
      const removeRowsCmd = { ...removeRows, elements: [5], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual(moveReferencesCmd);
    });

    test("Remove column of target position ", () => {
      const removeRowsCmd = { ...removeRows, elements: [1], sheetId: "Sheet2" };
      const result = transform(moveReferencesCmd, removeRowsCmd);
      expect(result).toEqual(undefined);
    });
  });
});

describe.each(OT_TESTS_HEADER_GROUP_COMMANDS)(
  "Transform of (UN)GROUP_HEADERS when removing rows",
  (cmd) => {
    const removeRowsCmd: RemoveColumnsRowsCommand = {
      ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
      dimension: "ROW",
    };
    const toTransform: (typeof OT_TESTS_HEADER_GROUP_COMMANDS)[number] = {
      ...cmd,
      dimension: "ROW",
      start: 5,
      end: 7,
    };

    test("Remove rows before the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [0, 1] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 3, end: 5 });
    });

    test("Remove some rows of the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [6, 1] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 4, end: 5 });
    });

    test("Remove all rows of the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [5, 6, 7] };
      const result = transform(toTransform, executed);
      expect(result).toEqual(undefined);
    });

    test("Remove rows after the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [8, 9] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 5, end: 7 });
    });

    test("Remove rows in another sheet", () => {
      const executed: RemoveColumnsRowsCommand = {
        ...removeRowsCmd,
        elements: [0],
        sheetId: "42",
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });
  }
);

describe("Transform of UPDATE_TABLE when removing rows", () => {
  const sheetId = TEST_COMMANDS.UPDATE_TABLE.sheetId;
  const removeRowsCmd: RemoveColumnsRowsCommand = {
    ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
    dimension: "ROW",
  };
  const updateFilterCmd: UpdateTableCommand = {
    ...TEST_COMMANDS.UPDATE_TABLE,
    zone: toZone("B2:C3"),
    newTableRange: toRangeData(sheetId, "B2:D4"),
  };

  test("Add rows before the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [0] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("B1:C2"),
      newTableRange: toRangeData(sheetId, "B1:D3"),
    });
  });

  test("Add rows inside the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [2] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("B2:C2"),
      newTableRange: toRangeData(sheetId, "B2:D3"),
    });
  });

  test("Add rows after the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [7] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });

  test("Add rows in another sheet", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeRowsCmd, elements: [0], sheetId: "42" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });
});
