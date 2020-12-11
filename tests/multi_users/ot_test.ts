import { transform } from "../../src/ot/ot";
import {
  AddMergeCommand,
  UpdateCellCommand,
  DuplicateSheetCommand,
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
