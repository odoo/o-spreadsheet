import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsRowsCommand,
  AddConditionalFormatCommand,
  AddMergeCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  CreateChartCommand,
  CreateFigureCommand,
  DeleteContentCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  Figure,
  MoveSheetCommand,
  RemoveColumnsRowsCommand,
  RemoveConditionalFormatCommand,
  RemoveMergeCommand,
  RenameSheetCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
} from "../../../src/types";
import { createEqualCF, target } from "../../test_helpers/helpers";

describe("OT with DELETE_SHEET", () => {
  const deletedSheetId = "deletedSheet";
  const sheetId = "stillPresent";
  const deleteSheet: DeleteSheetCommand = { type: "DELETE_SHEET", sheetId: deletedSheetId };

  const updateCell: Omit<UpdateCellCommand, "sheetId"> = { type: "UPDATE_CELL", col: 0, row: 0 };
  const clearCell: Omit<ClearCellCommand, "sheetId"> = { type: "CLEAR_CELL", col: 0, row: 0 };
  const deleteContent: Omit<DeleteContentCommand, "sheetId"> = {
    type: "DELETE_CONTENT",
    target: [toZone("A1")],
  };
  const addColumns: Omit<AddColumnsRowsCommand, "sheetId"> = {
    type: "ADD_COLUMNS_ROWS",
    dimension: "COL",
    base: 0,
    position: "after",
    quantity: 1,
  };
  const addRows: Omit<AddColumnsRowsCommand, "sheetId"> = {
    type: "ADD_COLUMNS_ROWS",
    dimension: "ROW",
    base: 1,
    position: "after",
    quantity: 1,
  };
  const removeColumn: Omit<RemoveColumnsRowsCommand, "sheetId"> = {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "COL",
    elements: [0],
  };
  const removeRows: Omit<RemoveColumnsRowsCommand, "sheetId"> = {
    type: "REMOVE_COLUMNS_ROWS",
    elements: [0],
    dimension: "ROW",
  };
  const addMerge: Omit<AddMergeCommand, "sheetId"> = { type: "ADD_MERGE", target: target("A1:B1") };
  const removeMerge: Omit<RemoveMergeCommand, "sheetId"> = {
    type: "REMOVE_MERGE",
    target: target("A1:B1"),
  };
  const moveSheet: Omit<MoveSheetCommand, "sheetId"> = { type: "MOVE_SHEET", direction: "left" };
  const renameSheet: Omit<RenameSheetCommand, "sheetId"> = { type: "RENAME_SHEET", name: "test" };
  const addCF: Omit<AddConditionalFormatCommand, "sheetId"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    cf: createEqualCF("test", { fillColor: "orange" }, "id"),
    target: [toZone("A1:B1")],
  };
  const createFigure: Omit<CreateFigureCommand, "sheetId"> = {
    type: "CREATE_FIGURE",
    figure: {} as Figure,
  };
  const setFormatting: Omit<SetFormattingCommand, "sheetId"> = {
    type: "SET_FORMATTING",
    target: [toZone("A1")],
  };
  const clearFormatting: Omit<ClearFormattingCommand, "sheetId"> = {
    type: "CLEAR_FORMATTING",
    target: [toZone("A1")],
  };
  const setBorder: Omit<SetBorderCommand, "sheetId"> = {
    type: "SET_BORDER",
    col: 0,
    row: 0,
    border: undefined,
  };
  const setDecimal: Omit<SetDecimalCommand, "sheetId"> = {
    type: "SET_DECIMAL",
    target: [toZone("A1")],
    step: 3,
  };
  const createChart: Omit<CreateChartCommand, "sheetId"> = {
    type: "CREATE_CHART",
    id: "1",
    definition: {} as any,
  };
  const resizeColumns: Omit<ResizeColumnsRowsCommand, "sheetId"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "COL",
    elements: [1],
    size: 10,
  };
  const resizeRows: Omit<ResizeColumnsRowsCommand, "sheetId"> = {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [1],
    size: 10,
  };
  const removeConditionalFormatting: Omit<RemoveConditionalFormatCommand, "sheetId"> = {
    type: "REMOVE_CONDITIONAL_FORMAT",
    id: "789",
  };
  const otherDeleteSheet: Omit<DeleteSheetCommand, "sheetId"> = {
    type: "DELETE_SHEET",
  };

  describe.each([
    updateCell,
    clearCell,
    deleteContent,
    addColumns,
    addRows,
    removeColumn,
    removeRows,
    addMerge,
    removeMerge,
    moveSheet,
    renameSheet,
    addCF,
    createFigure,
    setFormatting,
    clearFormatting,
    setBorder,
    setDecimal,
    createChart,
    resizeColumns,
    resizeRows,
    removeConditionalFormatting,
    otherDeleteSheet,
  ])("Delete sheet", (cmd) => {
    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet on which the command is triggered", () => {
      const command = { ...cmd, sheetId };
      const result = transform(command, deleteSheet);
      expect(result).toEqual(command);
    });
  });

  describe("Delete sheet with duplicate sheet", () => {
    const cmd: Omit<DuplicateSheetCommand, "sheetId"> = {
      type: "DUPLICATE_SHEET",
      sheetIdTo: "sheetIdTo",
      name: "sheetIdTo",
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet on which the command is triggered", () => {
      const command = { ...cmd, sheetId: sheetId };
      const result = transform(command, deleteSheet);
      expect(result).toEqual(command);
    });
  });
});
