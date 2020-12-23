import * as owl from "@odoo/owl";
import { DEFAULT_REVISION_ID, MAX_HISTORY_STEPS } from "./constants";
import { getDebugManager } from "./debug";
import { uuidv4 } from "./helpers/index";
import { inverseCommand } from "./helpers/inverse_commands";
import { applyChange, createEmptyStructure } from "./helpers/state_manager_helpers";
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
  CreateRevisionOptions,
  WorkbookData,
} from "./types/index";
import { ClientId, RemoteRevision, Message } from "./types/multi_users";

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

class Revision {
  public readonly id: UID;
  public readonly clientId: ClientId;
  protected _commands: CoreCommand[] = [];

  public isUndo: boolean = false; //TODO make it better
  public isRedo: boolean = false; //TODO make it better
  public isCancelled: boolean = false; //TODO make it better
  public toRevert: UID | undefined; //TODO make it better
  public isSync: boolean = false; //TODO Make it better
  protected _inverses: CoreCommand[] = [];
  protected _changes: HistoryChange[] = [];

  constructor(id: UID = uuidv4(), clientId: ClientId) {
    this.id = id;
    this.clientId = clientId;
  }

  get commands(): readonly CoreCommand[] {
    return this._commands;
  }

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
      isUndo: this.isUndo,
      isRedo: this.isRedo,
      toRevert: this.toRevert,
    };
  }
}

class DraftRevision extends Revision {
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
   * Draft revision on which the current commands and changes are added
   */
  private currentDraftRevision: DraftRevision | null = null;

  /**
   * All the revisions of the current session
   */
  private revisionLogs: Revision[] = [];

  /**
   * Id of the server revision
   */
  private revisionId: UID = DEFAULT_REVISION_ID;

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    protected readonly userId: UID,
    public exportData: () => WorkbookData = () => ({} as WorkbookData),
    protected network?: ModelConfig["network"]
  ) {
    super();
    if (network) {
      network.onNewMessage(this.userId, this.onMessageReceived.bind(this));
    }
  }

  get pendingRevisions(): readonly Revision[] {
    return this.revisionLogs.filter((revision) => !revision.isSync);
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
        this.undo();
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
    return !!this.getLastLocalRevision();
  }

  canRedo(): boolean {
    return !!this.getLastUndoRevision();
  }

  getUserId(): UID {
    return this.userId;
  }

  // ---------------------------------------------------------------------------
  // Revision Management
  // ---------------------------------------------------------------------------

  /**
   * Record the changes which could happen in the given callback and save them
   * in a revision.
   */
  recordChanges(callback: () => void, cmd: Command) {
    this.currentDraftRevision = new DraftRevision(uuidv4(), this.userId);
    if (cmd.type === "UNDO") {
      this.currentDraftRevision.isUndo = true;
    } else if (cmd.type === "REDO") {
      this.currentDraftRevision.isRedo = true;
    }
    callback();
    if (this.currentDraftRevision) {
      this.saveDraftRevision({ pending: !!this.network });
    }
  }

  private recordRemoteChanges(callback: () => void, id: UID, userId: UID) {
    // TODO refactor duplicated code
    this.currentDraftRevision = new DraftRevision(id, userId); //
    callback();
    if (this.currentDraftRevision) {
      this.saveDraftRevision({ pending: false });
    }
  }

  /**
   * Save the currentDraftRevision.
   */
  private saveDraftRevision({ pending }: { pending: boolean }) {
    if (!this.currentDraftRevision) {
      throw new Error("The currentDraftRevision is null !");
    }
    if (this.currentDraftRevision.hasChanges()) {
      this.revisionLogs.push(this.currentDraftRevision);
      //TODO Write tests with MAX_HISTORY_STEPS & MULTIUSER
      if (this.revisionLogs.length > MAX_HISTORY_STEPS) {
        this.revisionLogs.shift();
      }
      if (pending) {
        this.sendPendingRevision();
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
      // const hashed = hash(JSON.stringify(this.exportData())); //TODO Remove it
      this.network.sendMessage({ ...revision.getMessage(this.revisionId), hash: undefined });
    }
  }

  /**
   * Called whenever a message is received from the network
   */
  onMessageReceived(message: Message) {
    //TODO we should perhaps check that this.revisionId === message.revisionId to apply it
    // if (message.hash) {
    //   const current = hash(JSON.stringify(this.exportData()));
    //   if (current !== message.hash) {
    //     console.error("Invalid state detected 😱");
    //   }
    // }

    switch (message.type) {
      case "CONNECTION":
        for (let commandMessage of message.messages) {
          this.applyRemoteRevision(commandMessage);
        }
        break;
      case "REMOTE_REVISION":
        if (message.clientId === this.userId) {
          this.acknowledgeRevision(message.newRevisionId);
        } else {
          if (message.isUndo || message.isRedo) {
            this.recordRemoteChanges(
              () => this.selectiveUndo(message.toRevert!),
              message.newRevisionId,
              message.clientId
            ); //TODO remove "!"
          } else {
            this.applyRemoteRevision(message);
          }
        }
        break;
    }
    this.revisionId = message.newRevisionId;
    if (message.clientId !== this.userId) {
      this.trigger("remote-command-processed");
    }
    if (this.pendingRevisions.length > 0) {
      this.sendPendingRevision();
    }
  }

  /**
   * Acknowledge the given revision ID
   */
  private acknowledgeRevision(revisionId: UID) {
    const revision = this.revisionLogs.find((rev) => rev.id === revisionId);
    if (revision) {
      revision.isSync = true;
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
      this.revisionLogs.push(revision);
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
  private revert(revisions: readonly Revision[]) {
    for (const revision of revisions.slice().reverse()) {
      if (revision instanceof Revision) {
        for (let i = revision.changes.length - 1; i >= 0; i--) {
          applyChange(revision.changes[i], "before");
          if (this.currentDraftRevision) {
            const changes = revision.changes[i];
            this.currentDraftRevision.addChange({
              ...changes,
              before: changes.after,
              after: changes.before,
            });
          }
        }
      }
    }
  }

  /**
   * 🍌
   */
  private applyCommandsOnRevision(
    revision: DraftRevision,
    commands: CoreCommand[]
  ): Revision | undefined {
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
  private transformAndReplay(deletedCommands: CoreCommand[], revisions: Revision[]) {
    const executedCommands = [...deletedCommands]; //TODO Check spread
    const commands: CoreCommand[] = [];
    for (const revision of revisions) {
      if (revision.isUndo) {
        // this.localSelectiveUndo(revision.toRevert!, revision.id); //TODO make it better
      } else {
        const transformed: CoreCommand[] = [];
        for (let executed of executedCommands) {
          transformed.push(...transformAll(revision.commands, executed));
        }
        if (!revision.isCancelled) {
          commands.push(...transformed);
        }
        executedCommands.push(...transformed);
      }
    }
    commands.map((cmd) => this.dispatch(cmd.type, cmd));
  }

  /**
   * Replay the pending revisions after having having transform them through the
   * incorporated commands.
   *
   * @param incorporatedCommands Commands which have been included before the revisions to play
   */
  private transformAndReplayPendingRevisions(incorporatedCommands: CoreCommand[]) {
    
  }

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  private undo() {
    const revision = this.getLastLocalRevision();
    if (revision) {
      this.currentDraftRevision!.toRevert = revision.id; //TODO Make it better
      revision.isCancelled = true;
      this.selectiveUndo(revision.id);
      this.sendPendingRevision();
    } else {
      // This is false, we have to send it, in case of a redo...
      const pending = this.pendingRevisions.pop();
      if (pending) {
        this.revert([pending]);
      }
    }
  }

  private redo() {
    const lastUndoRevision = this.getLastUndoRevision();
    if (!lastUndoRevision) {
      return;
    }
    lastUndoRevision.isCancelled = true;
    this.currentDraftRevision!.isRedo = true; //TODO Make it better
    this.currentDraftRevision!.toRevert = lastUndoRevision.id; //TODO Make it better
    this.selectiveUndo(lastUndoRevision.id);
  }

  private getLastUndoRevision(): Revision | undefined {
    for (let i = this.revisionLogs.length - 1; i >= 0; i--) {
      const log = this.revisionLogs[i];
      if (log.clientId !== this.userId) {
        continue;
      }
      if (!log.isUndo && !log.isRedo) {
        return undefined;
      }
      if (log.isUndo && !log.isCancelled) {
        return log;
      }
    }
    return undefined;
  }

  private getLastLocalRevision(): Revision | undefined {
    return [...this.revisionLogs]
      .reverse()
      .filter((revision) => !revision.isUndo && !revision.isCancelled)
      .find((step) => step.clientId === this.userId);
  }

  /**
   * Undo a local revision.
   * 1) Revert the state to the revisionToUndo
   * 2) Transform all the reverted revisions with the inverse of revisionToUndo
   * 3) Replay these transformed revisions
   * 4) If the network is active, send it.
   *
   */
  private selectiveUndo(revertedRevisionId: UID, revertedToRevisionId?: UID) {
    const { toUndo, toRevert: toRevertAndReplay } = this.getSelectiveUndoRevisions(
      revertedRevisionId,
      revertedToRevisionId
    );
    this.revert([toUndo, ...toRevertAndReplay]); // Attention, revert un selectiveUndo refait une revision
    this.transformAndReplay(toUndo.inverses, toRevertAndReplay);
  }

  /**
   * Get the revision to undo and the revisions to revert.
   */
  private getSelectiveUndoRevisions(
    id: UID,
    toId?: UID
  ): { toUndo: Revision; toRevert: Revision[] } {
    const revisions = [...this.revisionLogs, ...this.pendingRevisions];
    const index = revisions.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No history step with id ${id} - ${this.userId}`);
    }
    const indexTo = toId ? revisions.findIndex((step) => step.id === toId) : undefined;
    if (indexTo === -1) {
      throw new Error(`No history step with id ${id} - ${this.userId}`);
    }
    const toRevert = indexTo ? revisions.slice(index, indexTo) : revisions.slice(index);
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
  // History helpers
  // ---------------------------------------------------------------------------

  updateStateFromRoot(...args: any[]) {
    const val: any = args.pop();
    const [root, ...path] = args as [any, string | number];
    let value = root as any;
    let key = path[path.length - 1];
    for (let pathIndex = 0; pathIndex <= path.length - 2; pathIndex++) {
      const p = path[pathIndex];
      if (value[p] === undefined) {
        const nextPath = path[pathIndex + 1];
        value[p] = createEmptyStructure(nextPath);
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
