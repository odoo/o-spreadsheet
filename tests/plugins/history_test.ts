import { MAX_HISTORY_STEPS, WHistory } from "../../src/history";
import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell, setCellContent, waitForRecompute } from "../helpers";
import { CancelledReason } from "../../src/types/commands";

// we test here the undo/redo feature

describe("history", () => {
  test("can update existing value", () => {
    const history = new WHistory();
    const state = {
      A: 4,
    };
    history.updateStateFromRoot(state, "A", 5);
    expect(state["A"]).toBe(5);
  });

  test("can set new value", () => {
    const history = new WHistory();
    const state = {
      A: 4,
    };
    history.updateStateFromRoot(state, "B", 5);
    expect(state["A"]).toBe(4);
    expect(state["B"]).toBe(5);
  });

  test("can update existing nested value", () => {
    const history = new WHistory();
    const state = {
      A: {
        B: 4,
      },
    };
    history.updateStateFromRoot(state, "A", "B", 5);
    expect(state["A"]["B"]).toBe(5);
  });

  test("set new nested value", () => {
    const history = new WHistory();
    const state = {
      A: {
        B: 4,
      },
    };
    history.updateStateFromRoot(state, "A", "C", 5);
    expect(state["A"]["B"]).toBe(4);
    expect(state["A"]["C"]).toBe(5);
  });

  test("update existing value nested in array", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    history.updateStateFromRoot(state, "A", 0, "B", 5);
    expect(state["A"][0]["B"]).toBe(5);
  });

  test("set new value nested in array", () => {
    const history = new WHistory();
    const state = {
      A: [
        {
          B: 4,
        },
      ],
    };
    history.updateStateFromRoot(state, "A", 0, "C", 5);
    expect(state["A"][0]["B"]).toBe(4);
    expect(state["A"][0]["C"]).toBe(5);
  });

  test("create new path on-the-fly", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    history.updateStateFromRoot(state, "A", "B", "C", 5);
    expect(state).toEqual({
      A: {
        B: {
          C: 5,
        },
      },
    });
  });

  test("create new path containing an array on-the-fly", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    history.updateStateFromRoot(state, "A", "B", 0, "C", 5);
    expect(state).toEqual({
      A: {
        B: [
          {
            C: 5,
          },
        ],
      },
    });
  });

  test("create new array on-the-fly", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    history.updateStateFromRoot(state, "A", "B", 0, 5);
    expect(state).toEqual({
      A: {
        B: [5],
      },
    });
  });
  test("create new sparse array on-the-fly", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    history.updateStateFromRoot(state, "A", "B", 99, 5);
    const sparseArray: any[] = [];
    sparseArray[99] = 5;
    expect(state["A"]["B"]).toEqual(sparseArray);
  });

  test("cannot update an invalid key value", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    expect(() => {
      history.updateStateFromRoot(state, "A", "B", true, 5);
    }).toThrow();
  });

  test("cannot update an invalid path", () => {
    const history = new WHistory();
    const state = {
      A: {},
    };
    expect(() => {
      history.updateStateFromRoot(state, "A", "B", true, "C", 5);
    }).toThrow();
  });
});

describe("Model history", () => {
  test("can undo and redo two consecutive operations", () => {
    const model = new Model();
    setCellContent(model, "A2", "3");
    setCellContent(model, "A2", "5");

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
    setCellContent(model, "A2", "3");

    expect(getCell(model, "A2")!.content).toBe("3");

    model.dispatch("UNDO");
    expect(getCell(model, "A2")).toBeNull();

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    setCellContent(model, "A4", "5");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      border: "all",
    });
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
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
    setCellContent(model, "A1", "=A2");
    setCellContent(model, "A2", "11");
    expect(getCell(model, "A1")!.value).toBe(11);
    model.dispatch("UNDO");
    expect(getCell(model, "A1")!.value).toBe(null);
    model.dispatch("REDO");
    expect(getCell(model, "A1")!.value).toBe(11);
  });

  test("undo when undo stack is empty does nothing", async () => {
    const model = new Model({ sheets: [{ cells: { A1: { content: "=WAIT(10)" } } }] });
    await waitForRecompute();

    expect(getCell(model, "A1")!.value).toBe(10);

    expect(model.dispatch("UNDO")).toEqual({
      reason: CancelledReason.EmptyUndoStack,
      status: "CANCELLED",
    });
    expect(getCell(model, "A1")!.value).toBe(10);
  });

  test("undo when redo stack is empty does nothing", async () => {
    const model = new Model({ sheets: [{ cells: { A1: { content: "=WAIT(10)" } } }] });
    await waitForRecompute();

    expect(getCell(model, "A1")!.value).toBe(10);

    expect(model.dispatch("REDO")).toEqual({
      reason: CancelledReason.EmptyRedoStack,
      status: "CANCELLED",
    });
    expect(getCell(model, "A1")!.value).toBe(10);
  });

  test("ACTIVATE_SHEET standalone is not saved", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42" });
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: "42",
    });
    model.dispatch("UNDO");
    expect(model.getters.getActiveSheetId()).toBe("42");
  });

  test("ACTIVATE_SHEET with another command is saved", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("CREATE_SHEET", { sheetId: "42", activate: true });
    model.dispatch("UNDO");
    expect(model.getters.getActiveSheetId()).toBe(sheet);
  });
});
