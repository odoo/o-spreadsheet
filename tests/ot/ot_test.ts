describe("OT", () => {});

// import { Model } from "../../src";
// import { transform } from "../../src/ot/ot";
// import {
//   AddMergeCommand,
//   UpdateCellCommand,
//   AddRowsCommand,
//   AddColumnsCommand,
//   RemoveRowsCommand,
//   RemoveColumnsCommand,
//   DuplicateSheetCommand,
//   DeleteSheetCommand,
// } from "../../src/types";
// import "../canvas.mock";

// let model: Model;

// //TODO PRO LUL: We can't use getters in OT, so we need to update Merge

// describe("UPDATE_CELL transformations", () => {
//   beforeEach(() => {
//     model = new Model();
//   });

//   describe("UPDATE_CELL & ADD_MERGE", () => {
//     test("Update top left merge cell", () => {
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 0,
//         row: 0,
//         content: "salut",
//       };
//       const addMerge: AddMergeCommand = {
//         type: "ADD_MERGE",
//         sheetId: model.getters.getActiveSheetId(),
//         zone: {
//           top: 0,
//           left: 0,
//           right: 1,
//           bottom: 1,
//         },
//       };
//       model.dispatch("ADD_MERGE", addMerge);
//       const result = transform(updateCell, addMerge);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell outside merge", () => {
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 9,
//         row: 9,
//         content: "salut",
//       };
//       const addMerge: AddMergeCommand = {
//         type: "ADD_MERGE",
//         sheetId: model.getters.getActiveSheetId(),
//         zone: {
//           top: 0,
//           left: 0,
//           right: 1,
//           bottom: 1,
//         },
//       };
//       model.dispatch("ADD_MERGE", addMerge);
//       const result = transform(updateCell, addMerge);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell inside the merge, but not top-left", () => {
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 1,
//         row: 1,
//         content: "salut",
//       };
//       const addMerge: AddMergeCommand = {
//         type: "ADD_MERGE",
//         sheetId: model.getters.getActiveSheetId(),
//         zone: {
//           top: 0,
//           left: 0,
//           right: 1,
//           bottom: 1,
//         },
//       };
//       model.dispatch("ADD_MERGE", addMerge);
//       const result = transform(updateCell, addMerge);
//       expect(result).toEqual([]);
//     });
//     test("update cell inside the merge, but not top-left, in another sheet", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "123" });
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: "123",
//         col: 1,
//         row: 1,
//         content: "salut",
//       };
//       const addMerge: AddMergeCommand = {
//         type: "ADD_MERGE",
//         sheetId: model.getters.getActiveSheetId(),
//         zone: {
//           top: 0,
//           left: 0,
//           right: 1,
//           bottom: 1,
//         },
//       };
//       model.dispatch("ADD_MERGE", addMerge);
//       const result = transform(updateCell, addMerge);
//       expect(result).toEqual([updateCell]);
//     });
//   });
//   describe("UPDATE_CELL & ADD_ROWS", () => {
//     test("update cell before added rows", () => {
//       const addRows: AddRowsCommand = {
//         type: "ADD_ROWS",
//         position: "after",
//         row: 5,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_ROWS", addRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 1,
//         row: 1,
//         content: "salut",
//       };
//       const result = transform(updateCell, addRows);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell after added rows", () => {
//       const addRows: AddRowsCommand = {
//         type: "ADD_ROWS",
//         position: "after",
//         row: 5,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_ROWS", addRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addRows);
//       expect(result).toEqual([
//         {
//           type: "UPDATE_CELL",
//           sheetId: model.getters.getActiveSheetId(),
//           col: 10,
//           row: 12,
//           content: "salut",
//         },
//       ]);
//     });
//     test("update cell in pivot row with row added before", () => {
//       const addRows: AddRowsCommand = {
//         type: "ADD_ROWS",
//         position: "before",
//         row: 10,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_ROWS", addRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addRows);
//       expect(result).toEqual([
//         {
//           type: "UPDATE_CELL",
//           sheetId: model.getters.getActiveSheetId(),
//           col: 10,
//           row: 12,
//           content: "salut",
//         },
//       ]);
//     });
//     test("update cell in pivot row with row added after", () => {
//       const addRows: AddRowsCommand = {
//         type: "ADD_ROWS",
//         position: "after",
//         row: 10,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_ROWS", addRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addRows);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell after added rows, in another sheet", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "123" });
//       const addRows: AddRowsCommand = {
//         type: "ADD_ROWS",
//         position: "after",
//         row: 5,
//         quantity: 2,
//         sheetId: "123",
//       };
//       model.dispatch("ADD_ROWS", addRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addRows);
//       expect(result).toEqual([updateCell]);
//     });
//   });

//   describe("UPDATE_CELL & ADD_COLUMNS", () => {
//     test("update cell before added columns", () => {
//       const addColumns: AddColumnsCommand = {
//         type: "ADD_COLUMNS",
//         position: "after",
//         column: 5,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_COLUMNS", addColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 1,
//         row: 1,
//         content: "salut",
//       };
//       const result = transform(updateCell, addColumns);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell after added columns", () => {
//       const addColumns: AddColumnsCommand = {
//         type: "ADD_COLUMNS",
//         position: "after",
//         column: 5,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_COLUMNS", addColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addColumns);
//       expect(result).toEqual([
//         {
//           type: "UPDATE_CELL",
//           sheetId: model.getters.getActiveSheetId(),
//           col: 12,
//           row: 10,
//           content: "salut",
//         },
//       ]);
//     });
//     test("update cell in pivot column with columns added before", () => {
//       const addColumns: AddColumnsCommand = {
//         type: "ADD_COLUMNS",
//         position: "before",
//         column: 10,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_COLUMNS", addColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addColumns);
//       expect(result).toEqual([
//         {
//           type: "UPDATE_CELL",
//           sheetId: model.getters.getActiveSheetId(),
//           col: 12,
//           row: 10,
//           content: "salut",
//         },
//       ]);
//     });
//     test("update cell in pivot column with columns added after", () => {
//       const addColumns: AddColumnsCommand = {
//         type: "ADD_COLUMNS",
//         position: "after",
//         column: 10,
//         quantity: 2,
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("ADD_COLUMNS", addColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addColumns);
//       expect(result).toEqual([updateCell]);
//     });
//     test("update cell after added columns, in another sheet", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "123" });
//       const addColumns: AddColumnsCommand = {
//         type: "ADD_COLUMNS",
//         position: "after",
//         column: 5,
//         quantity: 2,
//         sheetId: "123",
//       };
//       model.dispatch("ADD_COLUMNS", addColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, addColumns);
//       expect(result).toEqual([updateCell]);
//     });
//   });

//   describe("UPDATE_CELL & REMOVE_ROWS", () => {
//     test("remove rows before updated cell", () => {
//       const removeRows: RemoveRowsCommand = {
//         type: "REMOVE_ROWS",
//         rows: [2, 3, 5],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_ROWS", removeRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeRows);
//       expect(result).toEqual([Object.assign({}, updateCell, { row: 7 })]);
//     });
//     test("remove rows after updated cell", () => {
//       const removeRows: RemoveRowsCommand = {
//         type: "REMOVE_ROWS",
//         rows: [12, 13, 15],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_ROWS", removeRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeRows);
//       expect(result).toEqual([updateCell]);
//     });
//     test("remove rows before and after updated cell", () => {
//       const removeRows: RemoveRowsCommand = {
//         type: "REMOVE_ROWS",
//         rows: [2, 3, 5, 12, 13, 15],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_ROWS", removeRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeRows);
//       expect(result).toEqual([Object.assign({}, updateCell, { row: 7 })]);
//     });
//     test("update cell in removed row", () => {
//       const removeRows: RemoveRowsCommand = {
//         type: "REMOVE_ROWS",
//         rows: [10],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_ROWS", removeRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeRows);
//       expect(result).toEqual([]);
//     });
//     test("remove rows before updated cell, in another sheet", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "123" });
//       const removeRows: RemoveRowsCommand = {
//         type: "REMOVE_ROWS",
//         rows: [2, 3, 5],
//         sheetId: "123",
//       };
//       model.dispatch("REMOVE_ROWS", removeRows);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeRows);
//       expect(result).toEqual([updateCell]);
//     });
//   });

//   describe("UPDATE_CELL & REMOVE_COLUMNS", () => {
//     test("remove rows before updated cell", () => {
//       const removeColumns: RemoveColumnsCommand = {
//         type: "REMOVE_COLUMNS",
//         columns: [2, 3, 5],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_COLUMNS", removeColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeColumns);
//       expect(result).toEqual([Object.assign({}, updateCell, { col: 7 })]);
//     });
//     test("remove rows after updated cell", () => {
//       const removeColumns: RemoveColumnsCommand = {
//         type: "REMOVE_COLUMNS",
//         columns: [12, 13, 15],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_COLUMNS", removeColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeColumns);
//       expect(result).toEqual([updateCell]);
//     });
//     test("remove rows before and after updated cell", () => {
//       const removeColumns: RemoveColumnsCommand = {
//         type: "REMOVE_COLUMNS",
//         columns: [2, 3, 5, 12, 13, 15],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_COLUMNS", removeColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeColumns);
//       expect(result).toEqual([Object.assign({}, updateCell, { col: 7 })]);
//     });
//     test("update cell in removed row", () => {
//       const removeColumns: RemoveColumnsCommand = {
//         type: "REMOVE_COLUMNS",
//         columns: [10],
//         sheetId: model.getters.getActiveSheetId(),
//       };
//       model.dispatch("REMOVE_COLUMNS", removeColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeColumns);
//       expect(result).toEqual([]);
//     });
//     test("remove rows before updated cell", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "123" });
//       const removeColumns: RemoveColumnsCommand = {
//         type: "REMOVE_COLUMNS",
//         columns: [2, 3, 5],
//         sheetId: "123",
//       };
//       model.dispatch("REMOVE_COLUMNS", removeColumns);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: model.getters.getActiveSheetId(),
//         col: 10,
//         row: 10,
//         content: "salut",
//       };
//       const result = transform(updateCell, removeColumns);
//       expect(result).toEqual([updateCell]);
//     });
//   });

//   describe("UPDATE_CELL & DUPLICATE_SHEET", () => {
//     test("Duplicate the sheet on which the update cell is triggered", () => {
//       const sheetId = model.getters.getActiveSheetId();
//       const duplicateSheet: DuplicateSheetCommand = {
//         type: "DUPLICATE_SHEET",
//         name: "Dup",
//         sheetIdFrom: sheetId,
//         sheetIdTo: "42",
//       };
//       model.dispatch("DUPLICATE_SHEET", duplicateSheet);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: sheetId,
//         col: 0,
//         row: 0,
//         content: "salut",
//       };
//       const result = transform(updateCell, duplicateSheet);
//       expect(result).toEqual([updateCell, Object.assign({}, updateCell, { sheetId: "42" })]);
//     });
//     test("Duplicate another sheet", () => {
//       model.dispatch("CREATE_SHEET", { sheetId: "12345" });
//       const sheetId = model.getters.getActiveSheetId();
//       const duplicateSheet: DuplicateSheetCommand = {
//         type: "DUPLICATE_SHEET",
//         name: "Dup",
//         sheetIdFrom: "12345",
//         sheetIdTo: "42",
//       };
//       model.dispatch("DUPLICATE_SHEET", duplicateSheet);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId: sheetId,
//         col: 0,
//         row: 0,
//         content: "salut",
//       };
//       const result = transform(updateCell, duplicateSheet);
//       expect(result).toEqual([updateCell]);
//     });
//   });

//   describe("UPDATE_CELL & DELETE_SHEET", () => {
//     test("Delete the sheet on which the update cell is triggered", () => {
//       const sheetId = model.getters.getActiveSheetId();
//       model.dispatch("CREATE_SHEET", { sheetId: "12345" });
//       const deleteSheet: DeleteSheetCommand = {
//         type: "DELETE_SHEET",
//         sheetId,
//       };
//       model.dispatch("DELETE_SHEET", deleteSheet);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId,
//         col: 0,
//         row: 0,
//         content: "salut",
//       };
//       const result = transform(updateCell, deleteSheet);
//       expect(result).toEqual([]);
//     });
//     test("Delete another sheet", () => {
//       const sheetId = model.getters.getActiveSheetId();
//       model.dispatch("CREATE_SHEET", { sheetId: "12345" });
//       const deleteSheet: DeleteSheetCommand = {
//         type: "DELETE_SHEET",
//         sheetId: "12345",
//       };
//       model.dispatch("DELETE_SHEET", deleteSheet);
//       const updateCell: UpdateCellCommand = {
//         type: "UPDATE_CELL",
//         sheetId,
//         col: 0,
//         row: 0,
//         content: "salut",
//       };
//       const result = transform(updateCell, deleteSheet);
//       expect(result).toEqual([updateCell]);
//     });
//   });
// });
