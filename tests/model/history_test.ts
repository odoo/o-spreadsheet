import { MAX_HISTORY_STEPS } from "../../src/history";
import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";

// we test here the undo/redo feature

describe("history", () => {
  test("can undo and redo two consecutive operations", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A2", text: "3" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "5" });

    expect(getCell(model, "A2")!.content).toBe("5");

    model.dispatch("UNDO");
    expect(getCell(model, "A2")!.content).toBe("3");

    model.dispatch("UNDO");
    expect(getCell(model, "A2")).toBeNull();

    model.dispatch("REDO");
    expect(getCell(model, "A2")!.content).toBe("3");
    model.dispatch("REDO");
    expect(getCell(model, "A2")!.content).toBe("5");
  });

  test("redo stack is nuked when new operation is performed", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A2", text: "3" });

    expect(getCell(model, "A2")!.content).toBe("3");

    model.dispatch("UNDO");
    expect(getCell(model, "A2")).toBeNull();

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    model.dispatch("SET_VALUE", { xc: "A4", text: "5" });
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
      border: "all",
    });
    model.dispatch("SET_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
      border: "all",
    });

    expect(getCell(model, "B2")!.border).toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "B2")).toBeNull();
  });

  test("undo steps are dropped at some point", () => {
    const model = new Model();
    expect(model.getters.canUndo()).toBe(false);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      model.dispatch("START_EDITION", { text: String(i) });
      model.dispatch("STOP_EDITION");
      expect(getCell(model, "A1")!.content).toBe(String(i));
    }
    model.dispatch("START_EDITION", { text: "abc" });
    model.dispatch("STOP_EDITION");
    expect(getCell(model, "A1")!.content).toBe("abc");
    model.dispatch("UNDO");
    expect(getCell(model, "A1")!.content).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A2" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "11" });
    expect(getCell(model, "A1")!.value).toBe(11);
    model.dispatch("UNDO");
    expect(getCell(model, "A1")!.value).toBe(null);
    model.dispatch("REDO");
    expect(getCell(model, "A1")!.value).toBe(11);
  });
});
