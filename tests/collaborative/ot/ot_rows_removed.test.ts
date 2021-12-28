import { transform } from "../../../src/collaborative/ot/ot";
import { toUnboundZone, toZone } from "../../../src/helpers";
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
  UpdateCellPositionCommand,
} from "../../../src/types";
import { createEqualCF, target } from "../../test_helpers/helpers";

describe("OT with REMOVE_COLUMNS_ROWS with dimension ROW", () => {
  const sheetId = "Sheet1";
  const removeRows: RemoveColumnsRowsCommand = {
    type: "REMOVE_COLUMNS_ROWS",
    elements: [2, 5, 3],
    dimension: "ROW",
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
    "single cell commands",
    (cmd) => {
      test(`remove rows before ${cmd.type}`, () => {
        const command = { ...cmd, row: 10 };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, row: 7 });
      });
      test(`remove rows after ${cmd.type}`, () => {
        const command = { ...cmd, row: 1 };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`remove rows before and after ${cmd.type}`, () => {
        const command = { ...cmd, row: 4 };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, row: 2 });
      });
      test(`${cmd.type} in removed rows`, () => {
        const command = { ...cmd, row: 2 };
        const result = transform(command, removeRows);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} and rows removed in different sheets`, () => {
        const command = { ...cmd, row: 10, sheetId: "42" };
        const result = transform(command, removeRows);
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
      test(`remove rows before ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:C1")] };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`remove rows after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A12:B14")] };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: [toZone("A9:B11")] });
      });
      test(`remove rows before and after ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A5:B5")] };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: [toZone("A3:B3")] });
      });
      test(`${cmd.type} in removed rows`, () => {
        const command = { ...cmd, target: [toZone("A6:B7")] };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: [toZone("A4:B4")] });
      });
      test(`${cmd.type} and rows removed in different sheets`, () => {
        const command = { ...cmd, target: [toZone("A1:C6")], sheetId: "42" };
        const result = transform(command, removeRows);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} with a target removed`, () => {
        const command = { ...cmd, target: [toZone("A3:B4")] };
        const result = transform(command, removeRows);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} with a target removed, but another valid`, () => {
        const command = { ...cmd, target: [toZone("A3:B4"), toZone("A1")] };
        const result = transform(command, removeRows);
        expect(result).toEqual({ ...command, target: [toZone("A1")] });
      });
    }
  );
  describe.each([addConditionalFormat])("target commands with unbound zones", (cmd) => {
    test(`remove rows before ${cmd.type}`, () => {
      const command = { ...cmd, target: [toUnboundZone("1:1")] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows after ${cmd.type}`, () => {
      const command = { ...cmd, target: [toUnboundZone("A12:14")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toUnboundZone("A9:11")] });
    });
    test(`${cmd.type} in removed rows`, () => {
      const command = { ...cmd, target: [toUnboundZone("6:7")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toUnboundZone("4:4")] });
    });
    test(`${cmd.type} with a target removed`, () => {
      const command = { ...cmd, target: [toZone("C3:4")] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} with a target removed, but another valid`, () => {
      const command = { ...cmd, target: [toUnboundZone("3:4"), toUnboundZone("1:1")] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: [toUnboundZone("1:1")] });
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

    test("Remove a column before removed rows", () => {
      const command = { ...toTransform, elements: [0] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Remove a column after removed rows", () => {
      const command = { ...toTransform, elements: [8] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [5] });
    });

    test("Remove a column inside removed rows", () => {
      const command = { ...toTransform, elements: [4] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, elements: [2] });
    });

    test("Remove a column on another sheet", () => {
      const command = { ...toTransform, elements: [4], sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
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

  const addMerge: Omit<AddMergeCommand, "target"> = {
    type: "ADD_MERGE",
    sheetId,
  };
  const removeMerge: Omit<RemoveMergeCommand, "target"> = {
    type: "REMOVE_MERGE",
    sheetId,
  };
  describe.each([addMerge, removeMerge])("Remove Columns - Merge", (cmd) => {
    test(`remove rows before Merge`, () => {
      const command = { ...cmd, target: target("A1:C1") };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows after Merge`, () => {
      const command = { ...cmd, target: target("A12:B14") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: target("A9:B11") });
    });
    test(`remove rows before and after Merge`, () => {
      const command = { ...cmd, target: target("A5:B5") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: target("A3:B3") });
    });
    test(`Merge in removed rows`, () => {
      const command = { ...cmd, target: target("A6:B7") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, target: target("A4:B4") });
    });
    test(`Merge and rows removed in different sheets`, () => {
      const command = { ...cmd, target: target("A1:C6"), sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`Merge with a target removed`, () => {
      const command = { ...cmd, target: target("A3:B4") };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
  });
});
