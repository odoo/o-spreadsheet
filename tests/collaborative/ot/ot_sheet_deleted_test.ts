import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import {
  AddColumnsCommand,
  AddConditionalFormatCommand,
  AddMergeCommand,
  AddRowsCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  CreateChartCommand,
  CreateFigureCommand,
  DeleteContentCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  Figure,
  MoveSheetCommand,
  RemoveColumnsCommand,
  RemoveConditionalFormatCommand,
  RemoveMergeCommand,
  RemoveRowsCommand,
  RenameSheetCommand,
  ResizeColumnsCommand,
  ResizeRowsCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../../src/types";
import { createEqualCF } from "../../helpers";

describe("OT with DELETE_SHEET", () => {
  const deletedSheetId = "deletedSheet";
  const sheetId = "stillPresent";
  const deleteSheet: DeleteSheetCommand = { type: "DELETE_SHEET", sheetId: deletedSheetId };

  const updateCell: Omit<UpdateCellCommand, "sheetId"> = { type: "UPDATE_CELL", col: 0, row: 0 };
  const updateCellPosition: Omit<UpdateCellPositionCommand, "sheetId"> = {
    type: "UPDATE_CELL_POSITION",
    col: 0,
    row: 0,
    cellId: "ID",
  };
  const clearCell: Omit<ClearCellCommand, "sheetId"> = { type: "CLEAR_CELL", col: 0, row: 0 };
  const deleteContent: Omit<DeleteContentCommand, "sheetId"> = {
    type: "DELETE_CONTENT",
    target: [toZone("A1")],
  };
  const addColumns: Omit<AddColumnsCommand, "sheetId"> = {
    type: "ADD_COLUMNS",
    column: 0,
    position: "after",
    quantity: 1,
  };
  const addRows: Omit<AddRowsCommand, "sheetId"> = {
    type: "ADD_ROWS",
    row: 1,
    position: "after",
    quantity: 1,
  };
  const removeColumn: Omit<RemoveColumnsCommand, "sheetId"> = {
    type: "REMOVE_COLUMNS",
    columns: [0],
  };
  const removeRows: Omit<RemoveRowsCommand, "sheetId"> = { type: "REMOVE_ROWS", rows: [0] };
  const addMerge: Omit<AddMergeCommand, "sheetId"> = { type: "ADD_MERGE", zone: toZone("A1:B1") };
  const removeMerge: Omit<RemoveMergeCommand, "sheetId"> = {
    type: "REMOVE_MERGE",
    zone: toZone("A1:B1"),
  };
  const moveSheet: Omit<MoveSheetCommand, "sheetId"> = { type: "MOVE_SHEET", direction: "left" };
  const renameSheet: Omit<RenameSheetCommand, "sheetId"> = { type: "RENAME_SHEET", name: "test" };
  const addCF: Omit<AddConditionalFormatCommand, "sheetId"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    cf: createEqualCF(["A1:B1"], "test", { fillColor: "orange" }, "id"),
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
  const resizeColumns: Omit<ResizeColumnsCommand, "sheetId"> = {
    type: "RESIZE_COLUMNS",
    columns: [1],
    size: 10,
  };
  const resizeRows: Omit<ResizeRowsCommand, "sheetId"> = {
    type: "RESIZE_ROWS",
    rows: [1],
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
    updateCellPosition,
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
    const cmd: Omit<DuplicateSheetCommand, "sheetIdFrom"> = {
      type: "DUPLICATE_SHEET",
      sheetIdTo: "sheetIdTo",
      name: "sheetIdTo",
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...cmd, sheetIdFrom: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet on which the command is triggered", () => {
      const command = { ...cmd, sheetIdFrom: sheetId };
      const result = transform(command, deleteSheet);
      expect(result).toEqual(command);
    });
  });
});
