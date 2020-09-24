import { Model } from "../../src/model";
import "../canvas.mock";
import { getCell } from "../helpers";

describe("styles", () => {
  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
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
    model.dispatch("SET_VALUE", { xc: "B1", text: "some content" });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
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
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")!.content).toBe("b1");
    expect(getCell(model, "B1")!.style).not.toBeDefined();
  });

  test("clearing format on a cell with no content actually remove it", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")).toBeNull();
  });

  test("clearing format operation can be undone", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: model.getters.getSelectedZones(),
      style: { fillColor: "red" },
    });
    expect(getCell(model, "B1")!.style).toBeDefined();
    model.dispatch("CLEAR_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "B1")!.style).not.toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "B1")!.style).toBeDefined();
  });
});
