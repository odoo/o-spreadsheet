import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers/zones";
import {
  AddColumnsRowsCommand,
  AddConditionalFormatCommand,
  AddMergeCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  DeleteContentCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../../src/types";
import { createEqualCF, target } from "../../test_helpers/helpers";

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
  const updateCell: Omit<UpdateCellCommand, "col"> = {
    type: "UPDATE_CELL",
    sheetId,
    content: "test",
    row: 1,
  };
  const updateCellPosition: Omit<UpdateCellPositionCommand, "col"> = {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId,
    row: 1,
  };
  const clearCell: Omit<ClearCellCommand, "col"> = {
    type: "CLEAR_CELL",
    sheetId,
    row: 1,
  };
  const setBorder: Omit<SetBorderCommand, "col"> = {
    type: "SET_BORDER",
    sheetId,
    row: 1,
    border: { left: ["thin", "#000"] },
  };

  describe.each([updateCell, updateCellPosition, clearCell, setBorder])(
    "OT with ADD_COLUMNS_ROWS with dimension COL",
    (cmd) => {
      test(`${cmd.type} before added columns`, () => {
        const command = { ...cmd, col: 1 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} after added columns`, () => {
        const command = { ...cmd, col: 10 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, col: 12 });
      });
      test(`${cmd.type} in pivot column with columns added before`, () => {
        const command = { ...cmd, col: 10 };
        const result = transform(command, addColumnsBefore);
        expect(result).toEqual({ ...command, col: 12 });
      });
      test(`${cmd.type} in pivot column with columns added after`, () => {
        const command = { ...cmd, col: 5 };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} in pivot column with columns added before`, () => {
        const command = { ...cmd, col: 5 };
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

  const addConditionalFormat: Omit<AddConditionalFormatCommand, "target"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    sheetId,
    cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
  };

  describe.each([deleteContent, setFormatting, clearFormatting, addConditionalFormat])(
    "target commands",
    (cmd) => {
      test(`add columns  before ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:A3")] };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`add columns after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("M1:O2")] };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, target: [toZone("O1:Q2")] });
      });
      test(`add columns in ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("F1:G2")] };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, target: [toZone("F1:I2")] });
      });
      test(`${cmd.type} and columns added in different sheets`, () => {
        const command = { ...cmd, target: [toZone("A1:F3")], sheetId: "42" };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} with two targets, one before and one after`, () => {
        const command = { ...cmd, target: [toZone("A1:A3"), toZone("M1:O2")] };
        const result = transform(command, addColumnsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A1:A3"), toZone("O1:Q2")] });
      });
    }
  );
  const addMerge: Omit<AddMergeCommand, "target"> = {
    type: "ADD_MERGE",
    sheetId,
  };
  const removeMerge: Omit<RemoveMergeCommand, "target"> = {
    type: "REMOVE_MERGE",
    sheetId,
  };
  describe.each([addMerge, removeMerge])("merge", (cmd) => {
    test(`add columns before merge`, () => {
      const command = { ...cmd, target: target("A1:A3") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
    test(`add columns after merge`, () => {
      const command = { ...cmd, target: target("M1:O2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: target("O1:Q2") });
    });
    test(`add columns in merge`, () => {
      const command = { ...cmd, target: target("F1:G2") };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, target: target("F1:I2") });
    });
    test(`merge and columns added in different sheets`, () => {
      const command = { ...cmd, target: target("A1:F3"), sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

  const resizeColumnsCommand: Omit<ResizeColumnsRowsCommand, "elements"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "COL",
    sheetId,
    size: 10,
  };

  const removeColumnsCommand: Omit<RemoveColumnsRowsCommand, "elements"> = {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "COL",
    sheetId,
  };

  describe.each([resizeColumnsCommand, removeColumnsCommand])("delete or resize columns", (cmd) => {
    test(`${cmd.type} which are positioned before the added columns`, () => {
      const command = { ...cmd, elements: [1, 2] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });

    test(`${cmd.type} which are positioned before AND after the add columns`, () => {
      const command = { ...cmd, elements: [1, 10] };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual({ ...command, elements: [1, 12] });
    });

    test(`${cmd.type} which is the column on which the added command is triggered, with before position`, () => {
      const command = { ...cmd, elements: [10] };
      const result = transform(command, addColumnsBefore);
      expect(result).toEqual({ ...command, elements: [12] });
    });

    test(`${cmd.type} which is the column on which the added command is triggered, with after position`, () => {
      const command = { ...cmd, elements: [5] };
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
});
