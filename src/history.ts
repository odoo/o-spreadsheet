import {
  Command,
  Event,
  CommandHandler,
  CommandResult,
  CancelledReason,
  EventDispatcher,
} from "./types/index";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

interface HistoryChange {
  type: "old_history";
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

interface EventHistory {
  type: "event_history";
  event: Event;
}

type Step = (HistoryChange | EventHistory)[];

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory<Plugin> {
  addEvent(event: Event): void;
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
  private eventStack: Event[] | null = null;
  private undoStack: Step[] = [];
  private undoEvent: any[] = [];
  private redoStack: Step[] = [];
  private redoEvent: any[] = [];
  private historize: boolean = false;
  private bus: EventDispatcher | undefined;

  //TODO It's only for keeping tests
  constructor(bus?: EventDispatcher) {
    this.bus = bus;
  }

  // getters
  canUndo(): boolean {
    return this.undoStack.length > 0 || this.undoEvent.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0 || this.redoEvent.length > 0;
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
    if (!this.current && cmd.type !== "REDO" && cmd.type !== "UNDO" && this.historize) {
      this.current = [];
      this.eventStack = [];
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
      case "START":
        this.historize = true;
    }
  }

  finalize() {
    if (this.current && this.eventStack) {
      for (let event of this.eventStack) {
        this.current.push({ type: "event_history", event });
      }
    }
    if (this.current && this.current.length) {
      this.undoStack.push(this.current);
      this.redoStack = [];
      this.current = null;
      this.eventStack = null;
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
    }
  }

  undo() {
    let step = this.undoStack.pop();
    if (!step) {
      return;
    }
    this.eventStack = [];
    const eventsToDo: Event[] = [];
    for (let i = step.length - 1; i >= 0; i--) {
      let change = step[i];
      if (change.type === "old_history") {
        this.applyChange(change, "before");
      } else {
        // this.applyEvent(change.event);
        eventsToDo.unshift(change.event);
      }
    }
    for (let change of eventsToDo) {
      this.applyEvent(change);
    }

    step = step.filter((s) => s.type === "old_history");
    for (let event of this.eventStack) {
      step.push({ type: "event_history", event });
    }
    this.eventStack = null;
    this.redoStack.push(step);
  }

  redo() {
    let step = this.redoStack.pop();
    if (!step) {
      return;
    }
    this.eventStack = [];
    for (let change of step) {
      if (change.type === "old_history") {
        this.applyChange(change, "after");
      } else {
        this.applyEvent(change.event);
      }
    }
    step = step.filter((s) => s.type === "old_history");
    for (let event of this.eventStack) {
      step.push({ type: "event_history", event });
    }
    this.undoStack.push(step);
    this.eventStack = null;
  }

  log(step: (HistoryChange | EventHistory)[], name: string) {
    console.log(name);
    console.table(step.filter((s) => s.type === "old_history"));
    console.table(
      step.filter((s) => s.type === "event_history").map((s) => (s as EventHistory).event)
    );
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

  addEvent(event: Event) {
    if (this.eventStack) {
      this.eventStack.push(event);
    }
  }

  applyEvent(event: Event) {
    this.bus && this.bus.trigger(event.type, event);
  }

  updateStateFromRoot(...args: any[]) {
    const val: any = args.pop();
    const [root, ...path] = args as [any, string | number];
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
    if (value[key] === val) {
      return;
    }
    if (this.current) {
      this.current.push({
        type: "old_history",
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
