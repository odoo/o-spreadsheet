import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import { formatCell } from "../../src/model/core";

describe("core", () => {
  test("properly compute sum of current cells", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    model.setValue("A3", "54");

    expect(model.aggregate).toBe(null);

    model.selectCell(0, 1);
    expect(model.aggregate).toBe(null);

    model.updateSelection(0, 2);
    expect(model.aggregate).toBe("57");
  });

  test("ignore cells with an error", () => {
    const model = new GridModel();
    model.setValue("A1", "2");
    model.setValue("A2", "=A2");
    model.setValue("A3", "3");

    // select A1
    model.selectCell(0, 0);
    expect(model.aggregate).toBe(null);

    // select A1:A2
    model.updateSelection(0, 1);
    expect(model.aggregate).toBe(null);

    // select A1:A3
    model.updateSelection(0, 2);
    expect(model.aggregate).toBe("5");
  });

  test("format cell that point to an empty cell properly", () => {
    const model = new GridModel();
    model.setValue("A1", "=A2");

    expect(formatCell(model.state, model.state.cells.A1)).toBe("0");
  });

  test("format cell without content: empty string", () => {
    const model = new GridModel();
    model.selectCell(1, 1); // B2
    model.setBorder("bottom");

    expect(formatCell(model.state, model.state.cells.B2)).toBe("");
  });

  test("format cell to a boolean value", () => {
    const model = new GridModel();
    model.setValue("A1", "=false");
    model.setValue("A2", "=true");

    expect(formatCell(model.state, model.state.cells.A1)).toBe("FALSE");
    expect(formatCell(model.state, model.state.cells.A2)).toBe("TRUE");
  });

  test("detect and format percentage values automatically", () => {
    const model = new GridModel();
    model.setValue("A1", "3%");
    model.setValue("A2", "3.4%");

    expect(formatCell(model.state, model.state.cells.A1)).toBe("3%");
    expect(model.state.cells.A1.format).toBe("0%");
    expect(formatCell(model.state, model.state.cells.A2)).toBe("3.40%");
    expect(model.state.cells.A2.format).toBe("0.00%");
  });

  test("does not reevaluate cells if edition does not change content", () => {
    const model = new GridModel();
    model.setValue("A1", "=rand()");

    expect(model.state.cells.A1.value).toBeDefined();
    const val = model.state.cells.A1.value;

    model.startEditing();
    model.stopEditing();
    expect(model.state.cells.A1.value).toBe(val);
  });
});

describe("history", () => {
  test("can undo and redo a add cell operation", () => {
    const model = new GridModel();

    expect(model.state.undoStack.length).toBe(0);
    expect(model.state.redoStack.length).toBe(0);

    model.startEditing("abc");
    model.stopEditing();

    expect(model.state.cells.A1.content).toBe("abc");
    expect(model.state.undoStack.length).toBe(1);
    expect(model.state.redoStack.length).toBe(0);

    model.undo();
    expect(model.state.cells.A1).not.toBeDefined();
    expect(model.state.undoStack.length).toBe(0);
    expect(model.state.redoStack.length).toBe(1);

    model.redo();
    expect(model.state.cells.A1.content).toBe("abc");
    expect(model.state.undoStack.length).toBe(1);
    expect(model.state.redoStack.length).toBe(0);
  });

  test("can undo and redo a cell update", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: { content: "1" } } }]
    });

    expect(model.state.undoStack.length).toBe(0);
    expect(model.state.redoStack.length).toBe(0);

    model.startEditing("abc");
    model.stopEditing();

    expect(model.state.cells.A1.content).toBe("abc");
    expect(model.state.undoStack.length).toBe(1);
    expect(model.state.redoStack.length).toBe(0);

    model.undo();
    expect(model.state.cells.A1.content).toBe("1");
    expect(model.state.undoStack.length).toBe(0);
    expect(model.state.redoStack.length).toBe(1);

    model.redo();
    expect(model.state.cells.A1.content).toBe("abc");
    expect(model.state.undoStack.length).toBe(1);
    expect(model.state.redoStack.length).toBe(0);
  });

  test("can undo and redo a delete cell operation", () => {
    const model = new GridModel();
    model.setValue("A2", "3");

    expect(model.state.cells.A2.content).toBe("3");
    model.selectCell(0, 1);
    model.deleteSelection();
    expect(model.state.cells.A2).not.toBeDefined();

    model.undo();
    expect(model.state.cells.A2.content).toBe("3");

    model.redo();
    expect(model.state.cells.A2).not.toBeDefined();
  });
});
