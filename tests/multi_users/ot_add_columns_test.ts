import { toZone } from "../../src/helpers/zones";
import { transform } from "../../src/ot/ot";
import {
  AddColumnsCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  DeleteContentCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../src/types";

const sheetId = "Sheet1";
const addColumnsAfter: AddColumnsCommand = {
  type: "ADD_COLUMNS",
  position: "after",
  column: 5,
  quantity: 2,
  sheetId,
};
const addColumnsBefore: AddColumnsCommand = {
  type: "ADD_COLUMNS",
  position: "before",
  column: 10,
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
  "OT with ADD_COLUMNS",
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
    test(`${cmd.type} after added columns, in another sheet`, () => {
      const command = { ...cmd, col: 5, sheetId: "42" };
      const result = transform(command, addColumnsAfter);
      expect(result).toEqual(command);
    });
  });

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
      expect(result).toEqual({...command, target: [toZone("A1:A3"), toZone("O1:Q2")]});
    });
  });
