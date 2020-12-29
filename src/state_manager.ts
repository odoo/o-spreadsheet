import * as owl from "@odoo/owl";
import { DEFAULT_REVISION_ID, MAX_HISTORY_STEPS } from "./constants";
import { uuidv4 } from "./helpers/index";
import { inverseCommand } from "./helpers/inverse_commands";
import { applyChange, createEmptyStructure } from "./helpers/state_manager_helpers";
import { ModelConfig } from "./model";
import { LocalSession } from "./collaborative/local_session";
import { transformAll } from "./collaborative/ot/ot";
import {
  Command,
  CommandHandler,
  CommandResult,
  CancelledReason,
  CoreCommand,
  CommandDispatcher,
  UID,
  HistoryChange,
  WorkbookData,
} from "./types/index";
import { ClientId, RemoteRevisionData, Session, Client } from "./types/multi_users";

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

  public isRedo: boolean = false; //TODO make it better
  public toRevert: UID | undefined; //TODO make it better
  public isSync: boolean = false; //TODO Make it better
  protected _inverses: CoreCommand[] = [];
  protected _changes: HistoryChange[] = [];

  constructor(id: UID = uuidv4(), clientId: ClientId) {
    this.id = id;
    this.clientId = clientId;
  }

  get isUndo(): boolean {
    return !!this.toRevert;
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

  isCancelledBy(revisions: Revision[]): boolean {
    return revisions.some((revision) => revision.toRevert === this.id);
  }

  getMessage(revisionId: UID): RemoteRevisionData {
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
    // TODO make it better
    if (!this.isUndo || command.type === "SELECTIVE_UNDO") {
      this._commands.push(command);
      if (command.type !== "SELECTIVE_UNDO") {
        this._inverses.push(...inverseCommand(command));
      }
    }
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

  private session: Session;

  constructor(
    protected dispatch: CommandDispatcher["dispatch"],
    collaborativeSession?: ModelConfig["collaborativeSession"]
  ) {
    super();
    this.session = collaborativeSession || new LocalSession();
    this.session.on("remote-revision-received", this, this.onRemoteRevisionReceived);
    this.session.on("revision-acknowledged", this, (revision: RemoteRevisionData) =>
      this.acknowledgeRevision(revision.newRevisionId)
    );
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
      case "SELECTIVE_UNDO":
        this.currentDraftRevision!.toRevert = cmd.revisionId; //TODO Make it better
        const revision = this.revisionLogs.find((revision) => revision.id === cmd.revisionId);
        if (revision) {
          this.selectiveUndo(revision.id);
          this.sendPendingRevision();
        } else {
          // TODO We could perhaps remove it
          throw new Error("There is no revision linked to this SELECTIVE_UNDO !");
        }
        break;
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

  getUserId(): ClientId {
    return this.session.getClient().id || "local";
  }

  getConnectedClients(): Set<Client> {
    return this.session.getConnectedClients();
  }

  getRevisionLogs(): Revision[] {
    return this.revisionLogs;
  }

  // ---------------------------------------------------------------------------
  // Revision Management
  // ---------------------------------------------------------------------------

  /**
   * Record the changes which could happen in the given callback and save them
   * in a revision.
   */
  recordChanges(callback: () => void) {
    this.currentDraftRevision = new DraftRevision(uuidv4(), this.getUserId());
    this.currentDraftRevision.isSync = !this.session;
    callback();
    if (this.currentDraftRevision) {
      this.saveDraftRevision();
    }
    this.sendPendingRevision();
  }

  private _recordChanges(
    id: UID,
    userId: UID,
    { isSynced }: { isSynced: boolean },
    callback: () => void
  ) {
    if (this.currentDraftRevision !== null) {
      throw new Error("Changes are already being recorded!");
    }
    // TODO refactor duplicated code
    this.currentDraftRevision = new DraftRevision(id, userId); //
    this.currentDraftRevision.isSync = isSynced || !this.session;
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
      //TODO Write tests with MAX_HISTORY_STEPS & MULTIUSER
      if (this.revisionLogs.length > MAX_HISTORY_STEPS) {
        this.revisionLogs.shift();
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
    if (this.pendingRevisions.length > 0) {
      const revision = this.pendingRevisions[0];
      if (revision) {
        this.session.addRevision(revision.getMessage(this.revisionId));
      }
    }
  }

  /**
   * Called whenever a cell is selected
   */
  selectCell(sheetId: UID, col: number, row: number) {
    this.session.move({ sheetId, col, row });
  }

  /**
   * Called whenever a message is received from the network
   */
  onRemoteRevisionReceived(revisionData: RemoteRevisionData) {
    this.applyRemoteRevision(revisionData);
    this.revisionId = revisionData.newRevisionId;
    this.sendPendingRevision();
  }

  /**
   * Apply the given revision on top of the undo stack
   * For that, we have to revert the pending revision,
   * effectively apply the remote revision and replay the pending revision
   * after transforming them through the applied revision
   */
  private applyRemoteRevision(revisionData: RemoteRevisionData) {
    const { newRevisionId, clientId, commands, toRevert } = revisionData;
    const revertedRevision = this.revisionLogs.find((revision) => revision.id === toRevert);
    const transformationCommands = revertedRevision ? [...revertedRevision.inverses] : commands;
    this.withoutPendingRevisions(() => {
      this.dispatchInNewRevision(commands, newRevisionId, clientId, { isSynced: true });
      return transformationCommands;
    });
  }

  /**
   * Acknowledge the given revision ID
   */
  private acknowledgeRevision(revisionId: UID) {
    this.revisionId = revisionId;
    const revision = this.revisionLogs.find((rev) => rev.id === revisionId);
    if (revision) {
      revision.isSync = true;
    }
    this.sendPendingRevision();
  }

  private dispatchInNewRevision(
    commands: readonly CoreCommand[],
    revisionId: UID,
    userId: UID,
    { isSynced }: { isSynced: boolean }
  ) {
    this._recordChanges(revisionId, userId, { isSynced }, () => {
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
    this.revisionLogs = this.revisionLogs.filter((revision) => revision.isSync);
    return pendingRevisions;
  }

  /**
   * Revert changes from the given revisions
   */
  private revertChanges(revisions: readonly Revision[]) {
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

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  private undo() {
    const revision = this.getLastLocalRevision();
    if (revision) {
      this.dispatch("SELECTIVE_UNDO", { revisionId: revision.id });
    }
  }

  private redo() {
    const lastUndoRevision = this.getLastUndoRevision();
    if (!lastUndoRevision) {
      return;
    }
    this.currentDraftRevision!.isRedo = true; //TODO Make it better

    this.dispatch("SELECTIVE_UNDO", { revisionId: lastUndoRevision.id });
  }

  private getLastUndoRevision(): Revision | undefined {
    for (let i = this.revisionLogs.length - 1; i >= 0; i--) {
      const log = this.revisionLogs[i];
      if (log.clientId !== this.getUserId()) {
        continue;
      }

      // redo is only allowed if no other operation between undo et redo
      if (!log.isUndo && !log.isRedo) {
        return undefined;
      }

      if (log.isUndo && !log.isRedo && !log.isCancelledBy(this.revisionLogs)) {
        return log;
      }
    }
    return undefined;
  }

  private getLastLocalRevision(): Revision | undefined {
    return [...this.revisionLogs]
      .reverse()
      .filter(
        (revision) =>
          (revision.isRedo || !revision.isUndo) && !revision.isCancelledBy(this.revisionLogs)
      )
      .find((step) => step.clientId === this.getUserId());
  }

  /**
   * Undo a local revision.
   * 1) Revert the state to the revisionToUndo
   * 2) Transform all the reverted revisions with the inverse of revisionToUndo
   * 3) Replay these transformed revisions
   *
   */
  private selectiveUndo(revertedRevisionId: UID) {
    const { toUndo, toRevert: toRevertAndReplay } = this.getSelectiveUndoRevisions(
      revertedRevisionId
    );
    this.revertChanges([toUndo, ...toRevertAndReplay]);
    this.transformAndApply(toUndo.inverses, toRevertAndReplay);
  }

  // TODO rename deletedCommands
  private transformAndApply(deletedCommands: CoreCommand[], revisions: Revision[]) {
    const executedCommands = [...deletedCommands]; //TODO Check if spread is needed
    const commands: CoreCommand[] = [];
    for (const revision of revisions) {
      if (revision.isUndo) {
        if (revisions.findIndex((rev) => rev.id === revision.toRevert) === -1) {
          commands.push(...revision.commands);
        }
      }
      if (!revision.isCancelledBy(revisions)) {
        commands.push(...transformAll(revision.commands, executedCommands));
      }
    }
    commands.forEach((cmd) => this.dispatch(cmd.type, cmd));
  }

  /**
   * Get the revision to undo and the revisions to revert.
   */
  private getSelectiveUndoRevisions(id: UID): { toUndo: Revision; toRevert: Revision[] } {
    const revisions = [...this.revisionLogs];
    const index = revisions.findIndex((step) => step.id === id);
    if (index === -1) {
      throw new Error(`No history step with id ${id} - ${this.getUserId()}`);
    }
    const toRevert = revisions.slice(index);
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
   * TODO
   * If any command was dispatched in the callback execution,
   * it must return them to ensure pending revisions are correcly
   * re-applied.
   */
  withoutPendingRevisions(callback: () => CoreCommand[] | void) {
    const pendingRevisions = this.popPendingRevisions();

    const executedCommands = callback();

    for (const revision of pendingRevisions) {
      const { commands, id: revisionId, clientId } = revision;
      const transformedCommands = transformAll(commands, executedCommands || []);
      this.dispatchInNewRevision(transformedCommands, revisionId, clientId, {
        isSynced: false,
      });
    }
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
