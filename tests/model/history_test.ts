import { MAX_HISTORY_STEPS } from "../../src/history";
import { GridModel } from "../../src/model";
import "../helpers"; // to have getcontext mocks

// we test here the undo/redo feature

describe("history", () => {
  test("can undo and redo two consecutive operations", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "3" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "5" });

    expect(model.workbook.cells.A2.content).toBe("5");

    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.A2.content).toBe("3");

    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.A2).not.toBeDefined();

    model.dispatch({ type: "REDO" });
    expect(model.workbook.cells.A2.content).toBe("3");
    model.dispatch({ type: "REDO" });
    expect(model.workbook.cells.A2.content).toBe("5");
  });

  test("redo stack is nuked when new operation is performed", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "3" });

    expect(model.workbook.cells.A2.content).toBe("3");

    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.A2).not.toBeDefined();

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "5" });
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({
      type: "SET_FORMATTING",
      sheet: model.state.activeSheet,
      target: model.getters.getSelectedZones(),
      border: "all"
    });
    model.dispatch({
      type: "SET_FORMATTING",
      sheet: model.state.activeSheet,
      target: model.getters.getSelectedZones(),
      border: "all"
    });

    expect(model.workbook.cells.B2.border).toBeDefined();
    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.B2).not.toBeDefined();
  });

  test("undo steps are dropped at some point", () => {
    const model = new GridModel();
    expect(model.getters.canUndo()).toBe(false);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      model.dispatch({ type: "START_EDITION", text: String(i) });
      model.dispatch({ type: "STOP_EDITION" });
      expect(model.workbook.cells.A1.content).toBe(String(i));
    }
    model.dispatch({ type: "START_EDITION", text: "abc" });
    model.dispatch({ type: "STOP_EDITION" });
    expect(model.workbook.cells.A1.content).toBe("abc");
    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.A1.content).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=A2" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "11" });
    expect(model.workbook.cells.A1.value).toBe(11);
    model.dispatch({ type: "UNDO" });
    expect(model.workbook.cells.A1.value).toBe(null);
    model.dispatch({ type: "REDO" });
    expect(model.workbook.cells.A1.value).toBe(11);
  });
});
