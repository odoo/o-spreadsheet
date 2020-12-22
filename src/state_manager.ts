import * as owl from "@odoo/owl";
import { DEFAULT_REVISION_ID, MAX_HISTORY_STEPS } from "./constants";
import { getDebugManager } from "./debug";
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
  CreateRevisionOptions,
  WorkbookData,
} from "./types/index";
import { ClientId, RemoteRevision, Message, RemoteUndo, RevisionData } from "./types/multi_users";

/**
 * Revision Management System
 *
 * The Revision Management System is the responsible of the state changes.
 * It has two main goals: support the history (undo/redo) and manage state
 * replication
 *
 * This system works with Revisions.
 * Each revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
 *
 *
 */

/**
 * For debug purposes only. Remove before merge
 * https://stackoverflow.com/a/7616484
 */
//@ts-ignore
function hash(str: string): number {
  let hash = 0,
    i,
    chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 *
 */
abstract class Revision implements RevisionData {
  public readonly id: UID;
  public readonly clientId: ClientId;
  protected _commands: CoreCommand[] = [];

  constructor(id: UID = uuidv4(), clientId: ClientId) {
    this.id = id;
    this.clientId = clientId;
  }

  get commands(): readonly CoreCommand[] {
    return this._commands;
  }

  abstract getMessage(revisionId: UID): Message;
}

class CommandRevision extends Revision {
  public isUndo: boolean = false;//TODO make it better
  public isCancelled: boolean = false;//TODO make it better
  public toRevert: UID | undefined; //TODO make it better
  protected _inverses: CoreCommand[] = [];
  protected _changes: HistoryChange[] = [];

  get inverses() {
    return [...this._inverses];
  }

  get changes() {
    return [...this._changes];
  }

  getMessage(revisionId: UID): RemoteRevision {
    return {
      type: "REMOTE_REVISION",
      clientId: this.clientId,
      revisionId,
      commands: this._commands,
      newRevisionId: this.id,
    };
  }
}

class SelectiveUndoRevision extends Revision {
  protected revertedRevision: CommandRevision;
  // We have to compute them here to avoid keeping the entire history everywhere
  protected adaptedRevisions: RevisionData[];

  constructor(
    id: UID,
    clientId: ClientId,
    revertedRevision: CommandRevision,
    adaptedRevisions: RevisionData[]
  ) {
    super(id, clientId);
    this.revertedRevision = revertedRevision;
    this.adaptedRevisions = adaptedRevisions;
  }

  get revertedRevisionId() {
    return this.revertedRevision.id;
  }

  get commands(): readonly CoreCommand[] {
    return this.revertedRevision.commands;
  }

  getMessage(revisionId: UID): RemoteUndo {
    return {
      type: "REMOTE_UNDO",
      clientId: this.clientId,
      revisionId,
      newRevisionId: this.id,
      revisionToRollback: this.revertedRevision.id,
      toReplay: this.adaptedRevisions,
    };
  }
}

class DraftRevision extends CommandRevision {

  addCommand(command: CoreCommand) {
    this._commands.push(command);
    this._inverses.push(...inverseCommand(command));
  }

  setCommands(commands: CoreCommand[]) {
    this._commands = commands;
    this._inverses = commands.map((c) => inverseCommand(c)).flat();
  }

  addChange(change: HistoryChange) {
    this._changes.push(change);
  }

  public hasChanges(): boolean {
    return this._changes.length > 0;
  }
}

export class StateManager extends owl.core.EventBus implements CommandHandler<Command> {
  /**
   * Revision that are not yet adopted by the server
   */
  private pendingRevisions: Revision[] = [];

  /**
   * Draft revision on which the current commands and changes are added
   */
  private currentDraftRevision: DraftRevision | null = null;

  /**
   * All the revisions of the current session
   */
  private revisionLogs: CommandRevision[] = [];

  /**
   * Id of the server revision
   */
  private revisionId: UID = DEFAULT_REVISION_ID;

  private redoStack: RedoStep[] = [];

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    protected readonly userId: UID,
    public exportData: () => WorkbookData,
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
        const revision = [...this.revisionLogs]
          .reverse()
          .filter((revision) => !revision.isUndo && !revision.isCancelled)
          .find((step) => step.clientId === this.userId);
        if (revision) {
          this.currentDraftRevision!.toRevert = revision.id; //TODO Make it better
          revision.isCancelled = true;
          this.localSelectiveUndo(revision.id);
          this.sendPendingRevision();
        } else {
          const pending = this.pendingRevisions.pop();
          if (pending) {
            this.revert([pending]);
          }
        }
        break;
      case "REDO":
        this.redo();
        break;
    }
  }

  finalize() {}

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  canUndo(): boolean {
    const revision = [...this.revisionLogs]
          .reverse()
          .filter((revision) => !revision.isUndo && !revision.isCancelled)
          .find((step) => step.clientId === this.userId);
    return !!revision;
  }

  canRedo(): boolean {
    //TODO check dans l'ordre
    const lastUndoRevision = [...this.revisionLogs]
          .reverse()
          .filter((revision) => revision.isUndo && !revision.isCancelled)
          .find((step) => step.clientId === this.userId);
    return !!lastUndoRevision;
  }

  getUserId(): UID {
    return this.userId;
  }

  // ---------------------------------------------------------------------------
  // Import - Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    this.revisionId = data.revisionId;
  }

  /**
   * Revert the local state to the last shared revision.
   */
  revertToSharedRevision() {
    this.revert(this.pendingRevisions);
  }

  /**
   * Apply the local changes
   */
  recoverLocalRevisions() {
    this.transformAndReplayPendingRevisions([]);
  }

  export(data: WorkbookData) {
    data.revisionId = this.revisionId;
  }

  // ---------------------------------------------------------------------------
  // Revision Management
  // ---------------------------------------------------------------------------

  /**
   * Record the changes which could happen in the given callback and save them
   * in a revision.
   */
  recordChanges(callback: () => void, cmd: Command) {
    getDebugManager().addLocalCommand(cmd, this.getUserId()); //TODO Remove
    this.currentDraftRevision = new DraftRevision(uuidv4(), this.userId);
    if (cmd.type === "UNDO") {
      this.currentDraftRevision.isUndo = true;
    }
    callback();
    // In case of Undo or Redo, the currentDraftRevision is entirely managed
    // in the undo-redo functions, and so could be null.
    if (this.currentDraftRevision) {
      this.saveDraftRevision();
    }
  }

  /**
   * Save the currentDraftRevision.
   */
  private saveDraftRevision() {
    if (!this.currentDraftRevision) {
      throw new Error("The currentDraftRevision is null !");
    }
    if (this.currentDraftRevision.hasChanges()) {
      if (this.network) {
        this.pendingRevisions.push(this.currentDraftRevision);
        this.sendPendingRevision();
      } else {
        this.revisionLogs.push(this.currentDraftRevision);
        this.redoStack = [];
        if (this.currentDraftRevision.isUndo) {
          this.redoStack.push({revisionId: this.currentDraftRevision.id});
        }
        //TODO Write tests with MAX_HISTORY_STEPS & MULTIUSER
        if (this.revisionLogs.length > MAX_HISTORY_STEPS) {
          this.revisionLogs.shift();
        }
      }
    }
    this.currentDraftRevision = null;
  }

  // ---------------------------------------------------------------------------
  // State Replication Management
  // ---------------------------------------------------------------------------

  /**
   * Send the first pending revision
   */
  private sendPendingRevision() {
    let revision = this.pendingRevisions[0];
    if (this.network && revision) {
      // console.log(this.pendingRevisions);
      const hashed = hash(JSON.stringify(this.exportData())); //TODO Remove it
      // console.log(this.pendingRevisions);
      // const hashed = undefined;
      this.network.sendMessage({ ...revision.getMessage(this.revisionId), hash: hashed });
    }
  }

  /**
   * Called whenever a message is received from the network
   */
  onMessageReceived(message: Message) {
    //TODO we should perhaps check that this.revisionId === message.revisionId to apply it
    if (message.hash) {
      const current = hash(JSON.stringify(this.exportData()));
      if (current !== message.hash) {
        console.error("Invalid state detected 😱");
      }
    }

    switch (message.type) {
      case "CONNECTION":
        for (let commandMessage of message.messages) {
          this.applyRemoteRevision(commandMessage);
        }
        break;
      case "REMOTE_REVISION":
        if (message.clientId === this.userId) {
          getDebugManager().addAcknowledge(message.commands, this.userId);
          this.acknowledgeRevision(message.newRevisionId);
        } else {
          getDebugManager().addRemoteCommands(message.commands, message.clientId);
          this.applyRemoteRevision(message);
        }
        break;
      case "REMOTE_UNDO":
        if (message.clientId === this.userId) {
          getDebugManager().addAcknowledgeUndo(message.toReplay, this.userId);
          this.acknowledgeRevision(message.newRevisionId);
        } else {
          getDebugManager().addRemoteSelectiveUndo(message.toReplay, message.clientId);
          this.remoteSelectiveUndo(message.revisionToRollback, message.toReplay);
        }
        break;
    }
    this.revisionId = message.newRevisionId;
    this.trigger("remote-command-processed");
    if (this.pendingRevisions.length > 0) {
      this.sendPendingRevision();
    }
  }

  /**
   * Acknowledge the given revision ID
   */
  private acknowledgeRevision(revisionId: UID) {
    const stepIndex = this.pendingRevisions.findIndex((s) => s.id === revisionId);
    if (stepIndex > -1) {
      const revision = this.pendingRevisions.splice(stepIndex, 1)[0];
      if (revision instanceof CommandRevision) {
        this.revisionLogs.push(revision);
        //TODO Write tests for this
        if (this.revisionLogs.length > MAX_HISTORY_STEPS) {
          this.revisionLogs.shift();
        }
      }
    }
  }

  /**
   * Dispatch the given CoreCommands
   */
  private dispatchCommands(commands: CoreCommand[], options: CreateRevisionOptions = {}) {
    const draft = new DraftRevision(
      options.revisionId || uuidv4(),
      options.clientId || this.userId
    );
    const revision = this.applyCommandsOnRevision(draft, commands);
    if (revision) {
      if (options.pending) {
        this.pendingRevisions.push(revision);
      } else {
        this.revisionLogs.push(revision);
      }
    }
  }

  /**
   * Apply the given revision on top of the undo stack
   * For that, we have to revert the pending revision,
   * effectively apply the remote revision and replay the pending revision
   * after transforming them through the applied revision
   */
  private applyRemoteRevision(revision: RemoteRevision) {
    this.revert(this.pendingRevisions);
    this.dispatchCommands(revision.commands, {
      clientId: revision.clientId,
      revisionId: revision.newRevisionId,
    });
    this.transformAndReplayPendingRevisions(revision.commands);
    // this.transformRedoStack(revision.commands);
  }

  // private transformRedoStack(commands: CoreCommand[]) {
  //   this.redoStack = this.redoStack.map((step) => {
  //     let transformedCommands = step.commands;
  //     for (let cmd of commands) {
  //       transformedCommands = transformAll(transformedCommands, cmd);
  //     }
  //     return { ...step, commands: transformedCommands };
  //   });
  // }

  /**
   * Revert the given revisions
   */
  private revert(revisions: Revision[]) {
    for (const revision of revisions.slice().reverse()) {
      if (revision instanceof CommandRevision) {
        for (let i = revision.changes.length - 1; i >= 0; i--) {
          this.applyChange(revision.changes[i], "before");
          //TODO Check if we have to revert the isUndo and isUndone revisions
          if (this.currentDraftRevision) {
            const changes = revision.changes[i];
            this.currentDraftRevision.addChange({...changes, before: changes.after, after: changes.before});
          }
        }
      } else if (revision instanceof SelectiveUndoRevision) {
        console.log("passe");
        this.redoPendingUndo(revision);
      }
    }
  }

  /**
   * 🍌
   */
  private applyCommandsOnRevision(
    revision: DraftRevision,
    commands: CoreCommand[]
  ): CommandRevision | undefined {
    this.currentDraftRevision = revision;
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }
    if (this.currentDraftRevision.hasChanges()) {
      this.currentDraftRevision.setCommands(commands);
    }
    this.currentDraftRevision = null;
    return revision.hasChanges() ? revision : undefined;
  }

  // TODO rename deletedCommands
  private transformAndReplay(
    deletedCommands: CoreCommand[],
    revisions: CommandRevision[]
  ) {
    const executedCommands = [...deletedCommands]; //TODO Check spread
    const commands: CoreCommand[] = [];
    for (const revision of revisions) {
      if (revision.isUndo) {
        // this.localSelectiveUndo(revision.toRevert!, revision.id); //TODO make it better
      } else {
        const transformed: CoreCommand[] = []
        for (let executed of executedCommands) {
          transformed.push(...transformAll(revision.commands, executed));
        }
        if (!revision.isCancelled) {
          commands.concat(transformed)
        }
        executedCommands.concat(transformed)
      }
    }
    commands.map(cmd => this.dispatch(cmd.type, cmd));
  }

  /**
   * Replay the pending revisions after having having transform them through the
   * incorporated commands.
   *
   * @param incorporatedCommands Commands which have been included before the revisions to play
   */
  private transformAndReplayPendingRevisions(incorporatedCommands: CoreCommand[]) {
    const revisions = this.pendingRevisions;
    this.pendingRevisions = [];
    for (const revision of revisions) {
      if (revision instanceof CommandRevision) {
        const commands: CoreCommand[] = [];
        if (incorporatedCommands.length) {
          for (let command of incorporatedCommands) {
            commands.push(...transformAll(revision.commands, command));
          }
        } else {
          commands.push(...revision.commands);
        }
        this.dispatchCommands(commands, {
          revisionId: revision.id,
          clientId: revision.clientId,
          pending: true,
        });
      } else if (revision instanceof SelectiveUndoRevision) {
        this.localSelectiveUndo(revision.revertedRevisionId);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  /**
   * Undo a local revision.
   * 1) Revert the state to the revisionToUndo
   * 2) Transform all the reverted revisions with the inverse of revisionToUndo
   * 3) Replay these transformed revisions
   * 4) If the network is active, send it.
   *
   */
  private localSelectiveUndo(
    revertedRevisionId: UID,
    revertedToRevisionId?: UID
  ) {
    const { toUndo, toRevert: toRevertAndReplay } = this.getSelectiveUndoRevisions(
      revertedRevisionId, revertedToRevisionId
    );
    this.revert([toUndo, ...toRevertAndReplay, ...this.pendingRevisions]); // Attention, revert un selectiveUndo refait une revision
    this.transformAndReplay(toUndo.inverses, toRevertAndReplay);
    // this.transformAndReplayPendingRevisions(toUndo.inverses);
    // if (!options.isReplay) {
    //   this.redoStack.push({ revisionId: this.currentDraftRevision?.id } as RedoStep);
    // }
    // if (this.network) {
    //   const undoRevision = new SelectiveUndoRevision(
    //     options.revisionId || uuidv4(),
    //     this.userId,
    //     toUndo,
    //     transformedCommands
    //   );
    //   this.pendingRevisions.push(undoRevision);
    // }
  }

  /**
   * Undo a remote revision.
   * 1) Revert the state to the revisionToUndo
   * 2) Replay the revisionsToReplay received from the remote
   * 3) Transform and replay the pending revisions
   */
  private remoteSelectiveUndo(id: UID, revisionsToReplay: RevisionData[]) {
    const { toUndo, toRevert } = this.getSelectiveUndoRevisions(id);
    this.revert([toUndo, ...toRevert, ...this.pendingRevisions]);
    for (let revisionData of revisionsToReplay) {
      this.dispatchCommands([...revisionData.commands], {
        revisionId: revisionData.id,
        clientId: revisionData.clientId,
      });
    }
    this.transformAndReplayPendingRevisions(toUndo.inverses);
  }

  /**
   * Get the revision to undo and the revisions to revert.
   */
  private getSelectiveUndoRevisions(
    id: UID,
    toId?: UID
  ): { toUndo: CommandRevision; toRevert: CommandRevision[] } {
    const index = this.revisionLogs.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No history step with id ${id} - ${this.userId}`);
    }
    const indexTo = toId ? this.revisionLogs.findIndex((step) => step.id === toId) : undefined;
    if (indexTo === -1) {
      throw new Error(`No history step with id ${id} - ${this.userId}`);
    }
    const toRevert = indexTo ? this.revisionLogs.slice(index, indexTo) : this.revisionLogs.slice(index);
    const toUndo = toRevert.shift()!;
    if (!toUndo) {
      throw new Error("No revision to undo !");
    }
    return { toUndo, toRevert };
  }

  /**
   * Add a command to the current draft revision
   */
  addStep(command: CoreCommand) {
    this.currentDraftRevision?.addCommand(command);
  }

  private redoPendingUndo(pendingUndo: SelectiveUndoRevision) {
    this.dispatchCommands([...pendingUndo.commands], {
      clientId: pendingUndo.clientId,
      revisionId: pendingUndo.revertedRevisionId,
    });
  }

  private redo() {
    const lastUndoRevision = [...this.revisionLogs]
          .reverse()
          .filter((revision) => revision.isUndo && !revision.isCancelled)
          .find((step) => step.clientId === this.userId);
    if (!lastUndoRevision) {
      return;
    }
    lastUndoRevision.isCancelled = true;
    this.localSelectiveUndo(lastUndoRevision.id);
  }

  // ---------------------------------------------------------------------------
  // History helpers
  // ---------------------------------------------------------------------------

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

  /**
   * Apply the changes of the given HistoryChange to the state
   */
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
    if (this.currentDraftRevision) {
      this.currentDraftRevision.addChange({
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
