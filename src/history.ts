import * as owl from "@odoo/owl";
import { MAX_HISTORY_STEPS } from "./constants";
import { isDefined, uuidv4 } from "./helpers/index";
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

class Transaction {
  // TODO make it private
  public commands: CoreCommand[] = [];
  public inverses: CoreCommand[] = [];
  public changes: HistoryChange[] = [];
  public stateVector: StateVector;

  constructor(public id: UID = uuidv4(), stateVector: StateVector, public clientId: ClientId) {
    this.stateVector = { ...stateVector };
  }

  // public toUndoStep(): UndoStep {
  //   return { id: this.id, commands: this.commands, inverses: this.inverses, changes: this.changes };
  // }

  arbitraryPrecedes(transaction: Transaction): boolean {
    const sum1 = Object.values(this.stateVector).reduce((a, b) => a + b, 0);
    const sum2 = Object.values(transaction.stateVector).reduce((a, b) => a + b, 0);
    return sum1 < sum2 || this.clientId < transaction.clientId;
  }

  isConcurrentTo(transaction: Transaction): boolean {
    return isConcurrent(this.stateVector, transaction.stateVector);
  }

  public hasChanges(): boolean {
    return this.changes.length > 0;
  }
}

class Debug {
  private messages: string[] = [];

  constructor(private clientId: UID) {}

  public log(message: string) {
    this.messages.push(message);
  }

  public print() {
    console.log([this.clientId, ...this.messages].join("\n"));
  }
}

export class StateReplicator2000 extends owl.core.EventBus implements CommandHandler<Command> {
  private readonly clientId = uuidv4();
  private stateVector: StateVector = { [this.clientId]: 0 };
  private transaction: Transaction | null = null;
  private undoStack: Transaction[] = [];
  private redoStack: RedoStep[] = []; //TODO Check if 'id' is needed
  private localTransactionIds: UID[] = [];

  /**
   * TODO: Remove these
   */
  private debug: Debug = new Debug(this.clientId);
  public printDebug: boolean = false;

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
    this.stateVector[this.clientId]++;
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
    this.debug = new Debug(this.clientId);
    this.debug.log(`Message received from ${message.clientId}`);
    if (message.clientId === this.clientId) {
      return;
    }
    this.debug.log(`Message received: ${message.type}`);
    switch (message.type) {
      case "CONNECTION":
        for (let commandMessage of message.messages) {
          this.handleRemoteMessage(commandMessage);
        }
        break;
      case "COMMAND":
        this.debug.log(`Commands received: [${message.commands.map((cmd) => cmd.type).join(";")}]`);
        this.handleRemoteMessage(message);

        break;
      case "SELECTIVE_UNDO":
        this.selectiveUndo(message.transactionId);
        break;
    }
    if (this.printDebug) {
      this.debug.print();
    }
    this.trigger("update");
  }

  private logStateVector(sv: StateVector): string {
    return `[${Object.entries(sv)
      .map(([k, v]) => `[${k}:${v}]`)
      .join(";")}]`;
  }

  private handleRemoteMessage(message: CommandMessage) {
    const remoteTransaction = new Transaction(
      message.transactionId,
      message.stateVector,
      message.clientId
    );
    remoteTransaction.commands = message.commands;
    this.debug.log(`Remote transaction ID: ${message.transactionId}`);

    this.debug.log(
      `UndoStack: ${this.undoStack.map((s) => s.commands.map((c) => c.type).join(";")).join(" - ")}`
    );
    const localTransactions = this.undoStack.filter((transaction) =>
      transaction.isConcurrentTo(remoteTransaction)
    );
    this.debug.log(
      `localTransactions: ${localTransactions
        .map((s) => s.commands.map((c) => c.type).join(";"))
        .join(" - ")}`
    );
    this.debug.log(`local state: ${this.logStateVector(this.stateVector)}`);
    this.debug.log(`remote state: ${this.logStateVector(remoteTransaction.stateVector)}`);

    // remote { alice: 2 }
    // undoStack: { alice: 2, bob: 1 }
    const transactionsToReplay = [...localTransactions, remoteTransaction].sort((tr1, tr2) =>
      tr1.arbitraryPrecedes(tr2) ? -1 : 1
    );
    this.debug.log(
      `transactionsToReplay: ${transactionsToReplay
        .map((s) => s.commands.map((c) => c.type).join(";"))
        .join(" - ")}`
    );

    this.undoStack = this.undoStack.filter(
      (transaction) => !transaction.isConcurrentTo(remoteTransaction)
    );
    this.debug.log(
      `Undostack after filtering: ${this.undoStack
        .map((us) => us.commands.map((c) => c.type).join(";"))
        .join(" - ")}`
    );

    this.revert(localTransactions);

    this.doStuff(transactionsToReplay, remoteTransaction);

    // this.replay(message.commands, localTransactions);
    this.mergeStateVector(message.stateVector);
    this.stateVector[this.clientId]++;
    this.debug.log(
      `Undostack after message handling: ${this.undoStack
        .map((us) => us.commands.map((c) => c.type).join(";"))
        .join(" - ")}`
    );
  }

  // [ A1 A2 B1 A3 A4 ]
  private doStuff(allTransactions: Transaction[], remoteTransaction: Transaction) {
    const localBeforeRemoteCome: CoreCommand[] = [];
    let alreadyFindRemote: boolean = false;
    let remoteCommands: CoreCommand[] = remoteTransaction.commands;
    this.debug.log(`DoStuff: remoteCommands: [${remoteCommands.map((c) => c.type).join(";")}]`);
    for (const tr of allTransactions) {
      this.transaction = new Transaction(tr.id, tr.stateVector, tr.clientId);
      if (tr === remoteTransaction) {
        this.debug.log(`Found remote command: ${tr.id}`);
        alreadyFindRemote = true;
        for (let localBefore of localBeforeRemoteCome) {
          remoteCommands = remoteCommands
            .map((tec) => {
              const tmp = transform(tec, localBefore);
              this.debug.log(`Transform ${tec.type} and ${localBefore.type} => [${tmp?.type}]`);
              return tmp;
            })
            .filter(isDefined);
        }
        this.transaction.commands = remoteCommands;
        for (let cmd of remoteCommands) {
          this.debug.log(`Dispatch remote command: ${cmd.type}`);
          this.dispatch(cmd.type, cmd);
        }
      } else if (!alreadyFindRemote) {
        for (let cmd of tr.commands) {
          this.debug.log(`Dispatch local command arrived BEFORE remote command: ${cmd.type}`);
          this.dispatch(cmd.type, cmd);
        }
        this.transaction.commands = tr.commands;
        localBeforeRemoteCome.push(...tr.commands);
      } else {
        const toExecute: CoreCommand[] = [];
        for (let localCommand of tr.commands) {
          let localCommands: CoreCommand[] = [localCommand];
          for (let remoteCommand of remoteCommands) {
            localCommands = localCommands
              .map((lc) => {
                const tmp = transform(lc, remoteCommand);
                this.debug.log(`Transform ${lc.type} and ${remoteCommand.type} => [${tmp?.type}]`);
                return tmp;
              })
              .filter(isDefined);
          }
          toExecute.push(...localCommands);
        }
        for (let c of toExecute) {
          this.debug.log(`Dispatch local command arrived AFTER remote command: ${c.type}`);
          this.dispatch(c.type, c);
        }
        this.transaction.commands = toExecute;
      }
      if (this.transaction.changes.length) {
        this.transaction.inverses = this.transaction.commands.map((c) => inverseCommand(c));
        this.undoStack.push(this.transaction);
      }
      this.transaction = null;
    }

    // this.transaction = remoteTransaction;
    // /* Here: do stuff */
    // if (this.transaction.hasChanges()) {
    //   this.transaction.commands = message.commands;
    //   this.transaction.inverses = message.commands.map((cmd) => inverseCommand(cmd));
    //   this.undoStack.push(this.transaction);
    // }
    // this.transaction = null;
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Undo/Redo management
  // ---------------------------------------------------------------------------

  private revert(steps: UndoStep[]) {
    for (const step of steps.slice().reverse()) {
      this.debug.log(`Revert commands: [${step.commands.map((cmd) => cmd.type).join(";")}]`);
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
    this.debug.log(
      `[REPLAY] shoud replay ${steps
        .map((s) => s.commands.map((c) => c.type).join(";"))
        .join(" - ")}`
    );
    this.debug.log(`Deleted commands: [${deletedCommands.map((c) => c.type).join(";")}]`);
    for (const step of steps) {
      const commands: CoreCommand[] = [];
      for (let cmd of step.commands) {
        for (let deletedCommand of deletedCommands) {
          const tmp = transform(cmd, deletedCommand);
          this.debug.log(
            `[REPLAY] Transform [${cmd.type}] and [${deletedCommand.type}] => [${tmp?.type}]`
          );
          if (tmp) {
            commands.push(tmp);
          }
        }
      }
      if (commands.length > 0) {
        this.transaction = this.createTransaction(step.id);
        for (let cmd of commands.slice()) {
          this.debug.log(`Replay [${cmd.type}]`);
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
      throw new Error(`No history step with id ${id} - ${this.clientId}`);
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
