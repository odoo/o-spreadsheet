import * as owl from "@odoo/owl";
import { MAX_HISTORY_STEPS } from "./constants";
import { uuidv4 } from "./helpers/index";
import { applyChange, createEmptyStructure } from "./helpers/state_manager_helpers";
import { ModelConfig } from "./model";
import { transformAll } from "./collaborative/ot/ot";
import {
  CancelledReason,
  Client,
  ClientId,
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  CoreCommand,
  DraftRevision,
  Revision,
  Session,
  UID,
} from "./types";

/**
 * History
 *
 * The History is responsible of tracking the state updates.
 * It has two main goals:
 *  1. support the history (undo/redo)
 *  2. manage state replication to other clients connected in the context of
 *     a collaborative session.
 *
 * This system works with Revisions.
 * Concurrency between revisions is managed with the Operational Transform approach.
 *
 * For now, the undo redo is global, i.e. the undo stack and redo stack are shared
 * among all the clients. This is not optimal, but it's a first step.
 *
 */
export class History extends owl.core.EventBus implements CommandHandler<Command> {
  /**
   * Draft revision on which the current commands and changes are added
   */
  private currentDraftRevision: DraftRevision | null = null;

  /**
   * All the revisions of the current session
   */
  private revisionLogs: Revision[] = [];

  /**
   * Ids of the revisions which can be undone
   */
  private undoStack: UID[] = [];

  /**
   * Ids of the revisions which can be redone
   */
  private redoStack: UID[] = [];

  private session: Session | undefined;

  /**
   * Flag used to block all commands when an undo or redo is triggered, until
   * it is accepted on the server
   */
  private shouldCancelAllCommands: boolean = false;

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    collaborativeSession?: ModelConfig["collaborativeSession"]
  ) {
    super();
    this.session = collaborativeSession;
    if (this.session) {
      this.session.on("remote-revision-received", this, this.onRemoteRevisionReceived);
      this.session.on("revision-acknowledged", this, this.onRevisionAcknowledged);
    }
  }

  get pendingRevisions(): readonly Revision[] {
    return this.revisionLogs.filter((revision) => !revision.isSynchronized());
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    if (this.shouldCancelAllCommands) {
      return { status: "CANCELLED", reason: CancelledReason.WaitingForNetwork };
    }
    switch (cmd.type) {
      case "UNDO":
        if (!this.canUndo()) {
          return { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
        }
        break;
      case "REDO":
        if (!this.canRedo()) {
          return { status: "CANCELLED", reason: CancelledReason.EmptyRedoStack };
        }
        break;
    }
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
        if (this.session) {
          this.shouldCancelAllCommands = true;
          const revision = new DraftRevision(uuidv4(), this.getUserId());
          revision.addCommand(cmd);
          this.saveDraftRevision(revision);
          this.sendPendingRevision();
          return { status: "CANCELLED", reason: CancelledReason.WaitingForNetwork };
        }
        break;
    }
    return { status: "SUCCESS" };
  }

  beforeHandle() {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
        this.shouldCancelAllCommands = false;
        this.undo();
        break;
      case "REDO":
        this.shouldCancelAllCommands = false;
        this.redo();
        break;
    }
  }

  finalize() {}

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUserId(): ClientId {
    return this.session?.getClient().id || "local";
  }

  getConnectedClients(): Set<Client> {
    return this.session?.getConnectedClients() || new Set();
  }

  /**
   * Only for debug purposes.
   * Should it be publicly exposed?
   */
  getRevisionLogs(): Revision[] {
    return this.revisionLogs;
  }

  // ---------------------------------------------------------------------------
  // Revision Management
  // ---------------------------------------------------------------------------

  /**
   * Add a command to the current draft revision
   */
  addStep(command: CoreCommand) {
    this.currentDraftRevision?.addCommand(command);
  }

  /**
   * Execute the given callback after having remove the pending transactions.
   * After the execution of the callback, re-apply the pending transactions, by
   * transforming their commands with the result of the callback.
   */
  withoutPendingRevisions(callback: () => readonly CoreCommand[]) {
    const pendingRevisions = this.popPendingRevisions();
    const executedCommands = callback();
    for (const revision of pendingRevisions) {
      if (revision.isUndo || revision.isRedo) {
        const newRev = new DraftRevision(uuidv4(), this.getUserId());
        newRev.addCommand(revision.commands[0]);
        this.saveDraftRevision(newRev);
      } else {
        const { commands, id: revisionId, clientId } = revision;
        const transformedCommands = transformAll(commands, executedCommands);
        this.dispatchInNewRevision(transformedCommands, revisionId, clientId, {
          isSynced: false,
        });
      }
    }
  }

  /**
   * Record the changes which could happen in the given callback, save them in a
   * new revision and send it
   */
  recordChanges(callback: () => void) {
    this._recordChanges(uuidv4(), this.getUserId(), { isSynced: !this.session }, callback);
    this.sendPendingRevision();
  }

  /**
   * Record the changes which could happen in the given callback, save them in a
   * new revision with the given id and userId.
   */
  private _recordChanges(
    id: UID,
    userId: UID,
    { isSynced }: { isSynced: boolean },
    callback: () => void
  ) {
    this.currentDraftRevision = new DraftRevision(id, userId, {
      isSync: isSynced || !this.session,
    });
    callback();
    if (this.currentDraftRevision && this.currentDraftRevision.hasChanges()) {
      this.saveDraftRevision(this.currentDraftRevision);
      this.currentDraftRevision = null;
    }
  }

  /**
   * Save the currentDraftRevision.
   */
  private saveDraftRevision(revision: DraftRevision) {
    this.revisionLogs.push(revision);
    if (!revision.isUndo) {
      this.undoStack.push(revision.id);
      if (!revision.isRedo) {
        this.redoStack = [];
      }
      if (this.undoStack.length > MAX_HISTORY_STEPS) {
        this.undoStack.shift();
      }
    }
  }

  /**
   * Send the first pending revision
   */
  private sendPendingRevision() {
    if (this.pendingRevisions.length > 0) {
      const revision = this.pendingRevisions[0];
      if (revision && !revision.isSent && this.session) {
        this.session.addRevision(revision);
        revision.isSent = true;
      }
    }
  }

  /**
   * Called whenever a cell is selected
   */
  selectCell(sheetId: UID, col: number, row: number) {
    this.session?.move({ sheetId, col, row });
  }

  /**
   * Called whenever a revision is received from the collaborative
   * session
   */
  private onRemoteRevisionReceived(revision: Revision) {
    this.applyRemoteRevision(revision);
    this.pendingRevisions.map((revision) => (revision.isSent = false));
    this.sendPendingRevision();
  }

  /**
   * Called whenever a revision from this client is received from the
   * collaborative session. If the revision is an undo or redo, the corresponding
   * action should be executed.
   */
  private onRevisionAcknowledged(revision: Revision) {
    if (["UNDO", "REDO"].includes(revision.commands[0].type)) {
      this.revisionLogs = this.revisionLogs.filter((rev) => rev.id !== revision.id);
      this.onRemoteRevisionReceived(revision);
    } else {
      this.acknowledgeRevision(revision.id);
    }
  }

  /**
   * Apply the given revision on top of the undo stack
   * For that, we have to revert the pending revision,
   * effectively apply the remote revision and replay the pending revision
   * after transforming them through the applied revision
   */
  private applyRemoteRevision(revision: Revision) {
    const { id, clientId, commands } = revision;
    const transformationCommands = commands;
    this.withoutPendingRevisions(() => {
      this.dispatchInNewRevision(commands, id, clientId, {
        isSynced: true,
      });
      return transformationCommands;
    });
  }

  /**
   * Acknowledge the given revision ID
   */
  private acknowledgeRevision(revisionId: UID) {
    const revision = this.revisionLogs.find((rev) => rev.id === revisionId);
    revision?.acknowledge();
    this.sendPendingRevision();
  }

  /**
   * Dispatch the given commands in a new revision, with the given revisionId
   * and clientId
   */
  private dispatchInNewRevision(
    commands: readonly CoreCommand[],
    revisionId: UID,
    clientId: UID,
    { isSynced }: { isSynced: boolean }
  ) {
    this._recordChanges(revisionId, clientId, { isSynced }, () => {
      for (let cmd of commands) {
        this.dispatch(cmd.type, cmd);
      }
    });
  }

  /**
   * Revert changes from pending revisions.
   * Remove them from the revision log and return them.
   */
  private popPendingRevisions(): readonly Revision[] {
    const pendingRevisions = this.pendingRevisions;
    this.revertChanges(pendingRevisions);
    this.revisionLogs = this.revisionLogs.filter((revision) => revision.isSynchronized());
    const ids = this.revisionLogs.map((rev) => rev.id);
    this.undoStack = this.undoStack.filter((id) => ids.includes(id));
    this.redoStack = this.redoStack.filter((id) => ids.includes(id));
    return pendingRevisions;
  }

  /**
   * Revert changes from the given revisions
   */
  private revertChanges(revisions: readonly Revision[]) {
    for (const revision of revisions.slice().reverse()) {
      if (!revision.isUndo) {
        for (let i = revision.changes.length - 1; i >= 0; i--) {
          const change = revision.changes[i];
          applyChange(change, "before");
          if (this.currentDraftRevision) {
            this.currentDraftRevision.addChange(change);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  /**
   * Apply an UNDO
   */
  private undo() {
    const id = this.undoStack.pop();
    if (!id) {
      return;
    }
    const revision = this.revisionLogs.find((rev) => rev.id === id);
    if (!revision) {
      return;
    }
    this.revertChanges([revision]);

    this.redoStack.push(revision.id);
  }

  /**
   * Apply a REDO
   */
  private redo() {
    const id = this.redoStack.pop();
    if (!id) {
      return;
    }
    const revision = this.revisionLogs.find((rev) => rev.id === id);
    if (!revision) {
      return;
    }
    for (let change of revision.changes) {
      applyChange(change, "after");
      if (this.currentDraftRevision) {
        this.currentDraftRevision.addChange(change);
      }
    }
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
