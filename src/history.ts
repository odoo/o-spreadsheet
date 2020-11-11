import { EventBus } from "@odoo/owl/dist/types/core/event_bus";
import { Command, CommandHandler, CommandResult, CancelledReason } from "./types/index";

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

export interface WorkbookHistory<Plugin> {
  addEvent(event: any);
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
  private eventStack: any[] | null = null;
  private undoStack: Step[] = [];
  private undoEvent: any[] = [];
  private redoStack: Step[] = [];
  private redoEvent: any[] = [];
  private historize: boolean = false;
  private bus: EventBus | undefined;

  //TODO It's only for keeping tests
  constructor(bus?: EventBus) {
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
    if (this.current && this.current.length) {
      this.undoStack.push(this.current);
      this.undoEvent.push(this.eventStack);
      this.redoStack = [];
      this.redoEvent = [];
      this.current = null;
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
        this.undoEvent.shift();
      }
    }
  }

  logEvents(events, name) {
    const array = events.map((ev) => ev.name);
    console.log(name, array);
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
    const events = this.undoEvent.pop();
    this.logEvents(events, "undo");
    this.eventStack = [];
    for (let event of events) {
      this.applyEvent(event);
    }
    this.redoEvent.push(this.eventStack);
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
    const events = this.redoEvent.pop();
    this.logEvents(events, "redo");
    this.eventStack = [];
    for (let event of events) {
      this.applyEvent(event);
    }
    this.undoEvent.push(this.eventStack);
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

  addEvent(event) {
    if (this.eventStack) {
      this.eventStack.push(event);
    }
  }

  applyEvent(event) {
    console.table(event.data);
    this.bus && this.bus.trigger(event.name, event.data);
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
