import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers/zones";
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

describe("OT with ADD_COLUMNS_ROWS with dimension COL", () => {
  const sheetId = "Sheet1";
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
    position: "before",
    base: 10,
    quantity: 2,
    sheetId,
  };

  describe.each(OT_TESTS_SINGLE_CELL_COMMANDS)(
    "OT with ADD_COLUMNS_ROWS with dimension COL",
    (cmd) => {
      test(`${cmd.type} before added columns`, () => {
        const command = { ...cmd, sheetId, col: 1 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} after added columns`, () => {
        const command = { ...cmd, sheetId, col: 10 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, col: 12 });
      });
      test(`${cmd.type} in pivot column with columns added before`, () => {
        const command = { ...cmd, sheetId, col: 10 };
        const result = transform(command, addColumnsBefore);
        expect(result).toEqual({ ...command, col: 12 });
      });
      test(`${cmd.type} in pivot column with columns added after`, () => {
        const command = { ...cmd, sheetId, col: 5 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} in pivot column with columns added before`, () => {
        const command = { ...cmd, sheetId, col: 5 };
        const result = transform(command, addColumnsBefore);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} after added columns, in another sheet`, () => {
        const command = { ...cmd, col: 5, sheetId: "42" };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
    }
  );

  describe.each(OT_TESTS_TARGET_DEPENDANT_COMMANDS)("target commands", (cmd) => {
    test(`add columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A1:A3")] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`add columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("M1:O2")] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: [toZone("O1:Q2")] });
    });
    test(`add columns in ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, target: [toZone("F1:G2")] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: [toZone("F1:I2")] });
    });
    test(`${cmd.type} and columns added in different sheets`, () => {
      const command = { ...cmd, target: [toZone("A1:F3")], sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with two targets, one before and one after`, () => {
      const command = { ...cmd, sheetId, target: [toZone("A1:A3"), toZone("M1:O2")] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: [toZone("A1:A3"), toZone("O1:Q2")] });
    });
  });

  describe.each(OT_TESTS_ZONE_DEPENDANT_COMMANDS)("zone dependant commands", (cmd) => {
    test(`add columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("A1:A3") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`add columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("M1:O2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, zone: toZone("O1:Q2") });
    });
    test(`add columns in ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, zone: toZone("F1:G2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, zone: toZone("F1:I2") });
    });
    test(`${cmd.type} and columns added in different sheets`, () => {
      const command = { ...cmd, zone: toZone("A1:F3"), sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

  describe.each(OT_TESTS_RANGE_DEPENDANT_COMMANDS)("ranges dependant commands", (cmd) => {
    test(`add columns after ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A1:A3") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`add columns before ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "M1:O2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "O1:Q2") });
    });
    test(`add columns in the sheet of the range before ${cmd.type}`, () => {
      const command = {
        ...cmd,
        ranges: toRangesData(sheetId, "M1:O2"),
        sheetId: "42",
      };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "O1:Q2") });
    });
    test(`add columns in ${cmd.type}`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "F1:G2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "F1:I2") });
    });
    test(`${cmd.type} and columns added in different sheets`, () => {
      const command = { ...cmd, ranges: toRangesData("42", "A1:F3"), sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} with two targets, one before and one after`, () => {
      const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A1:A3,M1:O2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A1:A3,O1:Q2") });
    });

    describe("With unbounded ranges", () => {
      test(`add columns after ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A:A") };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`add columns before ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "M:O") };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "O:Q") });
      });
      test(`add columns in ${cmd.type}`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "F:G") };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "F:I") });
      });
      test(`${cmd.type} and columns added in different sheets`, () => {
        const command = { ...cmd, ranges: toRangesData("42", "A:F"), sheetId: "42" };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} with two targets, one before and one after`, () => {
        const command = { ...cmd, sheetId, ranges: toRangesData(sheetId, "A:A,M:O") };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, ranges: toRangesData(sheetId, "A:A,O:Q") });
      });
    });
  });

  describe.each([TEST_COMMANDS.ADD_MERGE, TEST_COMMANDS.REMOVE_MERGE])("merge", (cmd) => {
    test(`add columns before merge`, () => {
      const command = { ...cmd, sheetId, target: target("A1:A3") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`add columns after merge`, () => {
      const command = { ...cmd, sheetId, target: target("M1:O2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: target("O1:Q2") });
    });
    test(`add columns in merge`, () => {
      const command = { ...cmd, sheetId, target: target("F1:G2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: target("F1:I2") });
    });
    test(`merge and columns added in different sheets`, () => {
      const command = { ...cmd, target: target("A1:F3"), sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

  const resizeColumnsCommand: ResizeColumnsRowsCommand = {
    ...TEST_COMMANDS.RESIZE_COLUMNS_ROWS,
    sheetId,
    dimension: "COL",
  };

  const removeColumnsCommand: RemoveColumnsRowsCommand = {
    ...TEST_COMMANDS.REMOVE_COLUMNS_ROWS,
    sheetId,
    dimension: "COL",
  };

  describe.each([resizeColumnsCommand, removeColumnsCommand])("delete or resize columns", (cmd) => {
    test(`${cmd.type} which are positioned before the added columns`, () => {
      const command = { ...cmd, sheetId, elements: [1, 2] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });

    test(`${cmd.type} which are positioned before AND after the add columns`, () => {
      const command = { ...cmd, sheetId, elements: [1, 10] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, elements: [1, 12] });
    });

    test(`${cmd.type} which is the column on which the added command is triggered, with before position`, () => {
      const command = { ...cmd, sheetId, elements: [10] };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual({ ...command, elements: [12] });
    });

    test(`${cmd.type} which is the column on which the added command is triggered, with after position`, () => {
      const command = { ...cmd, sheetId, elements: [5] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });

    test(`${cmd.type} in another sheet`, () => {
      const command = { ...cmd, elements: [1, 10], sheetId: "coucou" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("ADD_COLUMNS_ROWS with dimension COL & ADD_COLUMNS_ROWS with dimension COL", () => {
    test("same base col, one after, one before", () => {
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
        position: "before",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addColumnsBefore, addColumnsAfter);
      expect(result).toEqual(addColumnsBefore);
    });
    test("same base col, one before, one after", () => {
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
        position: "before",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addColumnsAfter, addColumnsBefore);
      expect(result).toEqual({ ...addColumnsAfter, base: 7 });
    });
    test("Base col before the one already added", () => {
      const addColumnsAfter: AddColumnsRowsCommand = {
        type: "ADD_COLUMNS_ROWS",
        dimension: "COL",
        position: "after",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addColumnsAfter, base: 0 }, addColumnsAfter);
      expect(result).toEqual({ ...addColumnsAfter, base: 0 });
    });
    test("Base col after the one already added", () => {
      const addColumnsAfter: AddColumnsRowsCommand = {
        type: "ADD_COLUMNS_ROWS",
        dimension: "COL",
        position: "after",
        base: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addColumnsAfter, base: 10 }, addColumnsAfter);
      expect(result).toEqual({ ...addColumnsAfter, base: 12 });
    });
    test("add a column On another sheet", () => {
      const command = { ...addColumnsAfter, sheetId: "other" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });
  describe("Adding column does not impact commands in dimension 'ROW'", () => {
    test("Add rows after add columns after", () => {
      const command = { ...addColumnsAfter, dimension: "ROW" } as AddColumnsRowsCommand;
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test("Add rows after add columns before", () => {
      const command = { ...addColumnsBefore, dimension: "ROW" } as AddColumnsRowsCommand;
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual(command);
    });
  });

  describe("OT with AddColumns before - FREEZE_COLUMNS", () => {
    const toTransform: Omit<FreezeColumnsCommand, "quantity"> = {
      type: "FREEZE_COLUMNS",
      sheetId,
    };

    test("freeze a column before the left-most added column", () => {
      const command = { ...toTransform, quantity: 8 };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual({ ...command });
    });

    test("Freeze column after the added ones", () => {
      const command = { ...toTransform, quantity: 12 };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual({ ...command, quantity: 14 });
    });

    test("Freeze a column before the added ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual(command);
    });

    test("Freeze column on another sheet", () => {
      const command = { ...toTransform, quantity: 11, sheetId: "42" };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual(command);
    });
  });

  describe("OT with AddColumns after - FREEZE_COLUMNS", () => {
    const toTransform: Omit<FreezeColumnsCommand, "quantity"> = {
      type: "FREEZE_COLUMNS",
      sheetId,
    };

    test("freeze a column before the left-most added column", () => {
      const command = { ...toTransform, quantity: 5 };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command });
    });

    test("Freeze column after the added ones", () => {
      const command = { ...toTransform, quantity: 12 };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, quantity: 14 });
    });

    test("Freeze a column before the added ones", () => {
      const command = { ...toTransform, quantity: 1 };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });

    test("Freeze column on another sheet", () => {
      const command = { ...toTransform, quantity: 11, sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("OT with addColumns after/ before FREEZE_ROWS has no effect", () => {
    const toTransform: Omit<FreezeRowsCommand, "quantity"> = {
      type: "FREEZE_ROWS",
      sheetId,
    };

    test("freeze a row after added after column", () => {
      const command = { ...toTransform, quantity: 6 };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command });
    });

    test("freeze a row after added before column", () => {
      const command = { ...toTransform, quantity: 2 };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual({ ...command });
    });
  });
});

describe.each(OT_TESTS_HEADER_GROUP_COMMANDS)(
  "Transform of (UN)GROUP_HEADERS when adding columns",
  (cmd) => {
    const addColumnsCmd: AddColumnsRowsCommand = {
      ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
      dimension: "COL",
      quantity: 2,
    };
    const toTransform: (typeof OT_TESTS_HEADER_GROUP_COMMANDS)[number] = {
      ...cmd,
      dimension: "COL",
      start: 5,
      end: 7,
    };

    test("Add columns before the group", () => {
      const executed: AddColumnsRowsCommand = { ...addColumnsCmd, base: 0, position: "after" };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 7, end: 9 });
    });

    test("Add columns right before the group", () => {
      const executed: AddColumnsRowsCommand = { ...addColumnsCmd, base: 5, position: "before" };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 7, end: 9 });
    });

    test("Add columns inside the group", () => {
      const executed: AddColumnsRowsCommand = { ...addColumnsCmd, base: 5, position: "after" };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 5, end: 9 });
    });

    test("Add columns after the group", () => {
      const executed: AddColumnsRowsCommand = { ...addColumnsCmd, base: 7, position: "after" };
      const result = transform(toTransform, executed);
      expect(result).toEqual({ ...toTransform, start: 5, end: 7 });
    });

    test("Add columns in another sheet", () => {
      const executed: AddColumnsRowsCommand = { ...addColumnsCmd, base: 0, sheetId: "42" };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });
  }
);

describe("Transform of UPDATE_TABLE when adding columns", () => {
  const sheetId = TEST_COMMANDS.UPDATE_TABLE.sheetId;
  const addColsCms: AddColumnsRowsCommand = {
    ...TEST_COMMANDS.ADD_COLUMNS_ROWS,
    dimension: "COL",
    quantity: 1,
  };
  const updateFilterCmd: UpdateTableCommand = {
    ...TEST_COMMANDS.UPDATE_TABLE,
    zone: toZone("A1:B2"),
    newTableRange: toRangeData(sheetId, "A1:C3"),
  };

  test("Add columns before the zones", () => {
    const executed: AddColumnsRowsCommand = { ...addColsCms, base: 0, position: "before" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("B1:C2"),
      newTableRange: toRangeData(sheetId, "B1:D3"),
    });
  });

  test("Add columns inside the zones", () => {
    const executed: AddColumnsRowsCommand = { ...addColsCms, base: 0, position: "after" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual({
      ...updateFilterCmd,
      zone: toZone("A1:C2"),
      newTableRange: toRangeData(sheetId, "A1:D3"),
    });
  });

  test("Add columns after the zones", () => {
    const executed: AddColumnsRowsCommand = { ...addColsCms, base: 7, position: "after" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });

  test("Add columns in another sheet", () => {
    const executed: AddColumnsRowsCommand = { ...addColsCms, base: 0, sheetId: "42" };
    const result = transform(updateFilterCmd, executed);
    expect(result).toEqual(updateFilterCmd);
  });
});
