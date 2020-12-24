import { CoreCommand } from "./commands";
import { UID } from "./misc";

export type ClientId = string;
export interface Client {
  id: ClientId;
  name: string;
  position?: ClientPosition;
}

export interface ClientPosition {
  sheetId: UID;
  col: number;
  row: number;
}

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

// TODO only used in o-spreadsheet for test => remote it
export interface ConnectionMessage extends BaseMessage {
  type: "CONNECTION";
  messages: RemoteRevisionData[];
}

export interface ClientJoinedMessage {
  type: "CLIENT_JOINED";
  position: ClientPosition;
  client: Client;
}

export interface ClientLeftMessage {
  type: "CLIENT_LEFT";
  clientId: ClientId;
}

export interface ClientMovedMessage {
  type: "CLIENT_MOVED";
  client: Client;
  position: ClientPosition;
}

export type Message =
  | RemoteRevisionData
  | ConnectionMessage
  | ClientMovedMessage
  | ClientJoinedMessage
  | ClientLeftMessage;

export type NewMessageCallback = (message: Message) => void;
export type NewRevisionCallback = (revision: RemoteRevisionData) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}

export interface CollaborativeSession extends CollaborativeEventBus {
  addRevision: (revision: RemoteRevisionData) => void;
  move: (position: ClientPosition) => void;
  leave: () => void;
  getClient: () => Client;
  getConnectedClients: () => Set<Client>;
}

export interface RemoteRevisionReceivedEvent {
  type: "remote-revision-received";
  revision: RemoteRevisionData;
}

export interface RevisionAcknowledgedEvent {
  type: "revision-acknowledged";
  revisionId: UID;
}

export interface MessageReceivedEvent {
  type: "message-received";
}

export type CollaborativeEvent =
  | RemoteRevisionReceivedEvent
  | RevisionAcknowledgedEvent
  | MessageReceivedEvent;
export type CollaborativeEventTypes = CollaborativeEvent["type"];
export interface CollaborativeEventBus {
  on<T extends CollaborativeEventTypes, E extends Extract<CollaborativeEvent, { type: T }>>(
    type: T,
    owner: any,
    callback: (r: Omit<E, "type">) => void
  ): void;
  trigger<T extends CollaborativeEventTypes, E extends Extract<CollaborativeEvent, { type: T }>>(
    type: T
  ): void;
  trigger<T extends CollaborativeEventTypes, E extends Extract<CollaborativeEvent, { type: T }>>(
    type: T,
    r: Omit<E, "type">
  ): void;
}
