import { uuidv4 } from "./helpers";
import {
  Command,
  CommandHandler,
  CommandResult,
  CancelledReason,
  EventHandler,
  UID,
  CommandDispatcher,
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

interface Step {
  changes: HistoryChange[];
  id: UID;
  command: Command;
}

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory {
  update(path: (string | number)[], val: any): void;
}

export class WHistory implements CommandHandler, EventHandler {
  private current: Step | null = null;
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];

  constructor(private dispatch: CommandDispatcher["dispatch"]) {}

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
    if (
      !this.current &&
      cmd.type !== "REDO" &&
      cmd.type !== "UNDO" &&
      cmd.type !== "SELECTIVE_UNDO"
    ) {
      this.current = { changes: [], id: uuidv4(), command: cmd };
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        this.undo();
        break;
      case "SELECTIVE_UNDO":
        this.selectiveUndo(cmd.id);
        break;
      case "REDO":
        this.redo();
        break;
    }
  }

  handleEvent() {}

  finalize() {
    if (this.current && this.current.changes.length) {
      this.undoStack.push(this.current);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
    }
    this.current = null;
  }

  getInverse(cmd: Command): Command {
    if (cmd.type === "ADD_COLUMNS") {
      const columns: number[] = [];
      let start = cmd.column;
      if (cmd.position === "after") {
        start++;
      }
      for (let i = 0; i < cmd.quantity; i++) {
        columns.push(i + start);
      }
      return {
        type: "REMOVE_COLUMNS",
        columns,
        sheetId: cmd.sheetId,
      };
    }
    return cmd;
  }

  transform(toTransform: Command, executed: Command): Command[] {
    if (toTransform.type === "UPDATE_CELL") {
      if (executed.type === "REMOVE_COLUMNS") {
        if (toTransform.sheetId !== executed.sheetId) {
          return [toTransform];
        }
        let col = toTransform.col;
        if (executed.columns.includes(col)) {
          return [];
        }
        for (let removedColumn of executed.columns) {
          if (col >= removedColumn) {
            col--;
          }
        }
        return [Object.assign({}, toTransform, { col })];
      }
    }
    return [toTransform];
  }

  selectiveUndo(id: UID) {
    const index = this.undoStack.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No selective undo with id ${id}`);
    }
    const toRedo: Step[] = this.undoStack.slice(index + 1);

    for (let x of toRedo.reverse()) {
      for (let i = x.changes.length - 1; i >= 0; i--) {
        let change = x.changes[i];
        this.applyChange(change, "before");
      }
    }
    toRedo.reverse();

    this.undoStack = this.undoStack.slice(0, index + 1);
    const step = this.undoStack.pop();
    if (!step) {
      return;
    }
    const executed = this.getInverse(step.command);
    for (let i = step.changes.length - 1; i >= 0; i--) {
      let change = step.changes[i];
      this.applyChange(change, "before");
    }
    for (let step of toRedo) {
      const commands = this.transform(step.command, executed);
      for (let cmd of commands) {
        this.dispatch(cmd.type, cmd);
      }
    }
  }

  undo() {
    const step = this.undoStack.pop();
    if (!step) {
      return;
    }
    this.redoStack.push(step);
    for (let i = step.changes.length - 1; i >= 0; i--) {
      let change = step.changes[i];
      this.applyChange(change, "before");
    }
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) {
      return;
    }
    this.undoStack.push(step);
    for (let change of step.changes) {
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
      this.current.changes.push({
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
}
