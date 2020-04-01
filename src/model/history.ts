import { Cell, Workbook, Sheet } from "../types/index";
import { CommandHandler } from "./base_plugin";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

interface HistoryStep {
  batch: HistoryChange[];
}

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory {
  updateState(path: (string | number)[], val: any): void;
  updateCell<T extends keyof Cell>(cell: Cell, key: T, value: Cell[T]): void;
  updateSheet(sheet: Sheet, path: (string | number)[], value: any): void;
}

export class WHistory implements WorkbookHistory, CommandHandler {
  workbook: Workbook;

  private trackChanges: boolean = false;
  private undoStack: HistoryStep[] = [];
  private redoStack: HistoryStep[] = [];

  constructor(workbook: Workbook) {
    this.workbook = workbook;
  }

  // getters
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  start() {
    const step: HistoryStep = { batch: [] };
    // todo: when this is converted to a stateful plugin, keep the current batch
    // out of the undo stack
    this.undoStack.push(step);
    this.trackChanges = true;
    return true;
  }

  handle() {}

  finalize() {
    const lastStep = this.undoStack[this.undoStack.length - 1];
    this.trackChanges = false;
    if (lastStep.batch.length === 0) {
      this.undoStack.pop();
    } else {
      this.redoStack = [];
    }
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }
  }

  undo() {
    const step = this.undoStack.pop();
    if (!step) {
      return;
    }
    this.redoStack.push(step);
    for (let i = step.batch.length - 1; i >= 0; i--) {
      let change = step.batch[i];
      this.applyChange(change, "before");
    }
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) {
      return;
    }
    this.undoStack.push(step);
    for (let change of step.batch) {
      this.applyChange(change, "after");
    }
  }

  private applyChange(change: HistoryChange, target: "before" | "after") {
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

  private _updateState(root: any, path: (string | number)[], val: any) {
    let value = root as any;
    let key = path[path.length - 1];
    for (let p of path.slice(0, -1)) {
      value = value[p];
    }
    if (value[key] === val) {
      return;
    }
    if (this.trackChanges) {
      const step = this.undoStack[this.undoStack.length - 1];
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

  updateState(path: (string | number)[], val: any): void {
    this._updateState(this.workbook, path, val);
  }

  updateCell<T extends keyof Cell>(cell: Cell, key: T, value: Cell[T]): void {
    this._updateState(cell, [key], value);
  }

  updateSheet(sheet: Sheet, path: (string | number)[], value: any): void {
    this._updateState(sheet, path, value);
  }
}
