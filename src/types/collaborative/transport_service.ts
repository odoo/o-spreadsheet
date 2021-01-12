import { RevisionData } from "..";
import { UID } from "../misc";
import { Client, ClientId } from "./session";

export interface RemoteRevisionMessage {
  type: "REMOTE_REVISION";
  revision: RevisionData;
  nextRevisionId: UID;
  serverRevisionId: UID;
}

export interface RevisionUndoneMessage {
  type: "REVISION_UNDONE";
  undoneRevisionId: UID;
  nextRevisionId: UID;
  serverRevisionId: UID;
}

export interface RevisionRedoneMessage {
  type: "REVISION_REDONE";
  redoneRevisionId: UID;
  nextRevisionId: UID;
  serverRevisionId: UID;
}

export interface ClientJoinedMessage {
  type: "CLIENT_JOINED";
  client: Required<Client>;
}

export interface ClientLeftMessage {
  type: "CLIENT_LEFT";
  clientId: ClientId;
}

export interface ClientMovedMessage {
  type: "CLIENT_MOVED";
  client: Required<Client>;
}

export type CollaborationMessage =
  | RevisionUndoneMessage
  | RevisionRedoneMessage
  | RemoteRevisionMessage
  | ClientMovedMessage
  | ClientJoinedMessage
  | ClientLeftMessage;

export type StateUpdateMessage = Extract<CollaborationMessage, { nextRevisionId: UID }>;

export type NewMessageCallback<T = any> = (message: T) => void;

/**
 * The transport service allows to communicate between multiple clients.
 * A client can send any message to others.
 * The service will handle all networking details internally.
 */
export interface TransportService<T = any> {
  /**
   * Send a message to all clients
   */
  sendMessage: (message: T) => void;
  /**
   * Register a callback function which will be called each time
   * a new message is received.
   * The new message is given to the callback.
   *
   * ```
   * transportService.onNewMessage((message) => {
   *   // ... handle the new message
   * })
   * ```
   */
  onNewMessage: (callback: NewMessageCallback) => void;
}
