import { MAX_HISTORY_STEPS } from "../../src/model/history";
import { GridModel } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

// we test here the undo/redo feature

describe("history", () => {
  test("can undo and redo two consecutive operations", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "3" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "5" });

    expect(model.workbook.cells.A2.content).toBe("5");

    model.undo();
    expect(model.workbook.cells.A2.content).toBe("3");

    model.undo();
    expect(model.workbook.cells.A2).not.toBeDefined();

    model.redo();
    expect(model.workbook.cells.A2.content).toBe("3");
    model.redo();
    expect(model.workbook.cells.A2.content).toBe("5");
  });

  test("redo stack is nuked when new operation is performed", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "3" });

    expect(model.workbook.cells.A2.content).toBe("3");

    model.undo();
    expect(model.workbook.cells.A2).not.toBeDefined();

    expect(model.workbook.undoStack.length).toBe(0);
    expect(model.workbook.redoStack.length).toBe(1);

    model.dispatch({ type: "SET_VALUE", xc: "A4", text: "5" });
    expect(model.workbook.undoStack.length).toBe(1);
    expect(model.workbook.redoStack.length).toBe(0);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setBorder("all");
    model.setBorder("all");

    expect(model.workbook.cells.B2.border).toBeDefined();
    model.undo();
    expect(model.workbook.cells.B2).not.toBeDefined();
  });

  test("undo steps are dropped at some point", () => {
    const model = new GridModel();
    expect(model.workbook.undoStack.length).toBe(0);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      model.dispatch({ type: "START_EDITION", text: String(i) });
      model.dispatch({ type: "STOP_EDITION" });
      expect(model.workbook.cells.A1.content).toBe(String(i));
    }
    expect(model.workbook.undoStack.length).toBe(MAX_HISTORY_STEPS);
    model.dispatch({ type: "START_EDITION", text: "abc" });
    model.dispatch({ type: "STOP_EDITION" });
    expect(model.workbook.undoStack.length).toBe(MAX_HISTORY_STEPS);
    expect(model.workbook.cells.A1.content).toBe("abc");
    model.undo();
    expect(model.workbook.cells.A1.content).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=A2" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "11" });
    expect(model.workbook.cells.A1.value).toBe(11);
    model.undo();
    expect(model.workbook.cells.A1.value).toBe(null);
    model.redo();
    expect(model.workbook.cells.A1.value).toBe(11);
  });
});
