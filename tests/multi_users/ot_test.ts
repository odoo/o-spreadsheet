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
} from "../../src/types";
import "../canvas.mock";

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
      expect(result).toEqual([toTransform]);
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
      expect(result).toEqual([toTransform]);
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
      expect(result).toEqual([toTransform]);
    });

    // TODO Unskip
    test.skip("Update the content and style of the same cell", () => {
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
      expect(result).toEqual([toTransform]);
    });
  });

  // TODO Skip because the OT is not correct anymore without getters
  describe.skip("UPDATE_CELL & ADD_MERGE", () => {
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([
        {
          type: "UPDATE_CELL",
          sheetId: "42",
          col: 10,
          row: 12,
          content: "salut",
        },
      ]);
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
      expect(result).toEqual([
        {
          type: "UPDATE_CELL",
          sheetId: "42",
          col: 10,
          row: 12,
          content: "salut",
        },
      ]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([
        {
          type: "UPDATE_CELL",
          sheetId: "42",
          col: 12,
          row: 10,
          content: "salut",
        },
      ]);
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
      expect(result).toEqual([
        {
          type: "UPDATE_CELL",
          sheetId: "42",
          col: 12,
          row: 10,
          content: "salut",
        },
      ]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([Object.assign({}, updateCell, { row: 7 })]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([Object.assign({}, updateCell, { row: 7 })]);
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
      expect(result).toEqual([]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([Object.assign({}, updateCell, { col: 7 })]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([Object.assign({}, updateCell, { col: 7 })]);
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
      expect(result).toEqual([]);
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
      expect(result).toEqual([updateCell]);
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
      expect(result).toEqual([updateCell, Object.assign({}, updateCell, { sheetId: "42" })]);
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
      expect(result).toEqual([updateCell]);
    });
  });

  describe("UPDATE_CELL & DELETE_SHEET", () => {
    test("Delete the sheet on which the update cell is triggered", () => {
      const sheetId = "42";
      const deleteSheet: DeleteSheetCommand = {
        type: "DELETE_SHEET",
        sheetId,
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId,
        col: 0,
        row: 0,
        content: "salut",
      };
      const result = transform(updateCell, deleteSheet);
      expect(result).toEqual([]);
    });
    test("Delete another sheet", () => {
      const deleteSheet: DeleteSheetCommand = {
        type: "DELETE_SHEET",
        sheetId: "12345",
      };
      const updateCell: UpdateCellCommand = {
        type: "UPDATE_CELL",
        sheetId: "42",
        col: 0,
        row: 0,
        content: "salut",
      };
      const result = transform(updateCell, deleteSheet);
      expect(result).toEqual([updateCell]);
    });
  });
});
