import * as owl from "@odoo/owl";
import { MAX_HISTORY_STEPS } from "./constants";
import { uuidv4 } from "./helpers/index";
import { inverseCommand } from "./helpers/inverse_commands";
import { ModelConfig } from "./model";
import { transformAll } from "./ot/ot";
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
 * Let denote V1 and V2 the two argument state vectors.
 * This method checks if V1 precedes V2 (meaning happened before): V1 < V2
 * V1 < V2 if and only if:
 * - V1[c] <= V2[c] for all c in ... TODO
 */
function precedes(stateVector1: StateVector, stateVector2: StateVector): boolean {
  const clientIds = new Set(Object.keys(stateVector1).concat(Object.keys(stateVector2)));
  let onePrecedes = false;
  for (let clientId of clientIds) {
    const state1 = stateVector1[clientId] || 0;
    const state2 = stateVector2[clientId] || 0;
    if (state1 > state2) return false;
    if (state1 < state2) {
      onePrecedes = true;
    }
  }
  return onePrecedes;
}

function isConcurrent(stateVector1: StateVector, stateVector2: StateVector) {
  return !precedes(stateVector2, stateVector1) && !precedes(stateVector1, stateVector2);
}
/**
 * History Management System
 *
 * This file contains the code necessary to make the undo/redo feature work
 * as expected.
 */

class HistoryStep {
  // TODO make it private
  public commands: CoreCommand[] = [];
  public inverses: CoreCommand[] = [];
  public changes: HistoryChange[] = [];
  public stateVector: StateVector;

  constructor(public id: UID = uuidv4(), stateVector: StateVector, public clientId: ClientId) {
    this.stateVector = { ...stateVector };
  }

  arbitraryPrecedes(transaction: HistoryStep): boolean {
    const sum1 = Object.values(this.stateVector).reduce((a, b) => a + b, 0);
    const sum2 = Object.values(transaction.stateVector).reduce((a, b) => a + b, 0);
    return sum1 < sum2 || this.clientId < transaction.clientId;
  }

  isConcurrentTo(transaction: HistoryStep): boolean {
    return isConcurrent(this.stateVector, transaction.stateVector);
  }

  public hasChanges(): boolean {
    return this.changes.length > 0;
  }
}

export class StateReplicator2000 extends owl.core.EventBus implements CommandHandler<Command> {
  private stateVector: StateVector = { [this.userId]: 0 };
  private historyStep: HistoryStep | null = null;
  private undoStack: HistoryStep[] = [];
  private redoStack: RedoStep[] = []; //TODO Check if 'id' is needed
  private localTransactionIds: UID[] = [];

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    protected readonly userId: UID,
    protected network?: ModelConfig["network"]
  ) {
    super();
    if (network) {
      network.onNewMessage(this.userId, this.onMessageReceived.bind(this));
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

  createLocalTransaction(id?: UID): HistoryStep {
    this.stateVector[this.userId]++;
    return new HistoryStep(id, this.stateVector, this.userId);
  }

  transact(cmd: Command, callback: () => void, id?: UID) {
    const hasTransaction: boolean = this.historyStep !== null;
    if (!hasTransaction && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.historyStep = this.createLocalTransaction(id);
    }
    callback();
    if (!hasTransaction && cmd.type !== "UNDO" && cmd.type !== "REDO") {
      this.commit();
    }
  }

  private commit() {
    if (!this.historyStep) {
      throw new Error("No transaction to commit!");
    }
    if (this.historyStep.hasChanges()) {
      this.undoStack.push(this.historyStep);
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
      this.localTransactionIds.push(this.historyStep.id);
      if (this.network) {
        this.network.sendMessage({
          type: "COMMAND",
          clientId: this.userId,
          commands: this.historyStep.commands,
          transactionId: this.historyStep.id,
          stateVector: this.stateVector,
        });
      }
    }
    this.historyStep = null;
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

  getUserId(): UID {
    return this.userId;
  }

  // ---------------------------------------------------------------------------
  // Network
  // ---------------------------------------------------------------------------

  /**
   * Called whenever a message is received from the network
   */
  onMessageReceived(message: Message) {
    if (message.clientId === this.userId) {
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
    const remoteTransaction = new HistoryStep(
      message.transactionId,
      message.stateVector,
      message.clientId
    );
    remoteTransaction.commands = message.commands;
    const localTransactions = this.undoStack.filter((transaction) =>
      transaction.isConcurrentTo(remoteTransaction)
    );
    const transactionsToReplay = [...localTransactions, remoteTransaction].sort((tr1, tr2) =>
      tr1.arbitraryPrecedes(tr2) ? -1 : 1
    );
    this.undoStack = this.undoStack.filter(
      (transaction) => !transaction.isConcurrentTo(remoteTransaction)
    );
    this.revert(localTransactions);
    this.doStuff(transactionsToReplay, remoteTransaction);
    this.mergeStateVector(message.stateVector);
    this.stateVector[this.userId]++;
  }

  // [ A1 A2 B1 A3 A4 ]
  private doStuff(allTransactions: HistoryStep[], remoteTransaction: HistoryStep) {
    const localBeforeRemoteCome: CoreCommand[] = [];
    let alreadyFindRemote: boolean = false;
    let remoteCommands: CoreCommand[] = remoteTransaction.commands;
    for (const tr of allTransactions) {
      if (!alreadyFindRemote && tr !== remoteTransaction) {
        this.banane(tr, tr.commands);
        localBeforeRemoteCome.push(...tr.commands);
      } else if (tr === remoteTransaction) {
        alreadyFindRemote = true;
        for (let localBefore of localBeforeRemoteCome) {
          remoteCommands = transformAll(remoteCommands, localBefore);
        }
        this.banane(tr, remoteCommands);
      } else {
        const toExecute: CoreCommand[] = [];
        for (let localCommand of tr.commands) {
          let localCommands: CoreCommand[] = [localCommand];
          for (let remoteCommand of remoteCommands) {
            localCommands = transformAll(localCommands, remoteCommand);
          }
          toExecute.push(...localCommands);
        }
        this.banane(tr, toExecute);
      }
    }
  }

  private mergeStateVector(stateVector: StateVector) {
    const newStateVector: StateVector = {};
    const clientIds = new Set(Object.keys(stateVector).concat(Object.keys(this.stateVector)));
    for (let clientId of clientIds) {
      const state1 = stateVector[clientId] || 0;
      const state2 = this.stateVector[clientId] || 0;
      newStateVector[clientId] = Math.max(state1, state2);
    }
    this.stateVector = newStateVector;
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

  /**
   *
   */
  private banane(historyStep: HistoryStep, commands: CoreCommand[]) {
    this.historyStep = historyStep;
    this.historyStep.changes = [];
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }
    if (this.historyStep.hasChanges()) {
      this.historyStep.commands = commands;
      this.historyStep.inverses = commands.map((c) => inverseCommand(c));
      this.undoStack.push(this.historyStep);
    }
    this.historyStep = null;
  }

  // TODO rename deletedCommands
  private replay(deletedCommands: CoreCommand[], steps: HistoryStep[]) {
    for (const step of steps) {
      const commands: CoreCommand[] = [];
      for (let deletedCommand of deletedCommands) {
        commands.push(...transformAll(step.commands, deletedCommand));
      }
      this.banane(step, commands);
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
      throw new Error(`No history step with id ${id} - ${this.userId}`);
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
          clientId: this.userId,
        });
      }
    }
  }

  addStep(command: CoreCommand) {
    if (this.historyStep) {
      this.historyStep.commands.push(command);
      this.historyStep.inverses.push(inverseCommand(command));
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
    this.historyStep = this.createLocalTransaction(step.id);
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }

    if (this.historyStep.changes.length) {
      this.undoStack.push(this.historyStep);
      this.localTransactionIds.push(this.historyStep.id);
      if (this.network) {
        this.network.sendMessage({
          type: "COMMAND",
          transactionId: this.historyStep.id,
          commands,
          clientId: this.userId,
          stateVector: this.stateVector, // TODO check this
        });
      }
    }

    this.historyStep = null;
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
    if (this.historyStep) {
      this.historyStep.changes.push({
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
