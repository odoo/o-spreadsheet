import { toZone } from "../../../src/helpers";
import { transform } from "../../../src/ot/ot";
import {
  RemoveRowsCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
  ClearCellCommand,
  SetBorderCommand,
  DeleteContentCommand,
  SetFormattingCommand,
  ClearFormattingCommand,
  SetDecimalCommand,
  AddRowsCommand,
  ResizeRowsCommand,
  AddMergeCommand,
  RemoveMergeCommand,
} from "../../../src/types";

describe("OT with REMOVE_ROWS", () => {
  const sheetId = "Sheet1";
  const removeRows: RemoveRowsCommand = {
    type: "REMOVE_ROWS",
    rows: [2, 5, 3],
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

  describe.each([deleteContent, setFormatting, clearFormatting, setDecimal])(
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

  describe("OT with RemoveRows - Addrows", () => {
    const toTransform: Omit<AddRowsCommand, "row"> = {
      type: "ADD_ROWS",
      position: "after",
      quantity: 10,
      sheetId,
    };

    test("Add a removed rows", () => {
      const command = { ...toTransform, row: 2 };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Add a row after the removed ones", () => {
      const command = { ...toTransform, row: 10 };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, row: 7 });
    });

    test("Add a row before the removed ones", () => {
      const command = { ...toTransform, row: 0 };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Add on another sheet", () => {
      const command = { ...toTransform, row: 2, sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
  });

  describe("OT with two remove rows", () => {
    const toTransform: Omit<RemoveRowsCommand, "rows"> = {
      type: "REMOVE_ROWS",
      sheetId,
    };

    test("Remove a row which is in the removed rows", () => {
      const command = { ...toTransform, rows: [2] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Remove rows with one in the removed rows", () => {
      const command = { ...toTransform, rows: [0, 2] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, rows: [0] });
    });

    test("Remove a column before removed rows", () => {
      const command = { ...toTransform, rows: [0] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Remove a column after removed rows", () => {
      const command = { ...toTransform, rows: [8] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, rows: [5] });
    });

    test("Remove a column inside removed rows", () => {
      const command = { ...toTransform, rows: [4] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, rows: [2] });
    });

    test("Remove a column on another sheet", () => {
      const command = { ...toTransform, rows: [4], sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
  });

  const resizeRowsCommand: Omit<ResizeRowsCommand, "rows"> = {
    type: "RESIZE_ROWS",
    sheetId,
    size: 10,
  };

  describe("Rows removed - Resize rows", () => {
    test("Resize rows which are positionned before the removed rows", () => {
      const command = { ...resizeRowsCommand, rows: [0, 1] };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });

    test("Resize rows which are positionned before AND after the removed rows", () => {
      const command = { ...resizeRowsCommand, rows: [0, 10] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, rows: [0, 7] });
    });

    test("Resize a row which is a deleted row", () => {
      const command = { ...resizeRowsCommand, rows: [5] };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });

    test("Resize rows one of which is a deleted row", () => {
      const command = { ...resizeRowsCommand, rows: [0, 5] };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, rows: [0] });
    });
  });

  const addMerge: Omit<AddMergeCommand, "zone"> = {
    type: "ADD_MERGE",
    sheetId,
  };
  const removeMerge: Omit<RemoveMergeCommand, "zone"> = {
    type: "REMOVE_MERGE",
    sheetId,
  };
  describe.each([addMerge, removeMerge])("Remove Columns - Merge", (cmd) => {
    test(`remove rows before Merge`, () => {
      const command = { ...cmd, zone: toZone("A1:C1") };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`remove rows after Merge`, () => {
      const command = { ...cmd, zone: toZone("A12:B14") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A9:B11") });
    });
    test(`remove rows before and after Merge`, () => {
      const command = { ...cmd, zone: toZone("A5:B5") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A3:B3") });
    });
    test(`Merge in removed rows`, () => {
      const command = { ...cmd, zone: toZone("A6:B7") };
      const result = transform(command, removeRows);
      expect(result).toEqual({ ...command, zone: toZone("A4:B4") });
    });
    test(`Merge and rows removed in different sheets`, () => {
      const command = { ...cmd, zone: toZone("A1:C6"), sheetId: "42" };
      const result = transform(command, removeRows);
      expect(result).toEqual(command);
    });
    test(`Merge with a zone removed`, () => {
      const command = { ...cmd, zone: toZone("A3:B4") };
      const result = transform(command, removeRows);
      expect(result).toBeUndefined();
    });
  });
});
