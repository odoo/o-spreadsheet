import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsRowsCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
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

describe("OT with REMOVE_COLUMN", () => {
  const sheetId = "Sheet1";
  const removeColumns: RemoveColumnsRowsCommand = {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "COL",
    elements: [2, 5, 3],
    sheetId,
  };

  describe.each(OT_TESTS_SINGLE_CELL_COMMANDS)("single cell commands", (cmd) => {
    test(`remove columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, col: 10 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, col: 7 });
    });
    test(`remove columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, col: 1 };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, col: 4 };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, col: 2 });
    });
    test(`${cmd.type} in removed columns`, () => {
      const command = { ...cmd, sheetId, col: 2 };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} and columns removed in different sheets`, () => {
      const command = { ...cmd, col: 10, sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`with many col elements in growing order`, () => {
      const command = { ...cmd, sheetId, col: 8 };
      const result = transform(command, { ...removeColumns, elements: [2, 3, 4, 5, 6] });
      expect(result).toEqual({ ...command, col: 3 });
    });
  });

  describe.each(OT_TESTS_TARGET_DEPENDANT_COMMANDS)("target commands", (cmd) => {
    test(`remove columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A1:A3")] };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("M1:O2")] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: [toZone("J1:L2")] });
    });
    test(`remove columns before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("E1:E2")] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: [toZone("C1:C2")] });
    });
    test(`${cmd.type} in removed columns`, () => {
      const command = { ...cmd, sheetId, target: [toZone("F1:G2")] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: [toZone("D1:D2")] });
    });
    test(`${cmd.type} and columns removed in different sheets`, () => {
      const command = { ...cmd, target: [toZone("A1:F3")], sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, sheetId, target: [toZone("C1:D2")] };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, sheetId, target: [toZone("C1:D2"), toZone("A1")] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, target: [toZone("A1")] });
    });
  });

  describe.each(OT_TESTS_ZONE_DEPENDANT_COMMANDS)("zone dependant commands", (cmd) => {
    test(`remove columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A1:A3") };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("M1:O2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, zone: toZone("J1:L2") });
    });
    test(`remove columns before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("E1:E2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, zone: toZone("C1:C2") });
    });
    test(`${cmd.type} in removed columns`, () => {
      const command = { ...cmd, sheetId, zone: toZone("F1:G2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, zone: toZone("D1:D2") });
    });
    test(`${cmd.type} and columns removed in different sheets`, () => {
      const command = { ...cmd, zone: toZone("A1:F3"), sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
  });

  describe.each(OT_TESTS_RANGE_DEPENDANT_COMMANDS)("ranges dependant commands", (cmd) => {
    test(`remove columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A1:A3") };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`remove columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "M1:O2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "J1:L2") });
    });
    test(`remove columns before in the shhet of the range ${cmd.type}`, () => {
      const command = {
        ...cmd,
        ranges: toRangesData(sheetId, "M1:O2"),
        sheetId: "42",
      };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "J1:L2") });
    });
    test(`remove columns before and after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "E1:E2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "C1:C2") });
    });
    test(`${cmd.type} in removed columns`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "F1:G2") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "D1:D2") });
    });
    test(`${cmd.type} and columns removed in different sheets`, () => {
      const command = { ...cmd, ranges: toRangesData("42", "A1:F3"), sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "C1:D2") };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "C1:D2,A1") };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A1") });
    });

    describe("With unbounded ranges", () => {
      test(`remove columns after ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A:A") };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns before ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "M5:O") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "J5:L") });
      });
      test(`${cmd.type} in removed columns`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "F:G") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "D:D") });
      });
      test(`${cmd.type} with a target removed`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "C:D") };
        const result = transform(command, removeColumns);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} with a target removed, but another valid`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "C:D,A2:A") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A2:A") });
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

  describe("Columns removed - Resize columns", () => {
    const resizeColumnsCommand: ResizeColumnsRowsCommand = {
      ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
      sheetId,
      dimension: "COL",
    };

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

  describe.each([TEST_COMMANDS.ADD_MERGE, TEST_COMMANDS.REMOVE_MERGE])(
    "Remove Columns - Merge",
    (cmd) => {
      test(`remove columns before merge`, () => {
        const command = { ...cmd, sheetId, target: target("A1:A3") };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns after merge`, () => {
        const command = { ...cmd, sheetId, target: target("M1:O2") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: target("J1:L2") });
      });
      test(`remove columns before and after merge`, () => {
        const command = { ...cmd, sheetId, target: target("E1:E2") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: target("C1:C2") });
      });
      test(`merge in removed columns`, () => {
        const command = { ...cmd, sheetId, target: target("F1:G2") };
        const result = transform(command, removeColumns);
        expect(result).toEqual({ ...command, target: target("D1:D2") });
      });
      test(`merge and columns removed in different sheets`, () => {
        const command = { ...cmd, target: target("A1:F3"), sheetId: "42" };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`merge with a target removed`, () => {
        const command = { ...cmd, sheetId, target: target("C1:D2") };
        const result = transform(command, removeColumns);
        expect(result).toBeUndefined();
      });
    }
  );

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
});

describe.each(OT_TESTS_HEADER_GROUP_COMMANDS)(
  "Transform of (UN)GROUP_HEADERS when removing columns",
  (cmd) => {
    const removeColumnsCmd: RemoveColumnsRowsCommand = {
      ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
      dimension: "COL",
    };
    const toTransform: (typeof OT_TESTS_HEADER_GROUP_COMMANDS)[number] = {
      ...cmd,
      dimension: "COL",
      start: 5,
      end: 7,
    };

    test("Remove columns before the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeColumnsCmd, elements: [0, 1] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 3, end: 5 });
    });

    test("Remove some columns of the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeColumnsCmd, elements: [6, 1] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 4, end: 5 });
    });

    test("Remove all columns of the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeColumnsCmd, elements: [5, 6, 7] };
      const result = transform(toTransform, executed);
      expect(result).toEqual(undefined);
    });

    test("Remove columns after the group", () => {
      const executed: RemoveColumnsRowsCommand = { ...removeColumnsCmd, elements: [8, 9] };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 5, end: 7 });
    });

    test("Remove columns in another sheet", () => {
      const executed: RemoveColumnsRowsCommand = {
        ...removeColumnsCmd,
        elements: [0],
        sheetId: "42",
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });
  }
);

describe("Transform of UPDATE_TABLE when removing cols", () => {
  const sheetId = TEST_COMMANDS.UPDATE_TABLE.sheetId;
  const removeColsCmd: RemoveColumnsRowsCommand = {
    ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
    dimension: "COL",
  };
  const updateFilterCmd: UpdateTableCommand = {
    ...TEST_COMMANDS.UPDATE_TABLE,
    zone: toZone("B2:C3"),
    newTableRange: toRangeData(sheetId, "B2:D4"),
  };

  test("Add cols before the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeColsCmd, elements: [0] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("A2:B3"),
      newTableRange: toRangeData(sheetId, "A2:C4"),
    });
  });

  test("Add cols inside the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeColsCmd, elements: [2] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("B2:B3"),
      newTableRange: toRangeData(sheetId, "B2:C4"),
    });
  });

  test("Add cols after the zones", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeColsCmd, elements: [7] };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });

  test("Add cols in another sheet", () => {
    const executed: RemoveColumnsRowsCommand = { ...removeColsCmd, elements: [0], sheetId: "42" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });
});
