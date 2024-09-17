import { toZone } from "../../src/helpers";
import { inverseCommand } from "../../src/helpers/inverse_commands";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  ClearCellCommand,
  ClearCellsCommand,
  ClearFormattingCommand,
  CoreCommand,
  CreateSheetCommand,
  DeleteContentCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetZoneBordersCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../src/types";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import { target } from "../test_helpers/helpers";

describe("Inverses commands", () => {
  describe("Add Columns", () => {
    const addColumns: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      position: "after",
      dimension: "COL",
      quantity: 2,
      base: 1,
      sheetId: "1",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addColumns)).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [2, 3],
          dimension: "COL",
        },
      ]);
    });

    test("Inverse with position = before", () => {
      expect(inverseCommand({ ...addColumns, position: "before" })).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [1, 2],
          dimension: "COL",
        },
      ]);
    });
  });
  describe("Add Rows", () => {
    const addRows: AddColumnsRowsCommand = {
      type: "ADD_COLUMNS_ROWS",
      dimension: "ROW",
      position: "after",
      quantity: 2,
      base: 1,
      sheetId: "1",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addRows)).toEqual([
        { type: "REMOVE_COLUMNS_ROWS", sheetId: "1", elements: [2, 3], dimension: "ROW" },
      ]);
    });

    test("Inverse with position = before", () => {
      expect(inverseCommand({ ...addRows, position: "before" })).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [1, 2],
          dimension: "ROW",
        },
      ]);
    });
  });

  test("Add Merge", () => {
    const addMerge: AddMergeCommand = {
      type: "ADD_MERGE",
      sheetId: "1",
      target: target("A1:B1"),
    };
    expect(inverseCommand(addMerge)).toEqual([{ ...addMerge, type: "REMOVE_MERGE" }]);
  });

  test("Remove Merge", () => {
    const removeMerge: RemoveMergeCommand = {
      type: "REMOVE_MERGE",
      sheetId: "1",
      target: target("A1:B1"),
    };
    expect(inverseCommand(removeMerge)).toEqual([{ ...removeMerge, type: "ADD_MERGE" }]);
  });

  test("Create sheet", () => {
    const createSheet: CreateSheetCommand = {
      type: "CREATE_SHEET",
      position: 1,
      sheetId: "1",
    };
    expect(inverseCommand(createSheet)).toEqual([{ type: "DELETE_SHEET", sheetId: "1" }]);
  });

  test("Duplicate Sheet", () => {
    const duplicateSheet: DuplicateSheetCommand = {
      type: "DUPLICATE_SHEET",
      sheetId: "1",
      sheetIdTo: "2",
    };
    expect(inverseCommand(duplicateSheet)).toEqual([{ type: "DELETE_SHEET", sheetId: "2" }]);
  });

  describe("Remove columns", () => {
    const removeColumns: RemoveColumnsRowsCommand = {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: "COL",
      elements: [0],
      sheetId: "42",
    };
    test("Inverse with column = 0", () => {
      expect(inverseCommand(removeColumns)).toEqual([
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "before",
          quantity: 1,
          base: 0,
          sheetId: "42",
        },
      ]);
    });
    test("Inverse with column > 0", () => {
      expect(inverseCommand({ ...removeColumns, elements: [1, 2, 4, 5, 9] })).toEqual([
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "after",
          quantity: 2,
          base: 0,
          sheetId: "42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "after",
          quantity: 2,
          base: 3,
          sheetId: "42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "after",
          quantity: 1,
          base: 8,
          sheetId: "42",
        },
      ]);
    });
  });

  describe("Remove rows", () => {
    const removeRows: RemoveColumnsRowsCommand = {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: "ROW",
      elements: [0],
      sheetId: "42",
    };
    test("Inverse with row = 0", () => {
      expect(inverseCommand(removeRows)).toEqual([
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "before",
          quantity: 1,
          base: 0,
          sheetId: "42",
        },
      ]);
    });
    test("Inverse with row > 0", () => {
      expect(inverseCommand({ ...removeRows, elements: [1, 2, 4, 5, 9] })).toEqual([
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "after",
          quantity: 2,
          base: 0,
          sheetId: "42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "after",
          quantity: 2,
          base: 3,
          sheetId: "42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "after",
          quantity: 1,
          base: 8,
          sheetId: "42",
        },
      ]);
    });
  });

  test("Delete sheet", () => {
    const deleteSheet: DeleteSheetCommand = {
      type: "DELETE_SHEET",
      sheetId: "42",
    };
    expect(inverseCommand(deleteSheet)).toEqual([
      { type: "CREATE_SHEET", position: 1, sheetId: "42" },
    ]);
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
    const clearCells: ClearCellsCommand = {
      type: "CLEAR_CELLS",
      sheetId: "1",
      target: [toZone("A1")],
    };
    const deleteContent: DeleteContentCommand = {
      type: "DELETE_CONTENT",
      sheetId: "1",
      target: [toZone("A1")],
    };
    const resizeColumns: ResizeColumnsRowsCommand = {
      type: "RESIZE_COLUMNS_ROWS",
      dimension: "COL",
      elements: [0],
      size: 10,
      sheetId: "1",
    };
    const resizeRows: ResizeColumnsRowsCommand = {
      type: "RESIZE_COLUMNS_ROWS",
      dimension: "ROW",
      elements: [0],
      size: 10,
      sheetId: "1",
    };
    const updateFigure: UpdateFigureCommand = {
      type: "UPDATE_FIGURE",
      sheetId: "42",
      id: "1",
    };
    const setZoneBorders: SetZoneBordersCommand = {
      type: "SET_ZONE_BORDERS",
      sheetId: "1",
      border: { position: "all" },
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
      border: { left: { style: "thin", color: "#000" } },
      col: 1,
      row: 1,
    };
    const updateChart: UpdateChartCommand = {
      type: "UPDATE_CHART",
      sheetId: "42",
      definition: {} as LineChartDefinition,
      id: "1",
    };
    test.each([
      updateCell,
      updateCellPosition,
      clearCell,
      clearCells,
      deleteContent,
      resizeColumns,
      resizeRows,
      updateFigure,
      setZoneBorders,
      clearFormatting,
      setBorder,
      updateChart,
    ])("The inverse is the identity", (cmd: CoreCommand) => {
      expect(inverseCommand(cmd)).toEqual([cmd]);
    });
  });
});
