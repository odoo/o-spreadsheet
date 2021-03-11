import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
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
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
} from "../../../src/types";
import { createEqualCF, target } from "../../test_helpers/helpers";

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

  describe.each([updateCell, clearCell, setBorder])(
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

  const setDecimal: Omit<SetDecimalCommand, "target"> = {
    type: "SET_DECIMAL",
    sheetId,
    step: 1,
  };

  const addConditionalFormat: Omit<AddConditionalFormatCommand, "target"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    sheetId,
    cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
  };

  describe.each([deleteContent, setFormatting, clearFormatting, setDecimal, addConditionalFormat])(
    "target commands",
    (cmd) => {
      test(`add rows before ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:C1")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual(command);
      });
      test(`add rows after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A10:B11")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A12:B13")] });
      });
      test(`add rows in ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A5:B6")] };
        const result = transform(command, addRowsAfter);
        expect(result).toEqual({ ...command, target: [toZone("A5:B8")] });
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
      const command = { ...cmd, target: target("A5:B6") };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, target: target("A5:B8") });
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
});
