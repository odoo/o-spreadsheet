import { Cell, GridState, HistoryChange, HistoryStep } from "./state";
import { evaluateCells } from "./evaluation";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

/**
 * The history system needs to be activated before a model mutation. This is
 * required to create a new history step.
 *
 * @see stop method
 */
export function start(state: GridState) {
  const step: HistoryStep = { batch: [] };
  state.undoStack.push(step);
  state.trackChanges = true;
  if (state.undoStack.length > MAX_HISTORY_STEPS) {
    state.undoStack.shift();
  }
}

/**
 * After each mutation, we need to stop tracking changes. This is the purpose
 * of this method.
 */
export function stop(state: GridState) {
  const lastStep = state.undoStack[state.undoStack.length - 1];
  state.trackChanges = false;
  if (lastStep.batch.length === 0) {
    state.undoStack.pop();
  } else {
    state.redoStack = [];
  }
}

/**
 * undo method. This basically undo the last step of the undo stack.
 *
 * Note that this method assumes that it was called from the main Model, and so,
 * it cannot be called from inside the model, because it has to pop the last
 * step in the undo
 * @param state
 */
export function undo(state: GridState) {
  const prev = state.undoStack.pop()!; // need to remove empty step created in model undo
  const step = state.undoStack.pop();
  state.undoStack.push(prev);
  if (!step) {
    return;
  }
  state.redoStack.push(step);
  for (let i = step.batch.length - 1; i >= 0; i--) {
    let change = step.batch[i];
    applyChange(change, "before");
  }
  evaluateCells(state);
}

export function redo(state: GridState) {
  const step = state.redoStack.pop();
  if (!step) {
    return;
  }
  const prev = state.undoStack.pop()!; // need to remove empty step created in undo
  state.undoStack.push(step);
  state.undoStack.push(prev);
  for (let change of step.batch) {
    applyChange(change, "after");
  }
  evaluateCells(state);
}

function applyChange(change: HistoryChange, target: "before" | "after") {
  let val = change.root as any;
  let key = change.path[change.path.length - 1];
  for (let p of change.path.slice(0, -1)) {
    val = val[p];
  }
  if (change[target] === undefined) {
    delete val[key];
  } else {
    val[key] = change[target];
  }
}

export function updateState(state: GridState, path: (string | number)[], val: any) {
  _updateState(state, state, path, val);
}

function _updateState(state: GridState, root: any, path: (string | number)[], val: any) {
  let value = root as any;
  let key = path[path.length - 1];
  for (let p of path.slice(0, -1)) {
    value = value[p];
  }
  if (value[key] === val) {
    return;
  }
  if (state.trackChanges) {
    const step = state.undoStack[state.undoStack.length - 1];
    step.batch.push({
      root,
      path,
      before: value[key],
      after: val
    });
  }
  if (val === undefined) {
    delete value[key];
  } else {
    value[key] = val;
  }
}

export function updateCell<T extends keyof Cell>(
  state: GridState,
  cell: Cell,
  key: T,
  value: Cell[T]
) {
  _updateState(state, cell, [key], value);
}
