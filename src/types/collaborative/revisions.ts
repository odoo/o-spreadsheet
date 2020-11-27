import { UID, CoreCommand, HistoryStep, HistoryChange } from "..";
import { uuidv4 } from "../../helpers";
import { ClientId } from "./session";

export interface RevisionData {
  readonly id: UID;
  readonly clientId: ClientId;
  readonly commands: readonly CoreCommand[];
}

export class Revision implements RevisionData {
  public readonly id: UID;
  public readonly clientId: ClientId;
  protected _commands: CoreCommand[] = [];

  protected isSync: boolean;
  public isSent: boolean = false;
  protected _changes: HistoryStep = [];

  /**
   * A revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
   * A revision contains the following informations:
   *  - id: ID of the revision
   *  - commands: CoreCommands that are linked to the action, and should be
   *              dispatched in other clients
   *  - clientId: Client who initiated the action
   *  - changes: List of changes applied on the state.
   */
  constructor(
    id: UID = uuidv4(),
    clientId: ClientId,
    { isSync, commands }: { isSync?: boolean; commands?: readonly CoreCommand[] } = {}
  ) {
    this.id = id;
    this.clientId = clientId;
    this.isSync = isSync || false;
    this._commands = commands ? [...commands] : [];
  }

  get isUndo(): boolean {
    return this._commands.length === 1 && this._commands[0].type === "UNDO";
  }

  get isRedo(): boolean {
    return this._commands.length === 1 && this._commands[0].type === "REDO";
  }

  get commands(): readonly CoreCommand[] {
    return this._commands;
  }

  get changes() {
    return [...this._changes];
  }

  acknowledge() {
    this.isSync = true;
  }

  isSynchronized(): boolean {
    return this.isSync;
  }
}

export class DraftRevision extends Revision {
  addCommand(command: CoreCommand) {
    this._commands.push(command);
  }

  addChange(change: HistoryChange) {
    this._changes.push(change);
  }

  hasChanges(): boolean {
    return this._changes.length > 0;
  }
}
