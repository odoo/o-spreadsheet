import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { createSheet, selectCell, setCellContent, undo } from "../test_helpers/commands_helpers";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { target } from "../test_helpers/helpers";

describe("styles", () => {
  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new Model();
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });

    expect(getCellContent(model, "B1")).toBe("");
    expect(getCell(model, "B1")!.style).toBeDefined();
    undo(model);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can undo and redo a setStyle operation on an non empty cell", () => {
    const model = new Model();
    setCellContent(model, "B1", "some content");
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).toBeDefined();
    undo(model);
    expect(getCellContent(model, "B1")).toBe("some content");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("can clear formatting (style)", () => {
    const model = new Model();
    const sheet1 = model.getters.getSheetIds()[0];
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("clearing format on a cell with no content actually remove it", () => {
    const model = new Model();
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("clearing format operation can be undone", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")!.style).not.toBeDefined();
    undo(model);
    expect(getCell(model, "B1")!.style).toBeDefined();
  });

  test("clear formatting does not remove format", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_FORMATTING", {
      sheetId: sheetId,
      target: target("A1"),
      format: "#,##0.0",
    });
    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: target("A1"),
    });
    expect(getCell(model, "A1")?.format).toBe("#,##0.0");
  });

  test("Can set a format in another than the active one", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    model.dispatch("SET_FORMATTING", {
      sheetId: "42",
      target: [toZone("A1")],
      style: { fillColor: "red" },
    });
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A1", "42")!.style).toBeDefined();
  });
});
