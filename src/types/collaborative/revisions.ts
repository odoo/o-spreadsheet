import { UID, CoreCommand, HistoryChange } from "..";
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
  private _commands: readonly CoreCommand[] = [];
  private _changes: readonly HistoryChange[] = [];

  public isSent: boolean = false;

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
    commands: readonly CoreCommand[],
    changes?: readonly HistoryChange[]
  ) {
    this.id = id;
    this.clientId = clientId;
    this._commands = [...commands];
    this._changes = changes ? [...changes] : [];
  }

  get isUndo(): boolean {
    return false;
    // return this._commands.length === 1 && this._commands[0].type === "UNDO";
  }

  get isRedo(): boolean {
    return false;
    // return this._commands.length === 1 && this._commands[0].type === "REDO";
  }

  setCommands(commands: readonly CoreCommand[]) {
    this._commands = commands;
  }

  setChanges(changes: readonly HistoryChange[]) {
    this._changes = changes;
  }

  get commands(): readonly CoreCommand[] {
    return this._commands;
  }

  get changes(): readonly HistoryChange[] {
    return this._changes;
  }
}
