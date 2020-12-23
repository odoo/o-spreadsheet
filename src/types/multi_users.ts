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
  hash?: number; // TODO Remove Debug informations
}

export interface RemoteRevisionData extends BaseMessage {
  type: "REMOTE_REVISION";
  readonly commands: CoreCommand[];
  isUndo: boolean;
  isRedo: boolean;
  toRevert?: UID;
  revisionId: UID;
}

export interface ConnectionMessage extends BaseMessage {
  type: "CONNECTION";
  messages: RemoteRevisionData[];
}

export interface SelectCellMessage {
  type: "SELECT_CELL";
  col: number;
  row: number;
  sheetId: UID;
  clientId: UID;
  clientName: string;
}

export type Message = RemoteRevisionData | ConnectionMessage | SelectCellMessage;

export type NewMessageCallback = (message: Message) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}
