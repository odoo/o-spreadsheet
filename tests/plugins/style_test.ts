import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import "../canvas.mock";
import { getCell, setCellContent } from "../helpers";

describe("styles", () => {
  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });

    expect(getCell(model, "B1")!.content).toBe("");
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "B1")).toBeNull();
  });

  test("can undo and redo a setStyle operation on an non empty cell", () => {
    const model = new Model();
    setCellContent(model, "B1", "some content");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.content).toBe("some content");
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "B1")!.content).toBe("some content");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("can clear formatting (style)", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    setCellContent(model, "B1", "b1");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
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
    expect(getCell(model, "B1")!.content).toBe("b1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("clearing format on a cell with no content actually remove it", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
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
    expect(getCell(model, "B1")).toBeNull();
  });

  test("clearing format operation can be undone", () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
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
    model.dispatch("UNDO");
    expect(getCell(model, "B1")!.style).toBeDefined();
  });

  test("Can set a format in another than the active one", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "Sheet2" });
    model.dispatch("SET_FORMATTING", {
      sheetId: "42",
      target: [toZone("A1")],
      style: { fillColor: "red" },
    });
    expect(getCell(model, "A1")).toBeNull();
    expect(getCell(model, "A1", "42")!.style).toBeDefined();
  });
});
