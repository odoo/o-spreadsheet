import { UIPlugin } from "../../src";
import { MAX_HISTORY_STEPS } from "../../src/constants";
import { Model } from "../../src/model";
import { featurePluginRegistry } from "../../src/plugins";
import { StateObserver } from "../../src/state_observer";
import { CommandResult, UpdateCellCommand } from "../../src/types/commands";
import {
  activateSheet,
  createSheet,
  freezeRows,
  redo,
  selectCell,
  setCellContent,
  setZoneBorders,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getEvaluatedCell,
} from "../test_helpers/getters_helpers"; // to have getcontext mocks
import "../test_helpers/helpers";
import { addTestPlugin, getPlugin, makeTestComposerStore } from "../test_helpers/helpers";

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
      // @ts-expect-error
      history.addChange(state, "A", "B", true, 5);
    }).toThrow();
  });

  test("cannot update an invalid path", () => {
    const history = new StateObserver();
    const state = {
      A: {},
    };
    expect(() => {
      // @ts-expect-error
      history.addChange(state, "A", "B", true, "C", 5);
    }).toThrow();
  });
});

describe("Model history", () => {
  test("Can undo a basic operation", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "hello");
    undo(model);
    expect(getCell(model, "A1")).toBeUndefined();
    redo(model);
    expect(getCellContent(model, "A1")).toBe("hello");
  });

  test("can undo and redo two consecutive operations", () => {
    const model = Model.BuildSync();
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

  test("Cannot redo when when the redo stack is empty", () => {
    const model = Model.BuildSync();
    expect(model.getters.canRedo()).toBeFalsy();
  });

  test("Cannot redo when when the redo stack is empty and last command is not repeatable", () => {
    const model = Model.BuildSync();
    freezeRows(model, 2);
    expect(model.getters.canRedo()).toBeFalsy();
  });

  test("Can redo when when the redo stack is empty and last command is repeatable", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "5");
    expect(model.getters.canRedo()).toBeTruthy();
  });

  test("two identical changes do not count as two undo steps", () => {
    const model = Model.BuildSync();
    selectCell(model, "B2");
    setZoneBorders(model, { position: "all" });
    setZoneBorders(model, { position: "all" });

    expect(getBorder(model, "B2")).toBeDefined();
    undo(model);
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("undo steps are dropped at some point", () => {
    const model = Model.BuildSync();
    const composerStore = makeTestComposerStore(model);
    expect(model.getters.canUndo()).toBe(false);
    for (let i = 0; i < MAX_HISTORY_STEPS; i++) {
      composerStore.startEdition(String(i));
      composerStore.stopEdition();
      expect(getCellContent(model, "A1")).toBe(String(i));
    }
    composerStore.startEdition("abc");
    composerStore.stopEdition();
    expect(getCellContent(model, "A1")).toBe("abc");
    undo(model);
    expect(getCellContent(model, "A1")).toBe(String(MAX_HISTORY_STEPS - 1));
  });

  test("undo recomputes the cells", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "=A2");
    setCellContent(model, "A2", "11");
    expect(getEvaluatedCell(model, "A1").value).toBe(11);
    undo(model);
    expect(getEvaluatedCell(model, "A1").value).toBe(0);
    redo(model);
    expect(getEvaluatedCell(model, "A1").value).toBe(11);
  });

  test("undo when undo stack is empty does nothing", async () => {
    const model = Model.BuildSync({ sheets: [{ cells: { A1: { content: "=10" } } }] });

    expect(getEvaluatedCell(model, "A1").value).toBe(10);

    expect(undo(model)).toBeCancelledBecause(CommandResult.EmptyUndoStack);
    expect(getEvaluatedCell(model, "A1").value).toBe(10);
  });

  test("undo when redo stack is empty does nothing", async () => {
    const model = Model.BuildSync({ sheets: [{ cells: { A1: { content: "=10" } } }] });

    expect(getEvaluatedCell(model, "A1").value).toBe(10);

    expect(redo(model)).toBeCancelledBecause(CommandResult.EmptyRedoStack);
    expect(getEvaluatedCell(model, "A1").value).toBe(10);
  });

  test("undo a sheet creation changes the active sheet", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: "42" });
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheetId);
  });

  test("ACTIVATE_SHEET standalone is not saved", () => {
    const model = Model.BuildSync();
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "this will be undone");
    activateSheet(model, "42");
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe("42");
  });

  test("create and activate sheet, then undo", () => {
    // The active sheet is currently not changed when the sheet
    // creation is undone
    const model = Model.BuildSync();
    const originActiveSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    expect(model.getters.getActiveSheetId()).toBe("42");
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(originActiveSheetId);
  });

  test("ACTIVATE_SHEET with another command is saved", () => {
    const model = Model.BuildSync();
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheet);
  });

  test("undone & redone commands are part of the command", () => {
    class TestPlugin extends UIPlugin {}
    addTestPlugin(featurePluginRegistry, TestPlugin);
    const model = Model.BuildSync();
    const plugin = getPlugin(model, TestPlugin);
    plugin.handle = jest.fn((cmd) => {});
    const command: UpdateCellCommand = {
      type: "UPDATE_CELL",
      col: 0,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      content: "hello",
    };
    model.dispatch(command.type, command);
    undo(model);
    expect(plugin.handle).toHaveBeenCalledWith({
      type: "UNDO",
      commands: [command],
    });
    redo(model);
    expect(plugin.handle).toHaveBeenCalledWith({
      type: "REDO",
      commands: [command],
    });
  });
});
