import * as owl from "@odoo/owl";
import { DEFAULT_REVISION_ID, MAX_HISTORY_STEPS } from "./constants";
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
  RemoteRevisionMessage,
  Revision,
  Session,
  UID,
  WorkbookData,
} from "./types";

/**
 * State Management System
 *
 * The State Management System is responsible of tracking the state updates.
 * It has two main goals:
 *  1. support the history (undo/redo)
 *  2. manage state replication
 *
 * This system works with Revisions.
 * Each revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
 * A revision contains the following informations:
 *  - id: ID of the transaction
 *  - commands: CoreCommands that are linked to the whole action, and should be
 *              dispatched in remote clients
 *  - clientId: Client who initiated the action
 *  - changes: List of changes applied on the state.
 *
 * For now, the undo redo is global, i.e. the undo stack and redo stack are shared
 * among all the clients. This is not optimal, but it's a first step.
 *
 */
export class StateManager extends owl.core.EventBus implements CommandHandler<Command> {
  /**
   * Draft revision on which the current commands and changes are added
   */
  private currentDraftRevision: DraftRevision | null = null;

  /**
   * All the revisions of the current session
   */
  private revisionLogs: Revision[] = [];

  private undoStack: UID[] = [];
  private redoStack: UID[] = [];

  /**
   * Id of the server revision
   */
  private revisionId: UID = DEFAULT_REVISION_ID;

  private session: Session | undefined;

  private isUndoRedoLocal: boolean = false;

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    collaborativeSession?: ModelConfig["collaborativeSession"]
  ) {
    super();
    this.session = collaborativeSession;
    if (this.session) {
      this.session.on("remote-revision-received", this, this.onRemoteRevisionReceived);
      this.session.on("revision-acknowledged", this, (revision: RemoteRevisionMessage) =>
        this.acknowledgeRevision(revision.newRevisionId)
      );
    }
  }

  get pendingRevisions(): readonly Revision[] {
    return this.revisionLogs.filter((revision) => !revision.isSynchronized());
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "UNDO":
        this.isUndoRedoLocal = true;
        return this.canUndo()
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
      case "REDO":
        this.isUndoRedoLocal = true;
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

  finalize() {
    this.isUndoRedoLocal = false;
  }

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
  withoutPendingRevisions(callback: () => CoreCommand[]) {
    const pendingRevisions = this.popPendingRevisions();
    const executedCommands = callback();
    for (const revision of pendingRevisions) {
      const { commands, id: revisionId, clientId } = revision;
      const transformedCommands = transformAll(commands, executedCommands);
      this.dispatchInNewRevision(transformedCommands, revisionId, clientId, {
        isSynced: false,
      });
    }
  }

  /**
   * Apply the given revisions
   */
  start(revisions: RemoteRevisionMessage[]) {
    for (const revision of revisions) {
      this.onRemoteRevisionReceived(revision);
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
      this.revisionLogs.push(this.currentDraftRevision);
      if (!this.currentDraftRevision.isUndo) {
        this.undoStack.push(this.currentDraftRevision.id);
        if (!this.currentDraftRevision.isRedo) {
          this.redoStack = [];
        }
        if (this.undoStack.length > MAX_HISTORY_STEPS) {
          this.undoStack.shift();
        }
      }
    }
    this.currentDraftRevision = null;
  }

  /**
   * Send the first pending revision
   */
  private sendPendingRevision() {
    if (this.pendingRevisions.length > 0) {
      const revision = this.pendingRevisions[0];
      if (revision && !revision.isSent() && this.session) {
        this.session.addRevision(revision.getMessage(this.revisionId));
        revision.setSent(true);
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
   * Called whenever a message is received from the network
   */
  onRemoteRevisionReceived(revisionData: RemoteRevisionMessage) {
    this.applyRemoteRevision(revisionData);
    this.revisionId = revisionData.newRevisionId;
    this.pendingRevisions.map((revision) => revision.setSent(false));
    this.sendPendingRevision();
  }

  /**
   * Apply the given revision on top of the undo stack
   * For that, we have to revert the pending revision,
   * effectively apply the remote revision and replay the pending revision
   * after transforming them through the applied revision
   */
  private applyRemoteRevision(revisionData: RemoteRevisionMessage) {
    const { newRevisionId, clientId, commands } = revisionData;
    const transformationCommands = commands;
    this.withoutPendingRevisions(() => {
      this.dispatchInNewRevision(commands, newRevisionId, clientId, {
        isSynced: true,
      });
      return transformationCommands;
    });
  }

  /**
   * Acknowledge the given revision ID
   */
  private acknowledgeRevision(revisionId: UID) {
    this.revisionId = revisionId;
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
      } else {
        for (let change of revision.changes) {
          applyChange(change, "after");
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
   * Get the revision to undo
   */
  private getUndoRevision(): Revision | undefined {
    if (this.isUndoRedoLocal) {
      const id = this.undoStack.pop();
      if (id) {
        return this.revisionLogs.find((rev) => rev.id === id);
      }
    } else {
      while (true) {
        const id = this.undoStack.pop();
        if (!id) {
          return undefined;
        }
        const revision = this.revisionLogs.find((rev) => rev.id === id);
        if (!revision) {
          return undefined;
        }
        if (revision.isSynchronized()) {
          return revision;
        }
      }
    }
    return undefined;
  }

  /**
   * Get the revision to redo
   */
  private getRedoRevision(): Revision | undefined {
    if (this.isUndoRedoLocal) {
      const id = this.redoStack.pop();
      if (id) {
        return this.revisionLogs.find((rev) => rev.id === id);
      }
    } else {
      while (true) {
        const id = this.redoStack.pop();
        if (!id) {
          return undefined;
        }
        const revision = this.revisionLogs.find((rev) => rev.id === id);
        if (!revision) {
          return undefined;
        }
        if (revision.isSynchronized()) {
          return revision;
        }
      }
    }
    return undefined;
  }

  /**
   * Apply an UNDO
   */
  private undo() {
    const revision = this.getUndoRevision();
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
    const revision = this.getRedoRevision();
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
  // Import - Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    this.revisionId = data.revisionId;
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
