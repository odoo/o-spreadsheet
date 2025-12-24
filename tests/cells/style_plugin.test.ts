import {
  DATA_VALIDATION_CHIP_MARGIN,
  DEFAULT_FONT_SIZE,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { DEFAULT_STYLE_NO_ALIGN } from "@odoo/o-spreadsheet-engine/plugins/core/style";
import { CommandResult } from "../../src";
import { fontSizeInPixels, toCartesian } from "../../src/helpers";
import {
  addDataValidation,
  createSheet,
  selectCell,
  setCellContent,
  setFormat,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellStyle, getStyle } from "../test_helpers/getters_helpers";
import { createEqualCF, target, toRangesData } from "../test_helpers/helpers";

describe("styles", () => {
  test("update formatting with the same format as before", () => {
    const model = new Model();
    expect(setFormat(model, "A1", "#,##0.0")).toBeSuccessfullyDispatched();
    expect(setFormat(model, "A1", "#,##0.0")).toBeCancelledBecause(CommandResult.NoChanges);
    expect(setFormat(model, "A1:A2", "#,##0.0")).toBeSuccessfullyDispatched();
    expect(setFormat(model, "A1:A2", "#,##0.0")).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update style with the same style as before", () => {
    const model = new Model();
    expect(setStyle(model, "A1", { bold: true })).toBeSuccessfullyDispatched();
    expect(setStyle(model, "A1", { bold: true })).toBeCancelledBecause(CommandResult.NoChanges);
    expect(setStyle(model, "A1:A2", { bold: true })).toBeSuccessfullyDispatched();
    expect(setStyle(model, "A1:A2", { bold: true })).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new Model();
    setStyle(model, "B1", { fillColor: "red" });

    expect(getCellContent(model, "B1")).toBe("");
    expect(getCellStyle(model, "B1")).toBeDefined();
    undo(model);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can undo and redo a setStyle operation on an non empty cell", () => {
    const model = new Model();
    setCellContent(model, "B1", "some content");
    setStyle(model, "B1", { fillColor: "red" });
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCellStyle(model, "B1")).toBeDefined();
    undo(model);
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCellStyle(model, "B1")).not.toBeDefined();
  });

  test("can clear formatting (style)", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    setStyle(model, "B1", { fillColor: "red" });
    expect(getCellStyle(model, "B1")).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCellStyle(model, "B1")).not.toBeDefined();
  });

  test("default style values are not exported", () => {
    const model = new Model();
    setStyle(model, "A1", DEFAULT_STYLE_NO_ALIGN);
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBeUndefined();
    expect(data.styles).toEqual({});
  });

  test("textColor black(#000000) is exported as non default style", () => {
    const model = new Model();
    setStyle(model, "A1", { textColor: "#000000" });
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBe(1);
    expect(data.styles).toEqual({ 1: { textColor: "#000000" } });
  });

  test("only non default style values are exported", () => {
    const model = new Model();
    setStyle(model, "A1", {
      bold: true,
      italic: false,
    });
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBe(1);
    expect(data.styles).toEqual({
      1: { bold: true },
    });
  });

  test("clearing format on a cell with no content actually remove it", () => {
    const model = new Model();
    setStyle(model, "B1", { fillColor: "red" });
    setFormat(model, "B1", "#,##0.0");
    expect(getCellStyle(model, "B1")).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("B1"),
    });
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("clearing format operation can be undone", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    setStyle(model, "B1", { fillColor: "red" });
    setFormat(model, "B1", "#,##0.0");
    expect(getCellStyle(model, "B1")).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("B1"),
    });
    expect(getCellStyle(model, "B1")).not.toBeDefined();
    undo(model);
    expect(getCellStyle(model, "B1")).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
  });

  test("clear formatting should remove format", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setFormat(model, "A1", "#,##0.0");
    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: target("A1"),
    });
    expect(getCell(model, "A1")?.format).toBeUndefined();
  });

  test("Can set a format in another than the active one", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    setStyle(model, "A1", { fillColor: "red" }, "42");
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCellStyle(model, "A1", "42")).toBeDefined();
  });

  test("getCellWidth use computed style", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "H");
    setCellContent(model, "A2", "H");
    const fontSize = 36;
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("H", { fontSize }, "1"),
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    const A1 = toCartesian("A1");
    const A2 = toCartesian("A2");
    expect(model.getters.getCellWidth({ sheetId, col: A1.col, row: A1.row })).toBe(
      fontSizeInPixels(fontSize) + 2 * PADDING_AUTORESIZE_HORIZONTAL
    );
    expect(model.getters.getCellWidth({ sheetId, col: A2.col, row: A2.row })).toBe(
      fontSizeInPixels(DEFAULT_FONT_SIZE) + 2 * PADDING_AUTORESIZE_HORIZONTAL
    );
  });

  test("getCellWidth with chip", () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["A"],
      displayStyle: "chip",
    });
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "A");
    const A1 = { sheetId, col: 0, row: 0 };
    const chipIcon = model.getters.getCellIcons(A1)[0];
    expect(model.getters.getCellWidth(A1)).toBe(
      fontSizeInPixels(DEFAULT_FONT_SIZE) +
        2 * PADDING_AUTORESIZE_HORIZONTAL +
        2 * DATA_VALIDATION_CHIP_MARGIN +
        chipIcon.margin +
        chipIcon.size
    );
  });

  test("Style is not updated if not explicitely provided in commands", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setStyle(model, "A1", { fillColor: "#fefefe" });

    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      style: undefined,
    });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#fefefe" });

    setStyle(model, "A1", { fillColor: "#fefefe" });
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      style: undefined,
    });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#fefefe" });
  });

  test("Style is overwritten through an UPDATE_CELL command", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setStyle(model, "A1", { fillColor: "#fefefe", bold: true });

    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      style: { fillColor: "#123456" },
    });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#123456" });
  });
});
