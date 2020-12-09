import { MAX_HISTORY_STEPS } from "./constants";
import { uuidv4 } from "./helpers/index";
import { inverseCommand } from "./helpers/inverse_commands";
import { ModelConfig } from "./model";
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
  HistoryChange,
  RedoStep,
  UndoStep as Transaction,
} from "./types/index";
import { ReceivedMessage } from "./types/multi_users";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

export class StateReplicator2000
  implements CommandHandler<CoreCommand | UndoCommand | RedoCommand> {
  private readonly clientId = uuidv4();
  private transaction: Transaction | null = null;
  private undoStack: Transaction[] = [];
  private redoStack: RedoStep[] = [];
  private localTransactionIds: UID[] = [];
  private isMultiuser: boolean = false;
  private isUndo: boolean = false;
  private stack: CoreCommand[] = [];
  private transactionId: UID | undefined;
  private pendingMessages: ReceivedMessage[] = [];

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    protected network?: ModelConfig["network"]
  ) {
    if (network) {
      network.onNewMessage(this.clientId, this.onMessageReceived.bind(this));
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

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

  beforeHandle() {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        const id = this.localTransactionIds[this.localTransactionIds.length - 1];
        this.dispatch("SELECTIVE_UNDO", { id });
        break;
      case "SELECTIVE_UNDO":
        this.selectiveUndo(cmd.id);
        break;
      case "REDO":
        this.redo();
        break;
      case "EXTERNAL":
        for (let command of cmd.commands) {
          this.dispatch(command.type, command);
        }
        break;
    }
  }

  finalize() {}

  // ---------------------------------------------------------------------------
  // Transaction Management
  // ---------------------------------------------------------------------------

  transact(cmd: Command, callback: () => void) {
    this.begin(cmd);
    callback();
    this.commit(cmd);
  }

  private begin(cmd: Command) {
    this.transactionId = cmd.type === "EXTERNAL" ? cmd.transactionId : uuidv4();
    if (!this.transaction && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.transaction = {
        id: this.transactionId,
        commands: [],
        inverses: [],
        changes: [],
      };
    }
    if (cmd.type === "EXTERNAL") {
      this.isMultiuser = true;
    } else if (cmd.type === "UNDO") {
      this.isMultiuser = true;
      this.isUndo = true;
    } else {
      this.stack = [];
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  canUndo(): boolean {
    return this.localTransactionIds.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Network
  // ---------------------------------------------------------------------------

  /**
   * Called whenever a message is received from the network
   */
  private onMessageReceived(message: ReceivedMessage) {
    if (message.clientId === this.clientId) {
      return;
    }
    this.pendingMessages.unshift(message);
    this.processPending();
  }

  private processPending() {
    const keys = this.undoStack.map((step) => step.id);
    const index = this.pendingMessages.findIndex(
      (m) => keys.includes(m.previousTransactionId) || m.previousTransactionId === "START_STATE"
    );
    if (index > -1) {
      const message = this.pendingMessages.splice(index, 1)[0];
      const stateIndex = this.undoStack.findIndex(
        (step) => step.id === message.previousTransactionId
      );
      const stepsToRevert = this.undoStack.splice(stateIndex + 1);
      this.revert(stepsToRevert);
      this.dispatch("EXTERNAL", {
        commands: message.commands,
        transactionId: message.transactionId,
      });
      this.replay(message.commands, stepsToRevert);
      this.processPending();
    }
  }

  private commit(cmd: Command) {
    if (this.transaction && this.transaction.changes.length) {
      this.undoStack.push(this.transaction);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
      if (cmd.type !== "EXTERNAL") {
        this.localTransactionIds.push(this.transaction.id);
      }
    }
    this.transaction = null;
    if (!this.transactionId) {
      throw new Error("Cannot finalize transaction.");
    }
    if (this.network && (!this.isMultiuser || this.isUndo) && this.stack.length > 0) {
      this.network.sendMessage({
        clientId: this.clientId,
        commands: this.stack,
        timestamp: -1,
        transactionId: this.transactionId,
      });
      this.stack = [];
    }
    this.isMultiuser = false;
    this.isUndo = false;
    this.transactionId = undefined;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private canSelectiveUndo(id: UID) {
    return this.undoStack.findIndex((step) => step.id === id) > -1;
  }

  // ---------------------------------------------------------------------------
  // Undo/Redo management
  // ---------------------------------------------------------------------------

  private revert(steps: Transaction[]) {
    for (const step of steps.slice().reverse()) {
      this.undoStep(step);
    }
  }

  private undoStep(step: Transaction) {
    for (let i = step.changes.length - 1; i >= 0; i--) {
      this.applyChange(step.changes[i]);
    }
  }

  private replay(deletedCommands: CoreCommand[], steps: Transaction[]) {
    for (const step of steps) {
      const commands: CoreCommand[] = [];
      for (let cmd of step.commands) {
        for (let deletedCommand of deletedCommands) {
          commands.push(...transform(cmd, deletedCommand));
        }
      }
      if (commands.length > 0) {
        this.transaction = {
          id: step.id,
          commands: [],
          inverses: [],
          changes: [],
        };
        for (let cmd of commands.slice()) {
          this.dispatch(cmd.type, cmd);
        }
        if (this.transaction.changes.length) {
          this.undoStack.push(this.transaction);
        }
        this.transaction = null;
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
    const isLocal = this.localTransactionIds.findIndex((stepId) => stepId === id) > -1;
    if (isLocal) {
      this.localTransactionIds = this.localTransactionIds.filter((stepId) => stepId !== id);
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

  addStep(command: CoreCommand) {
    if (this.transaction) {
      this.transaction.commands.push(command);
      this.transaction.inverses.push(inverseCommand(command));
    }
    if (!this.isMultiuser) {
      this.stack.push(command);
    }
    if (this.isUndo) {
      if (command.type === "SELECTIVE_UNDO") {
        this.stack.push(command);
      }
    }
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) {
      return;
    }
    const commands = step.commands;
    // TODO: Transformer la commande avec les commandes entre le moment où c'est ajouté
    // dans la redostack et mtn
    this.transaction = {
      id: step.id,
      commands: [],
      inverses: [],
      changes: [],
    };
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }

    if (this.transaction.changes.length) {
      this.undoStack.push(this.transaction);
      this.localTransactionIds.push(this.transaction.id);
    }

    this.transaction = null;
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
    if (this.transaction) {
      this.transaction.changes.push({
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
