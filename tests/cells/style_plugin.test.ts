import { DEFAULT_STYLE } from "../../src/constants";
import { Model } from "../../src/model";
import {
  createSheet,
  selectCell,
  setCellContent,
  setFormat,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { target } from "../test_helpers/helpers";

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
});
