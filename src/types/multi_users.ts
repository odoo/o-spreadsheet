import { EventBus } from "../helpers/event_bus";
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
}

export interface RemoteRevisionMessage extends BaseMessage {
  type: "REMOTE_REVISION";
  readonly commands: CoreCommand[];
  revisionId: UID;
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
  | RemoteRevisionMessage
  | ClientMovedMessage
  | ClientJoinedMessage
  | ClientLeftMessage;

export type NewMessageCallback = (message: Message) => void;
export type NewRevisionCallback = (revision: RemoteRevisionMessage) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}

export interface Session extends EventBus<CollaborativeEvent> {
  addRevision: (revision: RemoteRevisionMessage) => void;
  move: (position: ClientPosition) => void;
  leave: () => void;
  getClient: () => Client;
  getConnectedClients: () => Set<Client>;
}

export interface RemoteRevisionReceivedEvent extends Omit<RemoteRevisionMessage, "type"> {
  type: "remote-revision-received";
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
