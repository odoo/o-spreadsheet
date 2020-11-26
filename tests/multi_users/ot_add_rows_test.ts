import { transform } from "../../src/ot/ot";
import {
  AddRowsCommand,
  ClearCellCommand,
  SetBorderCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../src/types";

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

describe.each([updateCell, updateCellPosition, clearCell, setBorder])("OT with ADD_ROWS", (cmd) => {
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
});
