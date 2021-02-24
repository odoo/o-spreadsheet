import { MAX_HISTORY_STEPS } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { StateObserver } from "../../src/state_observer";
import { CancelledReason } from "../../src/types/commands";
import {
  activateSheet,
  createSheet,
  redo,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent } from "../test_helpers/getters_helpers"; // to have getcontext mocks
import "../test_helpers/helpers";
import { waitForRecompute } from "../test_helpers/helpers";

// we test here the undo/redo feature

describe("history", () => {
  test("can update existing value", () => {
    const history = new StateObserver();
    const state = {
      A: 4,
    };
    history.addChange(state, "A", 5);
    expect(state["A"]).toBe(5);
  });

  test("can set new value", () => {
    const history = new StateObserver();
    const state = {
      A: 4,
    };
    history.addChange(state, "B", 5);
    expect(state["A"]).toBe(4);
    expect(state["B"]).toBe(5);
  });

  test("can update existing nested value", () => {
    const history = new StateObserver();
    const state = {
      A: {
        B: 4,
      },
    };
    history.addChange(state, "A", "B", 5);
    expect(state["A"]["B"]).toBe(5);
  });

  test("set new nested value", () => {
    const history = new StateObserver();
    const state = {
      A: {
        B: 4,
      },
    };
    history.addChange(state, "A", "C", 5);
    expect(state["A"]["B"]).toBe(4);
    expect(state["A"]["C"]).toBe(5);
  });

  test("update existing value nested in array", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    history.addChange(state, "A", 0, "B", 5);
    expect(state["A"][0]["B"]).toBe(5);
  });

  test("set new value nested in array", () => {
    const history = new StateObserver();
    const state = {
      A: [
        {
          B: 4,
        },
      ],
    };
    history.addChange(state, "A", 0, "C", 5);
    expect(state["A"][0]["B"]).toBe(4);
    expect(state["A"][0]["C"]).toBe(5);
  });

  test("create new path on-the-fly", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    history.addChange(state, "A", "B", "C", 5);
    expect(state).toEqual({
      A: {
        B: {
          C: 5,
        },
      },
    });
  });

  test("create new path containing an array on-the-fly", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    history.addChange(state, "A", "B", 0, "C", 5);
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
    const history = new StateObserver();
    const state = {
      A: {},
    };
    history.addChange(state, "A", "B", 0, 5);
    expect(state).toEqual({
      A: {
        B: [5],
      },
    });
  });
  test("create new sparse array on-the-fly", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    history.addChange(state, "A", "B", 99, 5);
    const sparseArray: any[] = [];
    sparseArray[99] = 5;
    expect(state["A"]["B"]).toEqual(sparseArray);
  });

  test("cannot update an invalid key value", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    expect(() => {
      history.addChange(state, "A", "B", true, 5);
    }).toThrow();
  });

  test("cannot update an invalid path", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    expect(() => {
      history.addChange(state, "A", "B", true, "C", 5);
    }).toThrow();
  });
});

describe("Model history", () => {
  test("Can undo a basic operation", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    undo(model);
    expect(getCell(model, "A1")).toBeUndefined();
    redo(model);
    expect(getCellContent(model, "A1")).toBe("hello");
  });

  test("can undo and redo two consecutive operations", () => {
    const model = new Model();
    setCellContent(model, "A2", "3");
    setCellContent(model, "A2", "5");

    expect(getCellContent(model, "A2")).toBe("5");

    undo(model);
    expect(getCellContent(model, "A2")).toBe("3");

    undo(model);
    expect(getCell(model, "A2")).toBeUndefined();

    redo(model);
    expect(getCellContent(model, "A2")).toBe("3");
    redo(model);
    expect(getCellContent(model, "A2")).toBe("5");
  });

  test("redo stack is nuked when new operation is performed", () => {
    const model = new Model();
    setCellContent(model, "A2", "3");

    expect(getCellContent(model, "A2")).toBe("3");

    undo(model);
    expect(getCell(model, "A2")).toBeUndefined();

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    setCellContent(model, "A4", "5");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = new Model();
    selectCell(model, "B2");
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

    expect(getBorder(model, "B2")).toBeDefined();
    undo(model);
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("undo steps are dropped at some point", () => {
    const model = new Model();
    expect(model.getters.canUndo()).toBe(false);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      model.dispatch("START_EDITION", { text: String(i) });
      model.dispatch("STOP_EDITION");
      expect(getCellContent(model, "A1")).toBe(String(i));
    }
    model.dispatch("START_EDITION", { text: "abc" });
    model.dispatch("STOP_EDITION");
    expect(getCellContent(model, "A1")).toBe("abc");
    undo(model);
    expect(getCellContent(model, "A1")).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = new Model();
    setCellContent(model, "A1", "=A2");
    setCellContent(model, "A2", "11");
    expect(getCell(model, "A1")!.value).toBe(11);
    undo(model);
    expect(getCell(model, "A1")!.value).toBe(null);
    redo(model);
    expect(getCell(model, "A1")!.value).toBe(11);
  });

  test("undo when undo stack is empty does nothing", async () => {
    const model = new Model({ sheets: [{ cells: { A1: { content: "=WAIT(10)" } } }] });
    await waitForRecompute();

    expect(getCell(model, "A1")!.value).toBe(10);

    expect(undo(model)).toBeCancelled(CancelledReason.EmptyUndoStack);
    expect(getCell(model, "A1")!.value).toBe(10);
  });

  test("undo when redo stack is empty does nothing", async () => {
    const model = new Model({ sheets: [{ cells: { A1: { content: "=WAIT(10)" } } }] });
    await waitForRecompute();

    expect(getCell(model, "A1")!.value).toBe(10);

    expect(redo(model)).toBeCancelled(CancelledReason.EmptyRedoStack);
    expect(getCell(model, "A1")!.value).toBe(10);
  });

  test("ACTIVATE_SHEET standalone is not saved", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "this will be undone", firstSheetId);
    activateSheet(model, "42");
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(firstSheetId);
  });

  test("create and activate sheet, then undo", () => {
    // The active sheet is currently not changed when the sheet
    // creation is undone
    const model = new Model();
    const originActiveSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    expect(model.getters.getActiveSheetId()).toBe("42");
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(originActiveSheetId);
  });

  test("undo active sheet creation changes the active sheet", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheet);
  });

  test("select to stop edition and undo the edition", () => {
    const model = new Model();
    selectCell(model, "B3");
    model.dispatch("START_EDITION", { text: "Hello" });
    selectCell(model, "A3");
    undo(model);
    expect(model.getters.getSelectedZones()).toEqual([toZone("B3")]);
  });

  test("ACTIVATE_SHEET with another command is saved", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "Hello in sheet 1", sheetId);
    activateSheet(model, "42");
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheetId);
  });
});
