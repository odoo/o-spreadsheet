import { toZone } from "../../src/helpers";
import { transform } from "../../src/ot/ot";
import {
  ClearCellCommand,
  ClearFormattingCommand,
  DeleteContentCommand,
  RemoveColumnsCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../src/types";

describe("OT with REMOVE_COLUMN", () => {
  const sheetId = "Sheet1";
  const removeColumns: RemoveColumnsCommand = {
    type: "REMOVE_COLUMNS",
    columns: [2, 5, 3],
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
      test(`remove columns before ${cmd.type}`, () => {
        const command = { ...cmd, target: [toZone("A1:A3")] };
        const result = transform(command, removeColumns);
        expect(result).toEqual(command);
      });
      test(`remove columns after ${cmd.type}`, () => {
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
  describe("OT with two remove columns", () => {
    const toTransform: Omit<RemoveColumnsCommand, "columns"> = {
      type: "REMOVE_COLUMNS",
      sheetId,
    };

    test("Remove a column which is in the removed columns", () => {
      const command = { ...toTransform, columns: [2] };
      const result = transform(command, removeColumns);
      expect(result).toBeUndefined();
    });

    test("Remove columns with one in the removed columns", () => {
      const command = { ...toTransform, columns: [0, 2] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, columns: [0] });
    });

    test("Remove a column before removed columns", () => {
      const command = { ...toTransform, columns: [0] };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });

    test("Remove a column after removed columns", () => {
      const command = { ...toTransform, columns: [8] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, columns: [5] });
    });

    test("Remove a column inside removed columns", () => {
      const command = { ...toTransform, columns: [4] };
      const result = transform(command, removeColumns);
      expect(result).toEqual({ ...command, columns: [2] });
    });

    test("Remove a column on another sheet", () => {
      const command = { ...toTransform, columns: [4], sheetId: "42" };
      const result = transform(command, removeColumns);
      expect(result).toEqual(command);
    });
  });
});
