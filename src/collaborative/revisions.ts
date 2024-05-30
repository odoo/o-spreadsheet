import { ClientId, Command, CoreCommand, HistoryChange, RevisionData, UID } from "../types";

export class Revision implements RevisionData {
  public readonly id: UID;
  public readonly clientId: ClientId;
  private _commands: readonly CoreCommand[] = [];
  private _changes: readonly HistoryChange[] = [];

  /**
   * A revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
   * A revision contains the following information:
   *  - id: ID of the revision
   *  - commands: CoreCommands that are linked to the action, and should be
   *              dispatched in other clients
   *  - clientId: Client who initiated the action
   *  - changes: List of changes applied on the state.
   */
  constructor(
    id: UID,
    clientId: ClientId,
    commands: readonly CoreCommand[],
    readonly rootCommands?: Command[],
    changes?: readonly HistoryChange[],
    readonly timestamp?: number
  ) {
    this.id = id;
    this.clientId = clientId;
    this._commands = [...commands];
    this._changes = changes ? [...changes] : [];
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
