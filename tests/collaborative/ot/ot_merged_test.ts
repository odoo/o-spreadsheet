import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddMergeCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  DeleteContentCommand,
  DeleteMergeCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../../src/types";

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
      test(`${cmd.type} outside merge`, () => {
        const command = { ...cmd, target: [toZone("E1:F2")] };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });
    }
  );

  const removeMerge: Omit<DeleteMergeCommand, "zone"> = {
    type: "DELETE_MERGE",
    sheetId,
  };

  describe.each([addMerge, removeMerge])(`ADD_MERGE & AddMerge | RemoveMerge`, (cmd) => {
    test("two distinct merges", () => {
      const command = { ...cmd, zone: toZone("E1:F2") };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });
    test("two overlapping merges", () => {
      const command = { ...cmd, zone: toZone("C3:D5") };
      const result = transform(command, addMerge);
      expect(result).toBeUndefined();
    });
    test("two overlapping merges in different sheets", () => {
      const command = { ...cmd, zone: toZone("C3:D5"), sheetId: "another sheet" };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });
  });
});
