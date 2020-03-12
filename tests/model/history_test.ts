import { MAX_HISTORY_STEPS } from "../../src/model/history";
import { GridModel } from "../../src/model/index";

// we test here the undo/redo feature

describe("history", () => {
  test("can undo and redo two consecutive operations", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    model.setValue("A2", "5");

    expect(model.state.cells.A2.content).toBe("5");

    model.undo();
    expect(model.state.cells.A2.content).toBe("3");

    model.undo();
    expect(model.state.cells.A2).not.toBeDefined();

    model.redo();
    expect(model.state.cells.A2.content).toBe("3");
    model.redo();
    expect(model.state.cells.A2.content).toBe("5");
  });

  test("redo stack is nuked when new operation is performed", () => {
    const model = new GridModel();
    model.setValue("A2", "3");

    expect(model.state.cells.A2.content).toBe("3");

    model.undo();
    expect(model.state.cells.A2).not.toBeDefined();

    expect(model.state.undoStack.length).toBe(0);
    expect(model.state.redoStack.length).toBe(1);

    model.setValue("A4", "5");
    expect(model.state.undoStack.length).toBe(1);
    expect(model.state.redoStack.length).toBe(0);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new GridModel();
    model.selectCell(1, 1);
    model.setBorder("all");
    model.setBorder("all");

    expect(model.state.cells.B2.border).toBeDefined();
    model.undo();
    expect(model.state.cells.B2).not.toBeDefined();
  });

  test("undo steps are dropped at some point", () => {
    const model = new GridModel();
    expect(model.state.undoStack.length).toBe(0);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      model.startEditing(String(i));
      model.stopEditing();
      expect(model.state.cells.A1.content).toBe(String(i));
    }
    expect(model.state.undoStack.length).toBe(MAX_HISTORY_STEPS);
    model.startEditing("abc");
    model.stopEditing();
    expect(model.state.undoStack.length).toBe(MAX_HISTORY_STEPS);
    expect(model.state.cells.A1.content).toBe("abc");
    model.undo();
    expect(model.state.cells.A1.content).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = new GridModel();
    model.setValue("A1", "=A2");
    model.setValue("A2", "11");
    expect(model.state.cells.A1.value).toBe(11);
    model.undo();
    expect(model.state.cells.A1.value).toBe(null);
    model.redo();
    expect(model.state.cells.A1.value).toBe(11);
  });
});
