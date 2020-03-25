import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import { waitForRecompute } from "../helpers";

describe("core", () => {
  test("properly compute sum of current cells", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    model.setValue("A3", "54");

    expect(model.state.aggregate).toBe(null);

    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });

    expect(model.state.aggregate).toBe(null);

    model.dispatch({ type: "ALTER_SELECTION", cell: [0, 2] });
    expect(model.state.aggregate).toBe("57");
  });

  test("ignore cells with an error", () => {
    const model = new GridModel();
    model.setValue("A1", "2");
    model.setValue("A2", "=A2");
    model.setValue("A3", "3");

    // select A1
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    expect(model.state.aggregate).toBe(null);

    // select A1:A2
    model.dispatch({ type: "ALTER_SELECTION", cell: [0, 1] });
    expect(model.state.aggregate).toBe(null);

    // select A1:A3
    model.dispatch({ type: "ALTER_SELECTION", cell: [0, 2] });
    expect(model.state.aggregate).toBe("5");
  });

  test("ignore async cells while they are not ready", async () => {
    const model = new GridModel();
    model.setValue("A1", "=Wait(1000)");
    model.setValue("A2", "44");

    // select A1
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    expect(model.state.aggregate).toBe(null);

    // select A1:A2
    model.dispatch({ type: "ALTER_SELECTION", cell: [0, 1] });
    expect(model.state.aggregate).toBe(null);

    await waitForRecompute();
    expect(model.state.aggregate).toBe("1044");
  });

  test("format cell that point to an empty cell properly", () => {
    const model = new GridModel();
    model.setValue("A1", "=A2");

    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("0");
  });

  test("format cell without content: empty string", () => {
    const model = new GridModel();
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setBorder("bottom");

    expect(model.getters.getCellText(model.workbook.cells.B2)).toBe("");
  });

  test("format cell to a boolean value", () => {
    const model = new GridModel();
    model.setValue("A1", "=false");
    model.setValue("A2", "=true");

    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("FALSE");
    expect(model.getters.getCellText(model.workbook.cells.A2)).toBe("TRUE");
  });

  test("detect and format percentage values automatically", () => {
    const model = new GridModel();
    model.setValue("A1", "3%");
    model.setValue("A2", "3.4%");

    expect(model.getters.getCellText(model.workbook.cells.A1)).toBe("3%");
    expect(model.workbook.cells.A1.format).toBe("0%");
    expect(model.getters.getCellText(model.workbook.cells.A2)).toBe("3.40%");
    expect(model.workbook.cells.A2.format).toBe("0.00%");
  });

  test("does not reevaluate cells if edition does not change content", () => {
    const model = new GridModel();
    model.setValue("A1", "=rand()");

    expect(model.workbook.cells.A1.value).toBeDefined();
    const val = model.workbook.cells.A1.value;

    model.dispatch({ type: "START_EDITION" });
    model.stopEditing();
    expect(model.workbook.cells.A1.value).toBe(val);
  });
});

describe("history", () => {
  test("can undo and redo a add cell operation", () => {
    const model = new GridModel();

    expect(model.workbook.undoStack.length).toBe(0);
    expect(model.workbook.redoStack.length).toBe(0);

    model.dispatch({ type: "START_EDITION", text: "abc" });
    model.stopEditing();

    expect(model.workbook.cells.A1.content).toBe("abc");
    expect(model.workbook.undoStack.length).toBe(1);
    expect(model.workbook.redoStack.length).toBe(0);

    model.undo();
    expect(model.workbook.cells.A1).not.toBeDefined();
    expect(model.workbook.undoStack.length).toBe(0);
    expect(model.workbook.redoStack.length).toBe(1);

    model.redo();
    expect(model.workbook.cells.A1.content).toBe("abc");
    expect(model.workbook.undoStack.length).toBe(1);
    expect(model.workbook.redoStack.length).toBe(0);
  });

  test("can undo and redo a cell update", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: { content: "1" } } }]
    });

    expect(model.workbook.undoStack.length).toBe(0);
    expect(model.workbook.redoStack.length).toBe(0);

    model.dispatch({ type: "START_EDITION", text: "abc" });
    model.stopEditing();

    expect(model.workbook.cells.A1.content).toBe("abc");
    expect(model.workbook.undoStack.length).toBe(1);
    expect(model.workbook.redoStack.length).toBe(0);

    model.undo();
    expect(model.workbook.cells.A1.content).toBe("1");
    expect(model.workbook.undoStack.length).toBe(0);
    expect(model.workbook.redoStack.length).toBe(1);

    model.redo();
    expect(model.workbook.cells.A1.content).toBe("abc");
    expect(model.workbook.undoStack.length).toBe(1);
    expect(model.workbook.redoStack.length).toBe(0);
  });

  test("can undo and redo a delete cell operation", () => {
    const model = new GridModel();
    model.setValue("A2", "3");

    expect(model.workbook.cells.A2.content).toBe("3");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
    model.dispatch({
      type: "DELETE",
      sheet: model.state.activeSheet,
      target: model.state.selection.zones
    });
    expect(model.workbook.cells.A2).not.toBeDefined();

    model.undo();
    expect(model.workbook.cells.A2.content).toBe("3");

    model.redo();
    expect(model.workbook.cells.A2).not.toBeDefined();
  });
});
