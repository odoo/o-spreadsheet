import { toZone } from "../../src/helpers/zones";
import { transform } from "../../src/ot/ot";
import {
  AddRowsCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  DeleteContentCommand,
  ResizeRowsCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../src/types";

describe("OT with ADD_ROWS", () => {
  const sheetId = "Sheet1";
  const addRowsAfter: AddRowsCommand = {
    type: "ADD_ROWS",
    position: "after",
    row: 5,
    quantity: 2,
    sheetId,
  };
  const addRowsBefore: AddRowsCommand = {
    type: "ADD_ROWS",
    position: "before",
    row: 10,
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
    "OT with ADD_ROWS",
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

  describe.each([deleteContent, setFormatting, clearFormatting, setDecimal])(
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

  const resizeRowsCommand: Omit<ResizeRowsCommand, "rows"> = {
    type: "RESIZE_ROWS",
    sheetId,
    size: 10,
  };

  describe("Rows added - Resize Rows", () => {
    test("Resize rows which are positionned before the added rows", () => {
      const command = { ...resizeRowsCommand, rows: [1, 2] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });

    test("Resize rows which are positionned before AND after the added rows", () => {
      const command = { ...resizeRowsCommand, rows: [1, 10] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual({ ...command, rows: [1, 12] });
    });

    test("Resize a row which is the row on which the added command is triggered, with before position", () => {
      const command = { ...resizeRowsCommand, rows: [10] };
      const result = transform(command, addRowsBefore);
      expect(result).toEqual({ ...command, rows: [12] });
    });

    test("Resize a row which is the row on which the added command is triggered, with after position", () => {
      const command = { ...resizeRowsCommand, rows: [5] };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
  });

  describe("ADD_ROWS & ADD_ROWS", () => {
    test("same base row, one after, one before", () => {
      const addRowsAfter: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const addRowsBefore: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "before",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addRowsBefore, addRowsAfter);
      expect(result).toEqual(addRowsBefore);
    });
    test("same base row, one before, one after", () => {
      const addRowsAfter: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const addRowsBefore: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "before",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform(addRowsAfter, addRowsBefore);
      expect(result).toEqual({ ...addRowsAfter, row: 7 });
    });
    test("Base row before the one already added", () => {
      const addRowsAfter: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addRowsAfter, row: 0 }, addRowsAfter);
      expect(result).toEqual({ ...addRowsAfter, row: 0 });
    });
    test("Base row after the one already added", () => {
      const addRowsAfter: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId,
      };
      const result = transform({ ...addRowsAfter, row: 10 }, addRowsAfter);
      expect(result).toEqual({ ...addRowsAfter, row: 12 });
    });
    test("add a row on another sheet", () => {
      const command = { ...addRowsAfter, sheetId: "other" };
      const result = transform(command, addRowsAfter);
      expect(result).toEqual(command);
    });
  });
});
