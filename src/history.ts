import {
  Cell,
  Workbook,
  Sheet,
  Command,
  CommandHandler,
  CommandResult,
  CancelledReason,
} from "./types/index";

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

type Step = HistoryChange[];

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory {
  updateState(path: (string | number)[], val: any): void;
  updateLocalState(path: (string | number)[], val: any): void;
  updateCell<T extends keyof Cell>(cell: Cell, key: T, value: Cell[T]): void;
  updateSheet(sheet: Sheet, path: (string | number)[], value: any): void;
}

type WorkbookHistoryNonLocal = Omit<WorkbookHistory, "updateLocalState">;

export class WHistory implements WorkbookHistoryNonLocal, CommandHandler {
  private workbook: Workbook;
  private current: Step | null = null;
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];

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

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "UNDO":
        return this.canUndo()
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
      case "REDO":
        return this.canRedo()
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyRedoStack };
    }
    return { status: "SUCCESS" };
  }

  beforeHandle(cmd: Command) {
    if (!this.current && cmd.type !== "REDO" && cmd.type !== "UNDO") {
      this.current = [];
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        this.undo();
        break;
      case "REDO":
        this.redo();
        break;
    }
  }

  finalize() {
    if (this.current && this.current.length) {
      this.undoStack.push(this.current);
      this.redoStack = [];
      this.current = null;
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
    }
  }

  undo() {
    const step = this.undoStack.pop();
    if (!step) {
      return;
    }
    this.redoStack.push(step);
    for (let i = step.length - 1; i >= 0; i--) {
      let change = step[i];
      this.applyChange(change, "before");
    }
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) {
      return;
    }
    this.undoStack.push(step);
    for (let change of step) {
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

  updateStateFromRoot(root: any, path: (string | number)[], val: any) {
    let value = root as any;
    let key = path[path.length - 1];
    for (let p of path.slice(0, -1)) {
      value = value[p];
    }
    if (value[key] === val) {
      return;
    }
    if (this.current) {
      this.current.push({
        root,
        path,
        before: value[key],
        after: val,
      });
    }
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }

  updateState(path: (string | number)[], val: any): void {
    this.updateStateFromRoot(this.workbook, path, val);
  }

  updateCell<T extends keyof Cell>(cell: Cell, key: T, value: Cell[T]): void {
    this.updateStateFromRoot(cell, [key], value);
  }

  updateSheet(sheet: Sheet, path: (string | number)[], value: any): void {
    this.updateStateFromRoot(sheet, path, value);
  }
}
