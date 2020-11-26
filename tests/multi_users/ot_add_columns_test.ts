import { transform } from "../../src/ot/ot";
import {
  AddColumnsCommand,
  ClearCellCommand,
  SetBorderCommand,
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
  }
);
