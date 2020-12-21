import { toZone } from "../../src/helpers";
import { inverseCommand } from "../../src/helpers/inverse_commands";
import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  ClearCellCommand,
  ClearFormattingCommand,
  CoreCommand,
  CreateChartDefinition,
  CreateSheetCommand,
  DeleteContentCommand,
  DuplicateSheetCommand,
  RemoveMergeCommand,
  ResizeColumnsCommand,
  ResizeRowsCommand,
  SetBorderCommand,
  SetDecimalCommand,
  SetFormattingCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../src/types";

describe("Inverses commands", () => {
  describe("Add Columns", () => {
    const addColumns: AddColumnsCommand = {
      type: "ADD_COLUMNS",
      position: "after",
      quantity: 2,
      column: 1,
      sheetId: "1",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addColumns)).toEqual({
        type: "REMOVE_COLUMNS",
        sheetId: "1",
        columns: [2, 3],
      });
    });

    test("Inverse with position = before", () => {
      expect(inverseCommand({ ...addColumns, position: "before" })).toEqual({
        type: "REMOVE_COLUMNS",
        sheetId: "1",
        columns: [1, 2],
      });
    });
  });
  describe("Add Rows", () => {
    const addRows: AddRowsCommand = {
      type: "ADD_ROWS",
      position: "after",
      quantity: 2,
      row: 1,
      sheetId: "1",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addRows)).toEqual({ type: "REMOVE_ROWS", sheetId: "1", rows: [2, 3] });
    });

    test("Inverse with position = before", () => {
      expect(inverseCommand({ ...addRows, position: "before" })).toEqual({
        type: "REMOVE_ROWS",
        sheetId: "1",
        rows: [1, 2],
      });
    });
  });

  test("Add Merge", () => {
    const addMerge: AddMergeCommand = {
      type: "ADD_MERGE",
      sheetId: "1",
      zone: toZone("A1:B1"),
    };
    expect(inverseCommand(addMerge)).toEqual({ ...addMerge, type: "REMOVE_MERGE" });
  });

  test("Remove Merge", () => {
    const removeMerge: RemoveMergeCommand = {
      type: "REMOVE_MERGE",
      sheetId: "1",
      zone: toZone("A1:B1"),
    };
    expect(inverseCommand(removeMerge)).toEqual({ ...removeMerge, type: "ADD_MERGE" });
  });

  test("Create sheet", () => {
    const createSheet: CreateSheetCommand = {
      type: "CREATE_SHEET",
      position: 1,
      sheetId: "1",
    };
    expect(inverseCommand(createSheet)).toEqual({ type: "DELETE_SHEET", sheetId: "1" });
  });

  test("Duplicate Sheet", () => {
    const duplicateSheet: DuplicateSheetCommand = {
      type: "DUPLICATE_SHEET",
      sheetIdFrom: "1",
      sheetIdTo: "2",
      name: "bla",
    };
    expect(inverseCommand(duplicateSheet)).toEqual({ type: "DELETE_SHEET", sheetId: "2" });
  });

  describe("Identity", () => {
    const updateCell: UpdateCellCommand = {
      type: "UPDATE_CELL",
      col: 0,
      row: 0,
      sheetId: "1",
      content: "test",
    };
    const updateCellPosition: UpdateCellPositionCommand = {
      type: "UPDATE_CELL_POSITION",
      sheetId: "1",
      cellId: "1",
      col: 1,
      row: 1,
    };
    const clearCell: ClearCellCommand = {
      type: "CLEAR_CELL",
      sheetId: "1",
      col: 1,
      row: 1,
    };
    const deleteContent: DeleteContentCommand = {
      type: "DELETE_CONTENT",
      sheetId: "1",
      target: [toZone("A1")],
    };
    const resizeColumns: ResizeColumnsCommand = {
      type: "RESIZE_COLUMNS",
      columns: [0],
      size: 10,
      sheetId: "1",
    };
    const resizeRows: ResizeRowsCommand = {
      type: "RESIZE_ROWS",
      rows: [0],
      size: 10,
      sheetId: "1",
    };
    const updateFigure: UpdateFigureCommand = {
      type: "UPDATE_FIGURE",
      id: "1",
    };
    const setFormatting: SetFormattingCommand = {
      type: "SET_FORMATTING",
      sheetId: "1",
      border: "all",
      target: [toZone("A1")],
    };
    const clearFormatting: ClearFormattingCommand = {
      type: "CLEAR_FORMATTING",
      sheetId: "1",
      target: [toZone("A1")],
    };
    const setBorder: SetBorderCommand = {
      type: "SET_BORDER",
      sheetId: "1",
      border: { left: ["thin", "#000"] },
      col: 1,
      row: 1,
    };
    const setDecimal: SetDecimalCommand = {
      type: "SET_DECIMAL",
      sheetId: "1",
      target: [toZone("A1")],
      step: 2,
    };
    const updateChart: UpdateChartCommand = {
      type: "UPDATE_CHART",
      definition: {} as CreateChartDefinition,
      id: "1",
    };
    test.each([
      updateCell,
      updateCellPosition,
      clearCell,
      deleteContent,
      resizeColumns,
      resizeRows,
      updateFigure,
      setFormatting,
      clearFormatting,
      setBorder,
      setDecimal,
      updateChart,
    ])("The inverse is the identity", (cmd: CoreCommand) => {
      expect(inverseCommand(cmd)).toEqual(cmd);
    });
  });
});
