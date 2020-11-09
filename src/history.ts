import { Command, CommandHandler, CommandResult, CancelledReason } from "./types/index";
import { Update, SynchronizedState } from "./types/multi_user";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

interface HistoryChange {
  root: any;
  pluginName: string;
  path: (string | number)[];
  before: any;
  after: any;
  history: boolean;
}

type Step = HistoryChange[];

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory<Plugin> {
  doNotHistorize: (callback: () => void) => void;
  update<T extends keyof Plugin>(key: T, val: Plugin[T]): void;
  update<T extends keyof Plugin, U extends keyof NonNullable<Plugin[T]>>(
    key1: T,
    key2: U,
    val: NonNullable<Plugin[T]>[U]
  ): void;
  update<
    T extends keyof Plugin,
    U extends keyof NonNullable<Plugin[T]>,
    K extends keyof NonNullable<NonNullable<Plugin[T]>[U]>
  >(
    key1: T,
    key2: U,
    key3: K,
    val: NonNullable<NonNullable<Plugin[T]>[U]>[K]
  ): void;
  update<
    T extends keyof Plugin,
    U extends keyof NonNullable<Plugin[T]>,
    K extends keyof NonNullable<NonNullable<Plugin[T]>[U]>,
    V extends keyof NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>
  >(
    key1: T,
    key2: U,
    key3: K,
    key4: V,
    val: NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]
  ): void;
  update<
    T extends keyof Plugin,
    U extends keyof NonNullable<Plugin[T]>,
    K extends keyof NonNullable<NonNullable<Plugin[T]>[U]>,
    V extends keyof NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>,
    W extends keyof NonNullable<NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]>
  >(
    key1: T,
    key2: U,
    key3: K,
    key4: V,
    key5: W,
    val: NonNullable<NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]>[W]
  ): void;
  update<
    T extends keyof Plugin,
    U extends keyof NonNullable<Plugin[T]>,
    K extends keyof NonNullable<NonNullable<Plugin[T]>[U]>,
    V extends keyof NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>,
    W extends keyof NonNullable<NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]>,
    Y extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]>[W]
    >
  >(
    key1: T,
    key2: U,
    key3: K,
    key4: V,
    key5: W,
    key6: Y,
    val: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<Plugin[T]>[U]>[K]>[V]>[W]>[Y]
  ): void;
}

export class WHistory implements CommandHandler {
  private current: Step | null = null;
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];
  private historize: boolean = true;
  private root: { [key: string]: any } = {};

  constructor(private synchronizedState?: SynchronizedState) {
    if (this.synchronizedState) {
      this.synchronizedState.onStateUpdated((updates: Update[]) => {
        for (let update of updates) {
          const [pluginName, ...path] = update.path;
          this.updateStateFromRoot(pluginName as string, ...path, update.value);
        }
      });
    }
  }

  doNotHistorize(callback: () => void) {
    const historize = !!this.historize;
    this.historize = false;
    callback();
    this.historize = historize;
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
      console.table(this.current);
      this.synchronizeChanges(this.current, "after");
      const filteredCurrent = this.current.filter((change) => change.history);
      if (filteredCurrent.length) {
        this.undoStack.push(filteredCurrent);
        this.redoStack = [];
        if (this.undoStack.length > MAX_HISTORY_STEPS) {
          this.undoStack.shift();
        }
      }
    }
    this.current = null;
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
    this.synchronizeChanges(step, "before");
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
    this.synchronizeChanges(step, "after");
  }

  private synchronizeChanges(changes: HistoryChange[], target: "before" | "after") {
    if (this.synchronizedState) {
      this.synchronizedState.apply(
        changes.map((historyChange) => ({
          path: [historyChange.pluginName, ...historyChange.path],
          value: historyChange[target],
        }))
      );
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

  addToRoot(pluginName: string, root: any) {
    this.root[pluginName] = root;
  }

  updateStateFromRoot(...args: any[]) {
    const val: any = args.pop();
    const [pluginName, ...path] = args as [any, string | number];
    const root = this.root[pluginName];
    let value = root as any;
    let key = path[path.length - 1];
    for (let pathIndex = 0; pathIndex <= path.length - 2; pathIndex++) {
      const p = path[pathIndex];
      if (value[p] === undefined) {
        const nextPath = path[pathIndex + 1];
        if (typeof nextPath === "string") {
          value[p] = {};
        } else if (typeof nextPath === "number") {
          value[p] = [];
        } else {
          throw new Error(`Cannot create new path: ${path}`);
        }
      }
      value = value[p];
    }
    if (this.current) {
      this.current.push({
        pluginName,
        root,
        path,
        before: value[key],
        after: val,
        history: this.historize,
      });
    }
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
