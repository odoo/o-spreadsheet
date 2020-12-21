import { CoreCommand } from "./commands";
import { UID } from "./misc";

export type ClientId = string;

export interface RevisionData {
  readonly id: UID;
  readonly clientId: ClientId;
  readonly commands: readonly CoreCommand[];
}

export interface BaseMessage {
  clientId: ClientId;
  newRevisionId: UID;
}

export interface RemoteRevision extends BaseMessage {
  type: "REMOTE_REVISION";
  readonly commands: CoreCommand[];
  revisionId: UID;
}

export interface ConnectionMessage extends BaseMessage {
  type: "CONNECTION";
  messages: RemoteRevision[];
}

export interface RemoteUndo extends BaseMessage {
  type: "REMOTE_UNDO";
  revisionToRollback: UID;
  toReplay: RevisionData[];
  revisionId: UID;
}

export type Message = RemoteRevision | RemoteUndo | ConnectionMessage;

export type NewMessageCallback = (message: Message) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}
