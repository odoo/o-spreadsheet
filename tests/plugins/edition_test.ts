import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell, getCellContent, getCellText } from "../getters_helpers";
import { createSheet, setCellContent } from "../commands_helpers";
import { CancelledReason } from "../../src/types";
import { toZone, toCartesian } from "../../src/helpers";
import { target } from "../helpers";

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    // adding
    model.dispatch("START_EDITION", { text: "a" });
    model.dispatch("STOP_EDITION");
    expect(Object.keys(model.getters.getCells(sheetId))).toHaveLength(1);
    expect(getCellContent(model, "A1")).toBe("a");

    // removing
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    model.dispatch("STOP_EDITION");
    expect(model.getters.getCells(sheetId)).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { A2: { style: 1, content: "a2" } },
        },
      ],
      styles: {
        1: { fillColor: "red" },
      },
    });

    // removing
    expect(getCellContent(model, "A2")).toBe("a2");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A2")).toBeTruthy();
    expect(getCellContent(model, "A2")).toBe("");
  });

  test("editing a cell, then activating a new sheet: edition should be stopped", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("START_EDITION", { text: "a" });
    expect(model.getters.getEditionMode()).toBe("editing");
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCell(model, "A1")).toBeUndefined();
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: sheet1,
    });
    expect(getCellContent(model, "A1")).toBe("a");
  });

  test("editing a cell, start a composer selection, then activating a new sheet: mode should still be selecting", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("START_EDITION", { text: "=" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getEditionSheet()).toBe(sheet1);
    createSheet(model, { activate: true, sheetId: "42", name: "Sheet2" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getEditionSheet()).toBe(sheet1);
    model.dispatch("STOP_EDITION");
    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(getCellText(model, "A1")).toBe("=");
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: "42",
    });
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("ignore stopping composer selection if not selecting", () => {
    const model = new Model();
    expect(model.getters.getEditionMode()).toBe("inactive");
    model.dispatch("STOP_COMPOSER_SELECTION");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Composer has the content with the updated sheet name", () => {
    const model = new Model();
    const name = "NEW_NAME";
    const sheet2 = "42";
    createSheet(model, { sheetId: sheet2, name });
    setCellContent(model, "A1", "=NEW_NAME!A1");
    setCellContent(model, "A1", "24", sheet2);
    const nextName = "NEXT NAME";
    model.dispatch("RENAME_SHEET", { sheetId: sheet2, name: nextName });
    model.dispatch("START_EDITION");
    expect(getCellText(model, "A1")).toBe("='NEXT NAME'!A1");
    expect(model.getters.getCurrentContent()).toBe("='NEXT NAME'!A1");
  });

  test("setting content sets selection at the end by default", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 5,
      end: 5,
    });
  });

  test("setting content with selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 2, end: 4 },
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 2,
      end: 4,
    });
  });

  test("setting content with wrong selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    const result = model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 4, end: 1 },
    });
    expect(result).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
  });

  test("change selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 1,
      end: 2,
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 1,
      end: 2,
    });
  });

  test("setting selection start after end is invalid", () => {
    const model = new Model();
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    expect(
      model.dispatch("CHANGE_COMPOSER_SELECTION", {
        start: 2,
        end: 1,
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
  });

  test("setting selection out of content is invalid", () => {
    const model = new Model();
    expect(model.getters.getCurrentContent()).toHaveLength(0);
    expect(
      model.dispatch("CHANGE_COMPOSER_SELECTION", {
        start: 1,
        end: 2,
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
  });

  test("ranges are highlighted", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([
      toZone("A2:A3"),
      toZone("B5"),
    ]);

    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(B2:B3, C5)",
    });
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([
      toZone("B2:B3"),
      toZone("C5"),
    ]);
  });

  test("stop edition removes highlighted zones", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    expect(model.getters.getHighlights()).toHaveLength(2);
    model.dispatch("STOP_EDITION");
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("cancel edition reset current content", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    model.dispatch("STOP_EDITION", { cancel: true });
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("ranges are not highlighted when inactive", () => {
    const model = new Model();
    expect(model.getters.getEditionMode()).toBe("inactive");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(B2:B3, C5)",
    });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("replace selection with smaller text", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_SELECTION", {
      text: "A",
    });
    expect(model.getters.getCurrentContent()).toBe("12A5");
    expect(model.getters.getComposerSelection()).toEqual({
      start: 3,
      end: 3,
    });
  });

  test("replace selection with longer text", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_SELECTION", {
      text: "ABCDE",
    });
    expect(model.getters.getCurrentContent()).toBe("12ABCDE5");
    expect(model.getters.getComposerSelection()).toEqual({
      start: 7,
      end: 7,
    });
  });

  test("only references in formulas are highlighted", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "C7" });
    expect(model.getters.getHighlights()).toHaveLength(0);
    model.dispatch("SET_CURRENT_CONTENT", { content: "A2:A5" });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("selecting insert range in 'selecting' mode", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 1,
      end: 1,
    });

    model.dispatch("SET_SELECTION", {
      anchor: [0, 0],
      zones: [toZone("A1:A3")],
    });
    expect(model.getters.getCurrentContent()).toBe("=A1:A3");

    model.dispatch("SELECT_CELL", {
      col: 0,
      row: 0,
    });
    expect(model.getters.getCurrentContent()).toBe("=A1");

    model.dispatch("MOVE_POSITION", {
      deltaX: 1,
      deltaY: 1,
    });
    expect(model.getters.getCurrentContent()).toBe("=B2");

    model.dispatch("ALTER_SELECTION", {
      delta: [1, 1],
    });
    expect(model.getters.getCurrentContent()).toBe("=B2:C3");
  });

  test("start edition without selection set cursor at the end", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "coucou" });
    expect(model.getters.getComposerSelection()).toEqual({ start: 6, end: 6 });
  });

  test("start edition with a provided selection", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "coucou",
      selection: { start: 4, end: 5 },
    });
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 5 });
  });

  test("start edition with a wrong selection", () => {
    const model = new Model();
    const result = model.dispatch("START_EDITION", {
      text: "coucou",
      selection: { start: 10, end: 1 },
    });
    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.WrongComposerSelection });
  });

  test("select another cell while editing set the content to the selected cell", () => {
    const model = new Model();
    setCellContent(model, "A2", "Hello sir");
    model.dispatch("START_EDITION", { text: "coucou" });
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    expect(model.getters.getCurrentContent()).toBe("Hello sir");
  });

  test("set value of the active cell updates the content", () => {
    const model = new Model();
    expect(model.getters.getPosition()).toEqual(toCartesian("A1"));
    setCellContent(model, "A1", "Hello sir");
    expect(model.getters.getCurrentContent()).toBe("Hello sir");
  });

  test("set value of the active cell when switching sheet", () => {
    const model = new Model();
    const sheet1Id = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "Hello from sheet1");
    createSheet(model, { sheetId: "42", activate: true });
    expect(model.getters.getCurrentContent()).toBe("");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "42", sheetIdTo: sheet1Id });
    expect(model.getters.getCurrentContent()).toBe("Hello from sheet1");
  });

  test("select another cell which is empty set the content to an empty string", () => {
    const model = new Model();
    setCellContent(model, "A1", "Hello sir");
    expect(model.getters.getCurrentContent()).toBe("Hello sir");
    const [col, row] = toCartesian("A2");
    expect(model.getters.getCell(model.getters.getActiveSheetId(), col, row)).toBeUndefined();
    model.dispatch("SELECT_CELL", { col, row });
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("select an empty cell, start selecting mode at the composer position", () => {
    const model = new Model();
    const [col, row] = toCartesian("A2");
    expect(model.getters.getCell(model.getters.getActiveSheetId(), col, row)).toBeUndefined();
    model.dispatch("SELECT_CELL", { col, row });
    model.dispatch("START_EDITION", { text: "=" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getCurrentContent()).toBe("=B2");
  });

  test("content is the raw cell content, not the evaluated text", () => {
    const model = new Model();
    setCellContent(model, "A2", "=SUM(5)");
    model.dispatch("START_EDITION");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    expect(model.getters.getCurrentContent()).toBe("=SUM(5)");
  });

  test("default active cell content when model is started", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cells: { A1: { content: "Hello" } },
        },
      ],
    });
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });

  test("Paste a cell updates the topbar composer", () => {
    const model = new Model();
    setCellContent(model, "A1", "Hello");
    model.dispatch("COPY", {
      target: target("A1"),
    });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("PASTE", {
      target: target("B1"),
    });
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });

  test("content is updated if cell content is updated", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cells: { B1: { content: "Hello" } },
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    expect(model.getters.getCurrentContent()).toBe("Hello");
    model.dispatch("UPDATE_CELL", {
      col: 2,
      row: 0,
      content: "update another cell",
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getCurrentContent()).toBe("Hello");
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 0,
      content: "Hi",
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getCurrentContent()).toBe("Hi");
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 0,
      content: "",
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getCurrentContent()).toBe("");
  });
});
