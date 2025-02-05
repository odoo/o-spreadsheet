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
  CreateFilterTableCommand,
  DeleteContentCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  Figure,
  HideSheetCommand,
  MoveRangeCommand,
  MoveReferencesCommand,
  MoveSheetCommand,
  RemoveColumnsRowsCommand,
  RemoveConditionalFormatCommand,
  RemoveFilterTableCommand,
  RemoveMergeCommand,
  RenameSheetCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetFormattingCommand,
  ShowSheetCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../../../src/types";
import { createEqualCF, target, toRangesData } from "../../test_helpers/helpers";

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
  const hideSheet: Omit<HideSheetCommand, "sheetId"> = { type: "HIDE_SHEET" };
  const showSheet: Omit<ShowSheetCommand, "sheetId"> = { type: "SHOW_SHEET" };
  const addCF: Omit<AddConditionalFormatCommand, "sheetId"> = {
    type: "ADD_CONDITIONAL_FORMAT",
    cf: createEqualCF("test", { fillColor: "orange" }, "id"),
    ranges: toRangesData(sheetId, "A1:B1"),
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

  const moveRanges: Omit<MoveRangeCommand, "sheetId"> = {
    type: "MOVE_RANGES",
    targetSheetId: sheetId,
    col: 0,
    row: 0,
    target: [toZone("A1")],
  };

  const createFilters: Omit<CreateFilterTableCommand, "sheetId"> = {
    type: "CREATE_FILTER_TABLE",
    target: [toZone("A1:A5")],
  };

  const removeFilters: Omit<RemoveFilterTableCommand, "sheetId"> = {
    type: "REMOVE_FILTER_TABLE",
    target: [toZone("A1:A5")],
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
    hideSheet,
    showSheet,
    renameSheet,
    addCF,
    createFigure,
    setFormatting,
    clearFormatting,
    setBorder,
    createChart,
    resizeColumns,
    resizeRows,
    removeConditionalFormatting,
    otherDeleteSheet,
    moveRanges,
    createFilters,
    removeFilters,
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

  describe("Delete sheet with move references", () => {
    const cmd: MoveReferencesCommand = {
      type: "MOVE_REFERENCES",
      sheetId,
      targetSheetId: "sheet2",
      targetCol: 0,
      targetRow: 0,
      zone: toZone("A1"),
    };

    test("Delete the source sheet", () => {
      const result = transform({ ...cmd, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the target sheet", () => {
      const result = transform({ ...cmd, targetSheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete another sheet", () => {
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });

    test("Delete the sheet source and target sheet", () => {
      const result = transform(
        { ...cmd, sheetId: deletedSheetId, targetSheetId: deletedSheetId },
        deleteSheet
      );
      expect(result).toBeUndefined();
    });
  });

  describe("Delete sheet with range dependant command", () => {
    const addCF: Omit<AddConditionalFormatCommand, "sheetId" | "ranges"> = {
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF("test", { fillColor: "orange" }, "id"),
    };

    test("Delete the sheet of the command", () => {
      const cmd = { ...addCF, sheetId: deletedSheetId, ranges: toRangesData(sheetId, "A1:B1") };
      const result = transform(cmd, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet of the ranges", () => {
      const cmd = { ...addCF, sheetId: sheetId, ranges: toRangesData(deletedSheetId, "A1:B1") };
      const result = transform(cmd, deleteSheet);
      expect(result).toBeUndefined();
    });

    test("Delete the sheet of some of the ranges", () => {
      const cmd = {
        ...addCF,
        sheetId: sheetId,
        ranges: [...toRangesData(deletedSheetId, "A1:B1"), ...toRangesData(sheetId, "A1:B1")],
      };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual({ ...cmd, ranges: toRangesData(cmd.sheetId, "A1:B1") });
    });
  });
});
