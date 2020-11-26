import { UID, CoreCommand, HistoryStep, HistoryChange } from ".";
import { uuidv4 } from "../helpers";
import { ClientId, RemoteRevisionMessage } from "./multi_users";

export class Revision {
  public readonly id: UID;
  public readonly clientId: ClientId;
  protected _commands: CoreCommand[] = [];

  protected _isSync: boolean;
  protected _isSent: boolean = false; //TODO Make it better
  protected _changes: HistoryStep = [];

  constructor(id: UID = uuidv4(), clientId: ClientId, { isSync }: { isSync?: boolean } = {}) {
    this.id = id;
    this.clientId = clientId;
    this._isSync = isSync || false;
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

  isSent(): boolean {
    return this._isSent;
  }

  setSent(sent: boolean) {
    this._isSent = sent;
  }

  acknowledge() {
    this._isSync = true;
  }

  isSynchronized(): boolean {
    return this._isSync;
  }

  getMessage(revisionId: UID): RemoteRevisionMessage {
    return {
      type: "REMOTE_REVISION",
      clientId: this.clientId,
      revisionId,
      commands: this._commands,
      newRevisionId: this.id,
    };
  }
}

export class DraftRevision extends Revision {
  addCommand(command: CoreCommand) {
    this._commands.push(command);
  }

  addChange(change: HistoryChange) {
    this._changes.push(change);
  }

  public hasChanges(): boolean {
    return this._changes.length > 0;
  }
}
