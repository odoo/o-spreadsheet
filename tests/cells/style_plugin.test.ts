import {
  DATA_VALIDATION_CHIP_MARGIN,
  DEFAULT_FONT_SIZE,
  DEFAULT_STYLE,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "@odoo/o-spreadsheet-engine/constants";
import { CommandResult } from "../../src";
import { fontSizeInPixels, toCartesian } from "../../src/helpers";
import {
  addDataValidation,
  addEqualCf,
  clearFormatting,
  createSheet,
  selectCell,
  setCellContent,
  setCellStyle,
  setFormat,
  setFormatting,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getStyle } from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";

describe("styles", () => {
  test("update formatting with the same format as before", async () => {
    const model = await createModel();
    expect(await setFormat(model, "A1", "#,##0.0")).toBeSuccessfullyDispatched();
    expect(await setFormat(model, "A1", "#,##0.0")).toBeCancelledBecause(CommandResult.NoChanges);
    expect(await setFormat(model, "A1:A2", "#,##0.0")).toBeSuccessfullyDispatched();
    expect(await setFormat(model, "A1:A2", "#,##0.0")).toBeCancelledBecause(
      CommandResult.NoChanges
    );
  });

  test("update style with the same style as before", async () => {
    const model = await createModel();
    expect(await setFormatting(model, "A1", { bold: true })).toBeSuccessfullyDispatched();
    expect(await setFormatting(model, "A1", { bold: true })).toBeCancelledBecause(
      CommandResult.NoChanges
    );
    expect(await setFormatting(model, "A1:A2", { bold: true })).toBeSuccessfullyDispatched();
    expect(await setFormatting(model, "A1:A2", { bold: true })).toBeCancelledBecause(
      CommandResult.NoChanges
    );
  });

  test("can undo and redo a setStyle operation on an empty cell", async () => {
    const model = await createModel();
    await setFormatting(model, "B1", { fillColor: "red" });

    expect(getCellContent(model, "B1")).toBe("");
    expect(getCell(model, "B1")!.style).toBeDefined();
    await undo(model);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can undo and redo a setStyle operation on an non empty cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "some content");
    await setFormatting(model, "B1", { fillColor: "red" });
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).toBeDefined();
    await undo(model);
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("can clear formatting (style)", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "b1");
    await selectCell(model, "B1");
    await setFormatting(model, "B1", { fillColor: "red" });
    expect(getCell(model, "B1")!.style).toBeDefined();
    await clearFormatting(model, "B1");
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("default style values are not exported", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", DEFAULT_STYLE);
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBeUndefined();
    expect(data.styles).toEqual({});
  });

  test("textColor black(#000000) is exported as non default style", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", { textColor: "#000000" });
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBe(1);
    expect(data.styles).toEqual({ 1: { textColor: "#000000" } });
  });

  test("only non default style values are exported", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", {
      bold: true,
      italic: false,
    });
    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBe(1);
    expect(data.styles).toEqual({
      1: { bold: true },
    });
  });

  test("align left is exported for number and formula but not text", async () => {
    const model = await createModel();
    await setFormatting(model, "A1:A3", { align: "left" });
    await setFormatting(model, "B1:B3", { align: "right" });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "B1", "1");
    await setCellContent(model, "A2", "TEXT");
    await setCellContent(model, "B2", "TEXT");
    await setCellContent(model, "A3", "=1");
    await setCellContent(model, "B3", "=1");

    const data = model.exportData();
    expect(data.sheets[0].styles.A1).toBe(1);
    expect(data.sheets[0].styles.A2).toBe(undefined);
    expect(data.sheets[0].styles.B1).toBe(undefined);
    expect(data.sheets[0].styles["B2:B3"]).toBe(2);
    expect(data.sheets[0].styles.A3).toBe(1);

    expect(data.styles).toEqual({ 1: { align: "left" }, 2: { align: "right" } });
  });

  test("clearing format on a cell with no content actually remove it", async () => {
    const model = await createModel();
    await setFormatting(model, "B1", { fillColor: "red" });
    await setFormat(model, "B1", "#,##0.0");
    expect(getCell(model, "B1")!.style).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
    await clearFormatting(model, "B1");
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("clearing format operation can be undone", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "b1");
    await setFormatting(model, "B1", { fillColor: "red" });
    await setFormat(model, "B1", "#,##0.0");
    expect(getCell(model, "B1")!.style).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
    await clearFormatting(model, "B1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
    await undo(model);
    expect(getCell(model, "B1")!.style).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
  });

  test("clear formatting should remove format", async () => {
    const model = await createModel();
    await setFormat(model, "A1", "#,##0.0");
    await clearFormatting(model, "A1");
    expect(getCell(model, "A1")?.format).toBeUndefined();
  });

  test("Can set a format in another than the active one", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "42" });
    await setFormatting(model, "A1", { fillColor: "red" }, "42");
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A1", "42")!.style).toBeDefined();
  });

  test("getCellWidth use computed style", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await setCellContent(model, "A1", "H");
    await setCellContent(model, "A2", "H");
    const fontSize = 36;
    await addEqualCf(model, "A1", { fontSize }, "H");
    const A1 = toCartesian("A1");
    const A2 = toCartesian("A2");
    expect(model.getters.getCellWidth({ sheetId, col: A1.col, row: A1.row })).toBe(
      fontSizeInPixels(fontSize) + 2 * PADDING_AUTORESIZE_HORIZONTAL
    );
    expect(model.getters.getCellWidth({ sheetId, col: A2.col, row: A2.row })).toBe(
      fontSizeInPixels(DEFAULT_FONT_SIZE) + 2 * PADDING_AUTORESIZE_HORIZONTAL
    );
  });

  test("getCellWidth with chip", async () => {
    const model = await createModel();
    await addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["A"],
      displayStyle: "chip",
    });
    const sheetId = model.getters.getActiveSheetId();
    await setCellContent(model, "A1", "A");
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

  test("Style is not updated if not explicitely provided in commands", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setFormatting(model, "A1", { fillColor: "#fefefe" });
    await setFormatting(model, "A1", undefined);
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#fefefe" });

    await setFormatting(model, "A1", { fillColor: "#fefefe" });
    await setCellStyle(model, "A1", undefined);
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#fefefe" });
  });

  test("Style is overwritten through an UPDATE_CELL command", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setFormatting(model, "A1", { fillColor: "#fefefe", bold: true });

    await setCellStyle(model, "A1", { fillColor: "#123456" });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "#123456" });
  });
});
