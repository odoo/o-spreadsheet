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

interface UndoStep {
  id: UID;
  commands: CoreCommand[];
  inverses: CoreCommand[];
  changes: HistoryChange[];
}

interface RedoStep {
  id: UID;
  commands: CoreCommand[];
}

interface HistoryChange {
  root: any;
  path: (string | number)[];
  value: any;
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
  private current: UndoStep | null = null;
  private undoStack: UndoStep[] = [];
  private redoStack: RedoStep[] = [];
  private localUndoStack: UID[] = [];
  private historize: boolean = false;

  constructor(private dispatch: CommandDispatcher["dispatch"]) {}

  // getters
  canUndo(): boolean {
    return this.localUndoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private canSelectiveUndo(id: UID) {
    return this.undoStack.findIndex((step) => step.id === id) > -1;
  }

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "UNDO":
        return this.canUndo()
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
      case "SELECTIVE_UNDO":
        return this.canSelectiveUndo(cmd.id)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
      case "REDO":
        return this.canRedo()
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyRedoStack };
    }
    return { status: "SUCCESS" };
  }

  private revert(steps: UndoStep[]) {
    for (const step of steps.slice().reverse()) {
      this.undoStep(step);
    }
  }

  private undoStep(step: UndoStep) {
    for (let i = step.changes.length - 1; i >= 0; i--) {
      this.applyChange(step.changes[i]);
    }
  }

  private replay(deletedCommands: CoreCommand[], steps: UndoStep[]) {
    for (const step of steps) {
      const commands: CoreCommand[] = [];
      for (let cmd of step.commands) {
        for (let deletedCommand of deletedCommands) {
          commands.push(...transform(cmd, deletedCommand));
        }
      }
      if (commands.length > 0) {
        this.current = {
          id: step.id,
          commands: [],
          inverses: [],
          changes: [],
        };
        for (let cmd of commands.slice()) {
          this.dispatch(cmd.type, cmd);
        }

        if (this.current.changes.length) {
          this.undoStack.push(this.current);
        }
        this.current = null;
      }
    }
  }

  /**
   * Undo a step with the given ID.
   *
   * To do so, we have to:
   * 1) Revert the state before the selected step
   * 2) Replay the steps from selected step + 1 to the end, with transforming
   *    the commands from the inverted commands of the selected step
   * 3) Add the selected step to the redo stack
   * @param id Id of the step to undo
   */
  private selectiveUndo(id: UID) {
    const isLocal = this.localUndoStack.findIndex((stepId) => stepId === id) > -1;
    if (isLocal) {
      this.localUndoStack = this.localUndoStack.filter((stepId) => stepId !== id);
    }
    const index = this.undoStack.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No history step with id ${id}`);
    }
    const stepsToRevert = this.undoStack.splice(index + 1);
    const stepToUndo = this.undoStack.pop();
    if (!stepToUndo) {
      return;
    }
    this.revert([stepToUndo, ...stepsToRevert]);
    this.replay(stepToUndo.inverses, stepsToRevert);
    if (isLocal) {
      this.redoStack.push({ id: stepToUndo.id, commands: stepToUndo.commands });
    }
  }

  startTransaction(cmd: Command, transactionId: UID) {
    if (!this.current && this.historize && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.current = {
        id: transactionId,
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

  beforeHandle() {}
  finalize() {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        const id = this.localUndoStack[this.localUndoStack.length - 1];
        this.dispatch("SELECTIVE_UNDO", { id });
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

  finalizeTransaction(cmd: Command) {
    if (this.current && this.current.changes.length) {
      this.undoStack.push(this.current);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
      if (cmd.type !== "EXTERNAL") {
        this.localUndoStack.push(this.current.id);
      }
    }
    this.current = null;
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) {
      return;
    }
    const commands = step.commands;
    // TODO: Transformer la commande avec les commandes entre le moment où c'est ajouté
    // dans la redostack et mtn
    this.current = {
      id: step.id,
      commands: [],
      inverses: [],
      changes: [],
    };
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }

    if (this.current.changes.length) {
      this.undoStack.push(this.current);
      this.localUndoStack.push(this.current.id);
    }
    this.current = null;
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

  private applyChange(change: HistoryChange) {
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
    if (change.value === undefined) {
      delete val[key];
    } else {
      val[key] = change.value;
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
        value: value[key],
      });
    }
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
