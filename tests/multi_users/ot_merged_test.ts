import { toZone } from "../../src/helpers/zones";
import { transform } from "../../src/ot/ot";
import {
  ClearCellCommand,
  SetBorderCommand,
  AddMergeCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../src/types";

describe("OT with ADD_MERGE", () => {
  const sheetId = "Sheet1";
  const addMerge: AddMergeCommand = {
    type: "ADD_MERGE",
    zone: toZone("B2:C3"),
    sheetId,
  };

  const updateCell: Omit<UpdateCellCommand, "row" | "col"> = {
    type: "UPDATE_CELL",
    sheetId,
    content: "test",
  };
  const updateCellPosition: Omit<UpdateCellPositionCommand, "row" | "col"> = {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId,
  };
  const clearCell: Omit<ClearCellCommand, "row" | "col"> = {
    type: "CLEAR_CELL",
    sheetId,
  };
  const setBorder: Omit<SetBorderCommand, "row" | "col"> = {
    type: "SET_BORDER",
    sheetId,
    border: { left: ["thin", "#000"] },
  };

  describe.each([updateCell, updateCellPosition, clearCell, setBorder])(
    "single cell commands",
    (cmd) => {
      test(`${cmd.type} inside the merge`, () => {
        const command = { ...cmd, col: 2, row: 2 };
        const result = transform(command, addMerge);
        expect(result).toBeUndefined();
      });
      test(`${cmd.type} = the top-left of the merge`, () => {
        const command = { ...cmd, col: 1, row: 1 };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });
      test(`${cmd.type} outside the merge`, () => {
        const command = { ...cmd, col: 10, row: 10 };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });

      test(`${cmd.type} in another sheet`, () => {
        const command = { ...cmd, col: 2, row: 1, sheetId: "42" };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });
    }
  );
});
