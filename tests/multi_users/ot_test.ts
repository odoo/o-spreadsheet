import { toZone } from "../../src/helpers";
import { transform } from "../../src/ot/ot";
import {
  AddMergeCommand,
  UpdateCellCommand,
  AddRowsCommand,
  AddColumnsCommand,
  RemoveRowsCommand,
  RemoveColumnsCommand,
  DuplicateSheetCommand,
  DeleteSheetCommand,
  ClearCellCommand,
  DeleteContentCommand,
  RemoveMergeCommand,
  MoveSheetCommand,
  RenameSheetCommand,
  AddConditionalFormatCommand,
  CreateFigureCommand,
  Figure,
  SetFormattingCommand,
  ClearFormattingCommand,
  SetBorderCommand,
  SetDecimalCommand,
  CreateChartCommand,
} from "../../src/types";
import "../canvas.mock";
import { createEqualCF } from "../helpers";

describe("UPDATE_CELL transformations", () => {
  describe("UPDATE_CELL & UPDATE_CELL", () => {
    test("Update content of the same cell", () => {
      const toTransform: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "salut",
      };
      const executed: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "Hi",
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });

    test("Update two differents cells", () => {
      const toTransform: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 1,
        row: 0,
        content: "salut",
      };
      const executed: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "Hi",
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });

    test("Update the same XC on two different sheets", () => {
      const toTransform: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "salut",
      };
      const executed: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "43",
        col: 0,
        row: 0,
        content: "Hi",
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });

    test("Update the content and style of the same cell", () => {
      const toTransform: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "salut",
      };
      const executed: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        style: { fillColor: "orange" },
      };
      const result = transform(toTransform, executed);
      expect(result).toEqual(toTransform);
    });
  });

  describe("UPDATE_CELL & ADD_MERGE", () => {
    test("Update top left merge cell", () => {
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "salut",
      };
      const addMerge: AddMergeCommand = {
        type: "ADD_MERGE",
        sheetId: "42",
        zone: {
          top: 0,
          left: 0,
          right: 1,
          bottom: 1,
        },
      };
      const result = transform(updateCell, addMerge);
      expect(result).toEqual(updateCell);
    });
    test("update cell outside merge", () => {
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 9,
        row: 9,
        content: "salut",
      };
      const addMerge: AddMergeCommand = {
        type: "ADD_MERGE",
        sheetId: "42",
        zone: {
          top: 0,
          left: 0,
          right: 1,
          bottom: 1,
        },
      };
      const result = transform(updateCell, addMerge);
      expect(result).toEqual(updateCell);
    });
    test("update cell inside the merge, but not top-left", () => {
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 1,
        row: 1,
        content: "salut",
      };
      const addMerge: AddMergeCommand = {
        type: "ADD_MERGE",
        sheetId: "42",
        zone: {
          top: 0,
          left: 0,
          right: 1,
          bottom: 1,
        },
      };
      const result = transform(updateCell, addMerge);
      expect(result).toBeUndefined();
    });
    test("update cell inside the merge, but not top-left, in another sheet", () => {
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "123",
        col: 1,
        row: 1,
        content: "salut",
      };
      const addMerge: AddMergeCommand = {
        type: "ADD_MERGE",
        sheetId: "42",
        zone: {
          top: 0,
          left: 0,
          right: 1,
          bottom: 1,
        },
      };
      const result = transform(updateCell, addMerge);
      expect(result).toEqual(updateCell);
    });
  });
  describe("UPDATE_CELL & ADD_ROWS", () => {
    test("update cell before added rows", () => {
      const addRows: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 1,
        row: 1,
        content: "salut",
      };
      const result = transform(updateCell, addRows);
      expect(result).toEqual(updateCell);
    });
    test("update cell after added rows", () => {
      const addRows: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addRows);
      expect(result).toEqual({
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 12,
        content: "salut",
      });
    });
    test("update cell in pivot row with row added before", () => {
      const addRows: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "before",
        row: 10,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addRows);
      expect(result).toEqual({
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 12,
        content: "salut",
      });
    });
    test("update cell in pivot row with row added after", () => {
      const addRows: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 10,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addRows);
      expect(result).toEqual(updateCell);
    });
    test("update cell after added rows, in another sheet", () => {
      const addRows: AddRowsCommand = {
        type: "ADD_ROWS",
        position: "after",
        row: 5,
        quantity: 2,
        sheetId: "123",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addRows);
      expect(result).toEqual(updateCell);
    });
  });

  describe("UPDATE_CELL & ADD_COLUMNS", () => {
    test("update cell before added columns", () => {
      const addColumns: AddColumnsCommand = {
        type: "ADD_COLUMNS",
        position: "after",
        column: 5,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 1,
        row: 1,
        content: "salut",
      };
      const result = transform(updateCell, addColumns);
      expect(result).toEqual(updateCell);
    });
    test("update cell after added columns", () => {
      const addColumns: AddColumnsCommand = {
        type: "ADD_COLUMNS",
        position: "after",
        column: 5,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addColumns);
      expect(result).toEqual({
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 12,
        row: 10,
        content: "salut",
      });
    });
    test("update cell in pivot column with columns added before", () => {
      const addColumns: AddColumnsCommand = {
        type: "ADD_COLUMNS",
        position: "before",
        column: 10,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addColumns);
      expect(result).toEqual({
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 12,
        row: 10,
        content: "salut",
      });
    });
    test("update cell in pivot column with columns added after", () => {
      const addColumns: AddColumnsCommand = {
        type: "ADD_COLUMNS",
        position: "after",
        column: 10,
        quantity: 2,
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addColumns);
      expect(result).toEqual(updateCell);
    });
    test("update cell after added columns, in another sheet", () => {
      const addColumns: AddColumnsCommand = {
        type: "ADD_COLUMNS",
        position: "after",
        column: 5,
        quantity: 2,
        sheetId: "123",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, addColumns);
      expect(result).toEqual(updateCell);
    });
  });

  describe("UPDATE_CELL & REMOVE_ROWS", () => {
    test("remove rows before updated cell", () => {
      const removeRows: RemoveRowsCommand = {
        type: "REMOVE_ROWS",
        rows: [2, 3, 5],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeRows);
      expect(result).toEqual({ ...updateCell, row: 7 });
    });
    test("remove rows after updated cell", () => {
      const removeRows: RemoveRowsCommand = {
        type: "REMOVE_ROWS",
        rows: [12, 13, 15],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeRows);
      expect(result).toEqual(updateCell);
    });
    test("remove rows before and after updated cell", () => {
      const removeRows: RemoveRowsCommand = {
        type: "REMOVE_ROWS",
        rows: [2, 3, 5, 12, 13, 15],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeRows);
      expect(result).toEqual({ ...updateCell, row: 7 });
    });
    test("update cell in removed row", () => {
      const removeRows: RemoveRowsCommand = {
        type: "REMOVE_ROWS",
        rows: [10],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeRows);
      expect(result).toBeUndefined();
    });
    test("remove rows before updated cell, in another sheet", () => {
      const removeRows: RemoveRowsCommand = {
        type: "REMOVE_ROWS",
        rows: [2, 3, 5],
        sheetId: "123",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeRows);
      expect(result).toEqual(updateCell);
    });
  });

  describe("UPDATE_CELL & REMOVE_COLUMNS", () => {
    test("remove rows before updated cell", () => {
      const removeColumns: RemoveColumnsCommand = {
        type: "REMOVE_COLUMNS",
        columns: [2, 3, 5],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeColumns);
      expect(result).toEqual({ ...updateCell, col: 7 });
    });
    test("remove rows after updated cell", () => {
      const removeColumns: RemoveColumnsCommand = {
        type: "REMOVE_COLUMNS",
        columns: [12, 13, 15],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeColumns);
      expect(result).toEqual(updateCell);
    });
    test("remove rows before and after updated cell", () => {
      const removeColumns: RemoveColumnsCommand = {
        type: "REMOVE_COLUMNS",
        columns: [2, 3, 5, 12, 13, 15],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeColumns);
      expect(result).toEqual({ ...updateCell, col: 7 });
    });
    test("update cell in removed row", () => {
      const removeColumns: RemoveColumnsCommand = {
        type: "REMOVE_COLUMNS",
        columns: [10],
        sheetId: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeColumns);
      expect(result).toBeUndefined();
    });
    test("remove rows before updated cell", () => {
      const removeColumns: RemoveColumnsCommand = {
        type: "REMOVE_COLUMNS",
        columns: [2, 3, 5],
        sheetId: "123",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 10,
        row: 10,
        content: "salut",
      };
      const result = transform(updateCell, removeColumns);
      expect(result).toEqual(updateCell);
    });
  });

  describe("UPDATE_CELL & DUPLICATE_SHEET", () => {
    test("Duplicate the sheet on which the update cell is triggered", () => {
      const sheetId = "42";
      const duplicateSheet: DuplicateSheetCommand = {
        type: "DUPLICATE_SHEET",
        name: "Dup",
        sheetIdFrom: sheetId,
        sheetIdTo: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: sheetId,
        col: 0,
        row: 0,
        content: "salut",
      };
      const result = transform(updateCell, duplicateSheet);
      expect(result).toEqual(updateCell);
    });
    test("Duplicate another sheet", () => {
      const sheetId = "42";
      const duplicateSheet: DuplicateSheetCommand = {
        type: "DUPLICATE_SHEET",
        name: "Dup",
        sheetIdFrom: "12345",
        sheetIdTo: "42",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: sheetId,
        col: 0,
        row: 0,
        content: "salut",
      };
      const result = transform(updateCell, duplicateSheet);
      expect(result).toEqual(updateCell);
    });
  });
});

describe("OT with DELETE_SHEET", () => {
  const deletedSheetId = "deletedSheet";
  const sheetId = "stillPresent";
  const deleteSheet: DeleteSheetCommand = { type: "DELETE_SHEET", sheetId: deletedSheetId };

  describe("UPDATE_CELL - DELETE_SHEET", () => {
    const updateCell: Omit<UpdateCellCommand, "sheetId"> = { type: "UPDATE_CELL", col: 0, row: 0 };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...updateCell, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...updateCell, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("CLEAR_CELL - DELETE_SHEET", () => {
    const clearCell: Omit<ClearCellCommand, "sheetId"> = { type: "CLEAR_CELL", col: 0, row: 0 };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...clearCell, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...clearCell, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("DELETE_CONTENT - DELETE_SHEET", () => {
    const deleteContent: Omit<DeleteContentCommand, "sheetId"> = {
      type: "DELETE_CONTENT",
      target: [toZone("A1")],
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...deleteContent, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...deleteContent, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("ADD_COLUMNS - DELETE_SHEET", () => {
    const addColumn: Omit<AddColumnsCommand, "sheetId"> = {
      type: "ADD_COLUMNS",
      column: 0,
      position: "after",
      quantity: 1,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...addColumn, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...addColumn, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("ADD_ROWS - DELETE_SHEET", () => {
    const addRows: Omit<AddRowsCommand, "sheetId"> = {
      type: "ADD_ROWS",
      row: 1,
      position: "after",
      quantity: 1,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...addRows, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...addRows, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("REMOVE_COLUMNS - DELETE_SHEET", () => {
    const removeColumn: Omit<RemoveColumnsCommand, "sheetId"> = {
      type: "REMOVE_COLUMNS",
      columns: [0],
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...removeColumn, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...removeColumn, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("REMOVE_ROWS - DELETE_SHEET", () => {
    const removeRows: Omit<RemoveRowsCommand, "sheetId"> = { type: "REMOVE_ROWS", rows: [0] };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...removeRows, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...removeRows, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("ADD_MERGE - DELETE_SHEET", () => {
    const addMerge: Omit<AddMergeCommand, "sheetId"> = { type: "ADD_MERGE", zone: toZone("A1:B1") };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...addMerge, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...addMerge, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("REMOVE_MERGE - DELETE_SHEET", () => {
    const removeMerge: Omit<RemoveMergeCommand, "sheetId"> = {
      type: "REMOVE_MERGE",
      zone: toZone("A1:B1"),
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...removeMerge, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...removeMerge, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("MOVE_SHEET - DELETE_SHEET", () => {
    const moveSheet: Omit<MoveSheetCommand, "sheetId"> = { type: "MOVE_SHEET", direction: "left" };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...moveSheet, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...moveSheet, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("RENAME_SHEET - DELETE_SHEET", () => {
    const renameSheet: Omit<RenameSheetCommand, "sheetId"> = { type: "RENAME_SHEET", name: "test" };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...renameSheet, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...renameSheet, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("ADD_CONDITIONAL_FORMAT - DELETE_SHEET", () => {
    const addCF: Omit<AddConditionalFormatCommand, "sheetId"> = {
      type: "ADD_CONDITIONAL_FORMAT",
      cf: createEqualCF(["A1:B1"], "test", { fillColor: "orange" }, "id"),
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...addCF, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...addCF, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("CREATE_FIGURE - DELETE_SHEET", () => {
    const createFigure: Omit<CreateFigureCommand, "sheetId"> = {
      type: "CREATE_FIGURE",
      figure: {} as Figure<string>,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...createFigure, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...createFigure, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("SET_FORMATTING - DELETE_SHEET", () => {
    const setFormatting: Omit<SetFormattingCommand, "sheetId"> = {
      type: "SET_FORMATTING",
      target: [toZone("A1")],
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...setFormatting, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...setFormatting, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("CLEAR_FORMATTING - DELETE_SHEET", () => {
    const clearFormatting: Omit<ClearFormattingCommand, "sheetId"> = {
      type: "CLEAR_FORMATTING",
      target: [toZone("A1")],
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...clearFormatting, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...clearFormatting, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("SET_BORDER - DELETE_SHEET", () => {
    const setBorder: Omit<SetBorderCommand, "sheetId"> = {
      type: "SET_BORDER",
      col: 0,
      row: 0,
      border: undefined,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...setBorder, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...setBorder, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("SET_DECIMAL - DELETE_SHEET", () => {
    const setDecimal: Omit<SetDecimalCommand, "sheetId"> = {
      type: "SET_DECIMAL",
      target: [toZone("A1")],
      step: 3,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...setDecimal, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...setDecimal, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });

  describe("CREATE_CHART - DELETE_SHEET", () => {
    const createChart: Omit<CreateChartCommand, "sheetId"> = {
      type: "CREATE_CHART",
      id: "1",
      definition: {} as any,
    };

    test("Delete the sheet on which the command is triggered", () => {
      const result = transform({ ...createChart, sheetId: deletedSheetId }, deleteSheet);
      expect(result).toBeUndefined();
    });
    test("Delete another sheet", () => {
      const cmd = { ...createChart, sheetId };
      const result = transform(cmd, deleteSheet);
      expect(result).toEqual(cmd);
    });
  });
});
