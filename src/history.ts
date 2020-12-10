import * as owl from "@odoo/owl";
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
  UID,
  HistoryChange,
  RedoStep,
  UndoStep,
} from "./types/index";
import { ClientId, CommandMessage, Message, StateVector } from "./types/multi_users";

/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

class Transaction {
  public commands: CoreCommand[] = [];
  public inverses: CoreCommand[] = [];
  public changes: HistoryChange[] = [];
  private stateVector: StateVector;

  constructor(public id: UID = uuidv4(), stateVector: StateVector, private clientId: ClientId) {
    this.stateVector = { ...stateVector };
  }

  // public toUndoStep(): UndoStep {
  //   return { id: this.id, commands: this.commands, inverses: this.inverses, changes: this.changes };
  // }

  precedes(transaction: Transaction): boolean {
    const sum1 = Object.values(this.stateVector);
    const sum2 = Object.values(transaction.stateVector);
    return sum1 < sum2 || this.clientId < transaction.clientId;
  }

  public hasChanges(): boolean {
    return this.changes.length > 0;
  }
}

export class StateReplicator2000 extends owl.core.EventBus implements CommandHandler<Command> {
  private readonly clientId = uuidv4();
  private readonly stateVector: StateVector = { [this.clientId]: 0 };
  private transaction: Transaction | null = null;
  private undoStack: Transaction[] = [];
  private redoStack: RedoStep[] = []; //TODO Check if 'id' is needed
  private localTransactionIds: UID[] = [];

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    protected network?: ModelConfig["network"]
  ) {
    super();
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
        this.selectiveUndo(id);
        break;
      case "REDO":
        this.redo();
        break;
    }
  }

  finalize() {}

  // ---------------------------------------------------------------------------
  // Transaction Management
  // ---------------------------------------------------------------------------

  createTransaction(id?: UID): Transaction {
    return new Transaction(id, this.stateVector, this.clientId);
  }

  transact(cmd: Command, callback: () => void, id?: UID) {
    const hasTransaction: boolean = this.transaction !== null;
    if (!hasTransaction && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.transaction = this.createTransaction(id);
    }
    callback();
    if (!hasTransaction && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.commit();
    }
  }

  private commit() {
    if (!this.transaction) {
      throw new Error("No transaction to commit!");
    }
    if (this.transaction.hasChanges()) {
      this.stateVector[this.clientId]++;
      this.undoStack.push(this.transaction);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
      this.localTransactionIds.push(this.transaction.id);
      if (this.network) {
        this.network.sendMessage({
          type: "COMMAND",
          clientId: this.clientId,
          commands: this.transaction.commands,
          transactionId: this.transaction.id,
          stateVector: this.stateVector,
        });
      }
    }
    this.transaction = null;
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
  private onMessageReceived(message: Message) {
    if (message.clientId === this.clientId) {
      return;
    }
    switch (message.type) {
      case "CONNECTION":
        for (let commandMessage of message.messages) {
          this.handleRemoteMessage(commandMessage);
        }
        break;
      case "COMMAND":
        this.handleRemoteMessage(message);

        break;
      case "SELECTIVE_UNDO":
        this.selectiveUndo(message.transactionId);
        break;
    }
    this.trigger("update");
  }

  private handleRemoteMessage(message: CommandMessage) {
    const remoteTransaction = new Transaction(
      message.transactionId,
      message.stateVector,
      message.clientId
    );
    const orderedTransactions = this.undoStack
      .filter((transaction) => !transaction.precedes(remoteTransaction))
      .sort((tr1, tr2) => (tr1.precedes(tr2) ? -1 : 1));
    this.undoStack = this.undoStack.filter((transaction) =>
      transaction.precedes(remoteTransaction)
    );
    this.revert(orderedTransactions);
    this.transaction = remoteTransaction;
    for (let cmd of message.commands) {
      this.dispatch(cmd.type, cmd);
    }
    if (this.transaction.hasChanges()) {
      this.transaction.commands = message.commands;
      this.transaction.inverses = message.commands.map((cmd) => inverseCommand(cmd));
      this.undoStack.push(this.transaction);
    }
    this.transaction = null;
    this.replay(message.commands, orderedTransactions);
    // this.processPending();
    this.stateVector[message.clientId]++;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Undo/Redo management
  // ---------------------------------------------------------------------------

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

  // TODO rename deletedCommands
  private replay(deletedCommands: CoreCommand[], steps: UndoStep[]) {
    for (const step of steps) {
      const commands: CoreCommand[] = [];
      for (let cmd of step.commands) {
        for (let deletedCommand of deletedCommands) {
          commands.push(...transform(cmd, deletedCommand));
        }
      }
      if (commands.length > 0) {
        this.transaction = this.createTransaction(step.id);
        for (let cmd of commands.slice()) {
          this.dispatch(cmd.type, cmd);
        }
        if (this.transaction.changes.length) {
          this.transaction.commands = commands;
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
      if (this.network) {
        this.network.sendMessage({
          type: "SELECTIVE_UNDO",
          transactionId: id,
          clientId: this.clientId,
        });
      }
    }
  }

  addStep(command: CoreCommand) {
    if (this.transaction) {
      this.transaction.commands.push(command);
      this.transaction.inverses.push(inverseCommand(command));
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
    this.transaction = this.createTransaction(step.id);
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }

    if (this.transaction.changes.length) {
      this.undoStack.push(this.transaction);
      this.localTransactionIds.push(this.transaction.id);
      if (this.network) {
        this.network.sendMessage({
          type: "COMMAND",
          transactionId: this.transaction.id,
          commands,
          clientId: this.clientId,
          stateVector: this.stateVector, // TODO check this
        });
      }
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
