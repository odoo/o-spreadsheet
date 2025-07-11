import {
  DATA_VALIDATION_CHIP_MARGIN,
  DEFAULT_FONT_SIZE,
  DEFAULT_STYLE,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../src/constants";
import { fontSizeInPixels, toCartesian } from "../../src/helpers";
import { Model } from "../../src/model";
import {
  addDataValidation,
  createSheet,
  selectCell,
  setCellContent,
  setFormat,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { createEqualCF, target, toRangesData } from "../test_helpers/helpers";

describe("styles", () => {
  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new Model();
    setStyle(model, "B1", { fillColor: "red" });

    expect(getCellContent(model, "B1")).toBe("");
    expect(getCell(model, "B1")!.style).toBeDefined();
    undo(model);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can undo and redo a setStyle operation on an non empty cell", () => {
    const model = new Model();
    setCellContent(model, "B1", "some content");
    setStyle(model, "B1", { fillColor: "red" });
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).toBeDefined();
    undo(model);
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("can clear formatting (style)", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    setStyle(model, "B1", { fillColor: "red" });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("default style values are not exported", () => {
    const model = new Model();
    setStyle(model, "A1", DEFAULT_STYLE);
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
    expect(getCell(model, "B1")!.style).toBeDefined();
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
    expect(getCell(model, "B1")!.style).toBeDefined();
    expect(getCell(model, "B1")!.format).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("B1"),
    });
    expect(getCell(model, "B1")!.style).not.toBeDefined();
    undo(model);
    expect(getCell(model, "B1")!.style).toBeDefined();
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
    expect(getCell(model, "A1", "42")!.style).toBeDefined();
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
});

describe("Default Styles", () => {
  const style1 = { bold: true, color: "#222222" };
  const style2 = { italic: true, color: "#444444" };

  const style1then2 = { ...style1, ...style2 };
  const style2then1 = { ...style2, ...style1 };

  const cellPosition = { sheetId: "1", col: 1, row: 1 };
  const cell = ["cell", "B2"];
  const col = ["colum", "B1:B99"];
  const row = ["row", "A2:Z2"];
  const grid = ["grid", "A1:Z99"];

  test.each([
    [cell, cell],
    [cell, col],
    [cell, row],
    [cell, grid],
    [col, col],
    [col, row],
    [col, grid],
    [row, row],
    [row, grid],
    [grid, grid],
  ])("Style override: %s and %s", (zone1, zone2) => {
    const model = new Model({ sheets: [{ id: "1", colNumber: 26, rowNumber: 100 }] });
    setStyle(model, zone1[1], style1);
    expect(model.getters.getCellStyle(cellPosition)).toEqual(style1);
    setStyle(model, zone2[1], style2);
    expect(model.getters.getCellStyle(cellPosition)).toEqual(style1then2);
    setStyle(model, zone1[1], style1);
    expect(model.getters.getCellStyle(cellPosition)).toEqual(style2then1);
  });
});
