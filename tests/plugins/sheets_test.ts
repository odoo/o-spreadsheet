import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell, createEqualCF, testUndoRedo, setCellContent, getCellContent } from "../helpers";
import { uuidv4, toZone } from "../../src/helpers";
import { CancelledReason } from "../../src/types";

describe("sheets", () => {
  test("can create a new sheet, then undo, then redo", () => {
    const model = new Model();
    expect(model.getters.getVisibleSheets().length).toBe(1);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");

    model.dispatch("CREATE_SHEET", { activate: true, sheetId: "42" });
    expect(model.getters.getVisibleSheets().length).toBe(2);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet2");

    model.dispatch("UNDO");
    expect(model.getters.getVisibleSheets().length).toBe(1);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");

    model.dispatch("REDO");
    expect(model.getters.getVisibleSheets().length).toBe(2);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet2");
  });

  test("Creating a new sheet insert it just after the active", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "42" });
    model.dispatch("CREATE_SHEET", { sheetId: "43", name: "43" });
    expect(model.getters.getSheets()[1].id).toBe("43");
    expect(model.getters.getSheets()[2].id).toBe("42");
  });

  test("Creating a new sheet does not activate it by default", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];

    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(model.getters.getSheets().map((s) => s.id)).toEqual([sheet1]);
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const sheet2 = model.getters.getVisibleSheets()[1];
    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(model.getters.getSheets().map((s) => s.id)).toEqual([sheet1, sheet2]);
  });

  test("Can create a new sheet with given size and name", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", {
      rows: 2,
      cols: 4,
      name: "SheetTest",
      activate: true,
      sheetId: "42",
    });
    const activeSheet = model.getters.getActiveSheet();
    expect(activeSheet.cols.length).toBe(4);
    expect(activeSheet.rows.length).toBe(2);
    expect(activeSheet.name).toBe("SheetTest");
  });

  test("Cannot create a sheet with a name already existent", () => {
    const model = new Model();
    const name = model.getters.getSheetName(model.getters.getActiveSheetId());
    expect(model.dispatch("CREATE_SHEET", { name, sheetId: "42" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
  });

  test("Name is correctly generated when creating a sheet without given name", () => {
    const model = new Model();
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("CREATE_SHEET", { sheetId: "42", activate: true });
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet2");
    model.dispatch("CREATE_SHEET", { sheetId: "43", activate: true });
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet3");
    model.dispatch("DELETE_SHEET", { sheetId: "42" });
    expect(model.getters.getSheets()[0].name).toBe("Sheet1");
    expect(model.getters.getSheets()[1].name).toBe("Sheet3");
    model.dispatch("CREATE_SHEET", { sheetId: "44", activate: true });
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet2");
  });

  test("Cannot delete an invalid sheet", async () => {
    const model = new Model();
    expect(model.dispatch("DELETE_SHEET", { sheetId: "invalid" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });

  test("Cannot delete an invalid sheet; confirmation", async () => {
    const model = new Model();
    expect(model.dispatch("DELETE_SHEET_CONFIRMATION", { sheetId: "invalid" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });

  test("can read a value in same sheet", () => {
    const model = new Model();
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");

    setCellContent(model, "A1", "3");
    setCellContent(model, "A2", "=Sheet1!A1");

    expect(getCell(model, "A2")!.value).toBe(3);
  });

  test("can read a value in another sheet", () => {
    const model = new Model();
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");

    setCellContent(model, "A1", "3");
    model.dispatch("CREATE_SHEET", { activate: true, sheetId: "42" });
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet2");
    setCellContent(model, "A1", "=Sheet1!A1");
    expect(getCell(model, "A1")!.value).toBe(3);
  });

  test("throw if invalid sheet name", () => {
    const model = new Model();
    setCellContent(model, "A1", "=Sheet133!A1");

    expect(getCell(model, "A1")!.value).toBe("#ERROR");
  });

  test("cannot activate an invalid sheet", () => {
    const model = new Model();
    const result = model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: "INVALID ID",
    });
    expect(result).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });

  test("evaluating multiple sheets", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "3" } },
        },
      ],
    });

    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(3);
  });

  test("evaluating multiple sheets, 2", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=A4" },
            A4: { content: "3" },
          },
        },
      ],
    });

    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(3);
  });

  test("evaluating multiple sheets, 3 (with range)", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=SUM(A1:A5)" },
            A1: { content: "2" },
            A4: { content: "3" },
          },
        },
      ],
    });

    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(5);
  });

  test("evaluating multiple sheets: cycles", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B1: { content: "=DEF!B2" },
            C3: { content: "=DEF!C5 + 1" },
            C4: { content: "40" },
          },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=ABC!B1" },
            C5: { content: "=ABC!C4 + 1" },
          },
        },
      ],
    });

    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe("#CYCLE");
    expect(getCell(model, "C3")!.value).toBe(42);
  });

  test("evaluation from one sheet to another no render", () => {
    const model = new Model({
      sheets: [
        {
          name: "small",
          id: "smallId",
          colNumber: 2,
          rowNumber: 2,
          cells: {
            A2: { content: "=big!A2" },
          },
        },
        {
          name: "big",
          id: "bigId",
          colNumber: 5,
          rowNumber: 5,
          cells: {
            A1: { content: "23" },
            A2: { content: "=A1" },
          },
        },
      ],
    });
    expect(getCell(model, "A2")!.value).toBe(23);
  });

  test("cells are updated when dependency in other sheet is updated", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { activate: true, sheetId: "42" });
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];

    expect(model.getters.getActiveSheetId()).toEqual(sheet2);
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(model.getters.getActiveSheetId()).toEqual(sheet1);
    setCellContent(model, "A1", "=Sheet2!A1");
    expect(getCellContent(model, "A1")).toEqual("0");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet1, sheetIdTo: sheet2 });
    setCellContent(model, "A1", "3");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(model.getters.getActiveSheetId()).toEqual(sheet1);
    expect(getCellContent(model, "A1")).toEqual("3");
  });

  test("can move a sheet", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    const beforeMoveSheet = model.exportData();
    model.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "right" });
    expect(model.getters.getActiveSheetId()).toEqual(sheet1);
    expect(model.getters.getVisibleSheets()[0]).toEqual(sheet2);
    expect(model.getters.getVisibleSheets()[1]).toEqual(sheet1);
    model.dispatch("UNDO");
    expect(model.getters.getVisibleSheets()[0]).toEqual(sheet1);
    expect(model.getters.getVisibleSheets()[1]).toEqual(sheet2);
    expect(beforeMoveSheet).toEqual(model.exportData());
  });

  test("cannot move the first sheet to left and the last to right", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    expect(model.dispatch("MOVE_SHEET", { sheetId: sheet1, direction: "left" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetMove,
    });
    expect(model.dispatch("MOVE_SHEET", { sheetId: sheet2, direction: "right" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetMove,
    });
  });

  test("Can rename a sheet", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const name = "NEW_NAME";
    model.dispatch("RENAME_SHEET", { sheetId: sheet, name });
    expect(model.getters.getSheets().find((s) => s.id === sheet)!.name).toBe(name);
  });

  test("Cannot rename an invalid sheet", async () => {
    const model = new Model();
    expect(
      model.dispatch("RENAME_SHEET", {
        sheetId: "invalid",
        name: "hello",
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });

  test("New sheet name is trimmed", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const name = " NEW_NAME   ";
    model.dispatch("RENAME_SHEET", { sheetId: sheet, name });
    expect(model.getters.getSheets().find((s) => s.id === sheet)!.name).toBe("NEW_NAME");
  });

  test("Cannot rename a sheet with existing name", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const name = "NEW_NAME";
    model.dispatch("CREATE_SHEET", { name, sheetId: "42" });
    expect(model.dispatch("RENAME_SHEET", { sheetId: sheet, name })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
    expect(model.dispatch("RENAME_SHEET", { sheetId: sheet, name: "new_name" })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
    expect(model.dispatch("RENAME_SHEET", { sheetId: sheet, name: "new_name " })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
  });

  test("Cannot rename a sheet without name", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    expect(model.dispatch("RENAME_SHEET", { sheetId: sheet, name: undefined })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
    expect(model.dispatch("RENAME_SHEET", { sheetId: sheet, name: "    " })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
  });

  test("Sheet reference are correctly updated", () => {
    const model = new Model();
    const name = "NEW_NAME";
    const sheet1 = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "=NEW_NAME!A1");

    model.dispatch("CREATE_SHEET", { name, sheetId: "42", activate: true });
    const sheet2 = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");
    const nextName = "NEXT NAME";
    model.dispatch("RENAME_SHEET", { sheetId: sheet2, name: nextName });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("='NEXT NAME'!A1");
    model.dispatch("UNDO"); // Activate Sheet
    model.dispatch("UNDO"); // Rename sheet
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("=NEW_NAME!A1");
  });

  test("Rename a sheet will call editText", async () => {
    const editText = jest.fn();
    const model = new Model(
      {
        sheets: [
          {
            colNumber: 5,
            rowNumber: 5,
          },
        ],
      },
      { editText }
    );
    model.dispatch("RENAME_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
      interactive: true,
    });
    expect(editText).toHaveBeenCalled();
  });

  test("Rename a sheet with interaction", async () => {
    const editText = jest.fn(
      (title: string, placeholder: string, callback: (text: string | null) => any) => {
        callback("new name");
      }
    );
    const model = new Model(
      {
        sheets: [
          {
            colNumber: 5,
            rowNumber: 5,
          },
        ],
      },
      { editText }
    );
    model.dispatch("RENAME_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
      interactive: true,
    });
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("new name");
  });

  test("Can duplicate a sheet", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    model.dispatch("UNDO");
    expect(model.getters.getSheets()).toHaveLength(1);
    model.dispatch("REDO");
    expect(model.getters.getSheets()).toHaveLength(2);
  });

  test("Duplicate a sheet make the newly created active", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: "42", name: "dup" });
    expect(model.getters.getActiveSheetId()).toBe("42");
  });

  test("Cannot duplicate a sheet with the same name", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    const name = model.getters.getSheets()[0].name;
    const id = uuidv4();
    expect(model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: id, name })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongSheetName,
    });
  });

  test("Properties of sheet are correctly duplicated", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B1:C2"],
          conditionalFormats: [
            {
              id: "1",
              ranges: ["A1:A2"],
              rule: {
                values: ["42"],
                operator: "Equal",
                type: "CellIsRule",
                style: { fillColor: "orange" },
              },
            },
          ],
        },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    const newSheet = model.getters.getSheets()[1].id;
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: newSheet });
    expect(getCellContent(model, "A1")).toBe("42");
    expect(model.getters.getActiveSheet().cols.length).toBe(5);
    expect(model.getters.getActiveSheet().rows.length).toBe(5);
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "orange" });
  });

  test("CFs of sheets are correctly duplicated", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          conditionalFormats: [
            {
              id: "1",
              ranges: ["A1:A2"],
              rule: {
                values: ["42"],
                operator: "Equal",
                type: "CellIsRule",
                style: { fillColor: "orange" },
              },
            },
          ],
        },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    const newSheet = model.getters.getSheets()[1].id;
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: newSheet });
    expect(getCellContent(model, "A1")).toBe("42");
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "orange" });
    expect(model.getters.getConditionalFormats()).toHaveLength(1);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A2"], "42", { fillColor: "blue" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "blue" });
    expect(model.getters.getConditionalFormats()).toHaveLength(1);
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: newSheet, sheetIdTo: sheet });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "orange" });
    expect(model.getters.getConditionalFormats()).toHaveLength(1);
  });

  test("Cells are correctly duplicated", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          cells: {
            A1: { content: "42" },
          },
        },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    const newSheet = model.getters.getSheets()[1].id;
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: newSheet });
    expect(getCellContent(model, "A1")).toBe("42");
    setCellContent(model, "A1", "24");
    expect(getCellContent(model, "A1")).toBe("24");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: newSheet, sheetIdTo: sheet });
    expect(getCellContent(model, "A1")).toBe("42");
  });

  test("Figures are correctly duplicated", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("CREATE_FIGURE", {
      sheetId: sheet,
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        data: undefined,
      },
    });
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: "42", name: "dup" });
    model.dispatch("UPDATE_FIGURE", { id: "someuuid", x: 40 });
    const data = model.exportData();

    const sheet1 = data.sheets.find((s) => s.id === sheet)!;
    const sheet2 = data.sheets.find((s) => s.id === "42")!;

    expect(sheet1.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 40, y: 100 },
    ]);
    const id = sheet2.figures[0].id;
    expect(sheet2.figures).toEqual([{ id, height: 100, tag: "hey", width: 100, x: 100, y: 100 }]);
  });

  test("Cols and Rows are correctly duplicated", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    model.dispatch("RESIZE_COLUMNS", { cols: [0], size: 1, sheetId: sheet });
    model.dispatch("RESIZE_ROWS", { rows: [0], size: 1, sheetId: sheet });
    const newSheet = model.getters.getSheets()[1].id;
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: newSheet });
    expect(model.getters.getCol(model.getters.getActiveSheetId(), 0)!.size).not.toBe(1);
    expect(model.getters.getRow(model.getters.getActiveSheetId(), 0)!.size).not.toBe(1);
  });

  test("Merges are correctly duplicated", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["A1:A2"],
        },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("DUPLICATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: uuidv4(), name: "dup" });
    expect(model.getters.getSheets()).toHaveLength(2);
    model.dispatch("REMOVE_MERGE", { sheetId: sheet, zone: toZone("A1:A2") });
    const newSheet = model.getters.getSheets()[1].id;
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet, sheetIdTo: newSheet });
    expect(model.exportData().sheets[0].merges).toHaveLength(0);
    expect(model.exportData().sheets[1].merges).toHaveLength(1);
  });

  test("Can delete the active sheet", () => {
    const model = new Model();
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("CREATE_SHEET", { sheetId: "42", activate: true });
    const sheet2 = model.getters.getActiveSheetId();
    model.dispatch("DELETE_SHEET", { sheetId: sheet2 });
    expect(model.getters.getSheets()).toHaveLength(1);
    expect(model.getters.getSheets()[0].id).toEqual(sheet1);
    expect(model.getters.getActiveSheetId()).toEqual(sheet1);
    model.dispatch("UNDO");
    expect(model.getters.getSheets()).toHaveLength(2);
    expect(model.getters.getActiveSheetId()).toEqual(sheet2);
    model.dispatch("REDO");
    expect(model.getters.getSheets()).toHaveLength(1);
    expect(model.getters.getActiveSheetId()).toEqual(sheet1);
  });

  test("Can delete a non-active sheet", () => {
    const model = new Model();
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("CREATE_SHEET", { sheetId: "42", activate: true });
    const sheet2 = model.getters.getSheets()[1].id;
    model.dispatch("DELETE_SHEET", { sheetId: sheet1 });
    expect(model.getters.getSheets()).toHaveLength(1);
    expect(model.getters.getSheets()[0].id).toEqual(sheet2);
    expect(model.getters.getActiveSheetId()).toEqual(sheet2);
  });

  test("Cannot delete sheet if there is only one", () => {
    const model = new Model();
    expect(model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.NotEnoughSheets,
    });
  });

  test("Can undo-redo a sheet deletion", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    testUndoRedo(model, expect, "DELETE_SHEET", { sheetId: "42" });
  });

  test("Can undo-redo a sheet renaming", () => {
    const model = new Model();
    testUndoRedo(model, expect, "RENAME_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
      name: "New name",
    });
  });

  test("Can undo-redo a sheet duplication", () => {
    const model = new Model();
    testUndoRedo(model, expect, "DUPLICATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: model.getters.getActiveSheetId(),
      name: "dup",
    });
  });

  test("Sheet reference are correctly marked as #REF on sheet deletion", () => {
    const model = new Model();
    const name = "NEW_NAME";
    const sheet1 = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "=NEW_NAME!A1");

    model.dispatch("CREATE_SHEET", { sheetId: "42", name, activate: true });
    const sheet2 = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "42");
    model.dispatch("DELETE_SHEET", { sheetId: sheet2 });
    expect(getCell(model, "A1")!.content).toBe("=#REF");
    model.dispatch("UNDO");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheet2, sheetIdTo: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("=NEW_NAME!A1");
  });

  test("UPDATE_CELL_POSITION remove the old position if exist", () => {
    const model = new Model();
    setCellContent(model, "A1", "test");
    const cell = getCell(model, "A1")!;
    model.dispatch("UPDATE_CELL_POSITION", {
      sheetId: model.getters.getActiveSheetId(),
      col: 1,
      row: 1,
      cell,
      cellId: cell.id,
    });
    const sheet = model.getters.getActiveSheet();
    expect(sheet.rows[0].cells[0]).toBeUndefined();
    expect(sheet.rows[1].cells[1]!.id).toBe(cell.id);
    expect(model.getters.getCellPosition(cell.id)).toEqual({ col: 1, row: 1 });
  });
});
