import { uuidv4 } from "./helpers/index";
import { inverseCommand } from "./helpers/inverse_commands";
import { transform } from "./ot/ot";
import {
  Command,
  CommandHandler,
  CommandResult,
  CancelledReason,
  CoreCommand,
  CommandDispatcher,
  UndoCommand,
  RedoCommand,
  UID,
} from "./types/index";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

interface Step {
  id: UID;
  timestamp: number;
  commands: CoreCommand[];
  inverses: CoreCommand[];
  changes: HistoryChange[];
}

interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

/**
 * Max Number of history steps kept in memory
 */
export const MAX_HISTORY_STEPS = 99;

export interface WorkbookHistory<Plugin> {
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

export class WHistory implements CommandHandler<CoreCommand | UndoCommand | RedoCommand> {
  private current: Step | null = null;
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];
  private historize: boolean = false;

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

  selectiveUndo(id: UID) {
    /**
     * 1) Revenir au state juste avant l'id
     * 2) Prendre tous les redo, les transformer en fonction de la commande inverse de l'id
     * 3) dispatcher tous les redo transformés
     */

    //1 Revert to the state just before the id.
    console.table(this.undoStack);
    const index = this.undoStack.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No history step with id ${id}`);
    }
    const toRedo: Step[] = this.undoStack.slice(index + 1);
    console.table(toRedo);
    for (let x of toRedo.reverse()) {
      for (let i = x.changes.length - 1; i >= 0; i--) {
        let change = x.changes[i];
        this.applyChange(change, "before");
      }
    }
    toRedo.reverse();

    // 2) Undo the commandsUndoed
    this.undoStack = this.undoStack.slice(0, index + 1);
    const commandsUndoed = this.undoStack.pop();
    if (!commandsUndoed) {
      return;
    }
    const executed = commandsUndoed.inverses;
    for (let i = commandsUndoed.changes.length - 1; i >= 0; i--) {
      let change = commandsUndoed.changes[i];
      this.applyChange(change, "before");
    }

    // 3) Take all the redos to do, transform them with the inverse of command id
    for (let step of toRedo) {
      const commands: CoreCommand[] = [];
      for (let cmd of step.commands) {
        for (let e of executed) {
          commands.push(...transform(cmd, e, 1, 0));
        }
      }
      if (commands) {
        this.current = {
          id: step.id,
          timestamp: step.timestamp,
          commands,
          inverses: commands.map((cmd) => inverseCommand(cmd)),
          changes: [],
        };
        for (let cmd of commands) {
          console.table(cmd);
          this.dispatch(cmd.type, cmd);
        }

        if (this.current.changes.length) {
          this.undoStack.push(this.current);
        }
        this.current = null;
      }
    }
    //TODO Redostack
  }

  // startStep(cmd: CoreCommand | UndoCommand | RedoCommand) {
  startStep(cmd: Command) {
    if (!this.current && this.historize && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.current = {
        id: uuidv4(),
        timestamp: 1,
        commands: [],
        inverses: [],
        changes: [],
      };
    }
  }

  addStep(command: CoreCommand) {
    if (this.current) {
      this.current.commands.push(command);
      this.current.inverses.push(inverseCommand(command));
    }
  }

  //TODO Fine tune this
  beforeHandle() {}
  //TODO Fine tune this
  finalize() {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        // this.undo();
        const id = this.undoStack[this.undoStack.length - 1].id;
        this.selectiveUndo(id);
        // this.undo(id);
        break;
      case "SELECTIVE_UNDO":
        this.selectiveUndo(cmd.id);
        break;
      case "REDO":
        this.redo();
        break;
      case "START":
        this.historize = true;
    }
  }

  finalizeStep() {
    if (this.current && this.current.changes.length) {
      this.undoStack.push(this.current);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
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

  /**
   * Create an empty structure according to the type of the node key:
   * string: object
   * number: array
   */
  private createEmptyStructure(node: string | number | any) {
    if (typeof node === "string") {
      return {};
    } else if (typeof node === "number") {
      return [];
    }
    throw new Error(`Cannot create new node`);
  }

  private applyChange(change: HistoryChange, target: "before" | "after") {
    let val = change.root as any;
    let key = change.path[change.path.length - 1];
    for (let pathIndex = 0; pathIndex < change.path.slice(0, -1).length; pathIndex++) {
      const p = change.path[pathIndex];
      if (val[p] === undefined) {
        const nextPath = change.path[pathIndex + 1];
        val[p] = this.createEmptyStructure(nextPath);
      }
      val = val[p];
    }
    if (change[target] === undefined) {
      delete val[key];
    } else {
      val[key] = change[target];
    }
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
        value[p] = this.createEmptyStructure(nextPath);
      }
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
