import { inverseCommand } from "@odoo/o-spreadsheet-engine/helpers/inverse_command";
import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/line_chart";
import { toZone } from "../../src/helpers";
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
  LockSheetCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  ResizeColumnsRowsCommand,
  SetBorderCommand,
  SetZoneBordersCommand,
  UnlockSheetCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../src/types";
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
      sheetName: "Sheet42",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addColumns)).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [2, 3],
          dimension: "COL",
          sheetName: "Sheet42",
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
          sheetName: "Sheet42",
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
      sheetName: "Sheet42",
    };

    test("Inverse with position = after", () => {
      expect(inverseCommand(addRows)).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [2, 3],
          dimension: "ROW",
          sheetName: "Sheet42",
        },
      ]);
    });

    test("Inverse with position = before", () => {
      expect(inverseCommand({ ...addRows, position: "before" })).toEqual([
        {
          type: "REMOVE_COLUMNS_ROWS",
          sheetId: "1",
          elements: [1, 2],
          dimension: "ROW",
          sheetName: "Sheet42",
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
      name: "SheetName",
    };
    expect(inverseCommand(createSheet)).toEqual([
      { type: "DELETE_SHEET", sheetId: "1", sheetName: "SheetName" },
    ]);
  });

  test("Duplicate Sheet", () => {
    const duplicateSheet: DuplicateSheetCommand = {
      type: "DUPLICATE_SHEET",
      sheetId: "1",
      sheetIdTo: "2",
      sheetNameTo: "Copy of Sheet1",
    };
    expect(inverseCommand(duplicateSheet)).toEqual([
      { type: "DELETE_SHEET", sheetId: "2", sheetName: "" },
    ]);
  });

  describe("Remove columns", () => {
    const removeColumns: RemoveColumnsRowsCommand = {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: "COL",
      elements: [0],
      sheetId: "42",
      sheetName: "Sheet42",
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
          sheetName: "Sheet42",
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
          sheetName: "Sheet42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "after",
          quantity: 2,
          base: 3,
          sheetId: "42",
          sheetName: "Sheet42",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "COL",
          position: "after",
          quantity: 1,
          base: 8,
          sheetId: "42",
          sheetName: "Sheet42",
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
      sheetName: "SheetName",
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
          sheetName: "SheetName",
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
          sheetName: "SheetName",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "after",
          quantity: 2,
          base: 3,
          sheetId: "42",
          sheetName: "SheetName",
        },
        {
          type: "ADD_COLUMNS_ROWS",
          dimension: "ROW",
          position: "after",
          quantity: 1,
          base: 8,
          sheetId: "42",
          sheetName: "SheetName",
        },
      ]);
    });
  });

  test("Delete sheet", () => {
    const deleteSheet: DeleteSheetCommand = {
      type: "DELETE_SHEET",
      sheetId: "42",
      sheetName: "Sheet42",
    };
    expect(inverseCommand(deleteSheet)).toEqual([
      { type: "CREATE_SHEET", position: 1, sheetId: "42", name: "Sheet42" },
    ]);
  });

  test("Lock sheet", () => {
    const lockSheet: LockSheetCommand = {
      type: "LOCK_SHEET",
      sheetId: "42",
    };
    expect(inverseCommand(lockSheet)).toEqual([{ type: "UNLOCK_SHEET", sheetId: "42" }]);
  });

  test("Lock sheet", () => {
    const unlockSheet: UnlockSheetCommand = {
      type: "UNLOCK_SHEET",
      sheetId: "42",
    };
    expect(inverseCommand(unlockSheet)).toEqual([{ type: "LOCK_SHEET", sheetId: "42" }]);
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
      cellId: 1,
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
      figureId: "1",
      col: 0,
      row: 0,
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
      figureId: "1",
      chartId: "1",
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
