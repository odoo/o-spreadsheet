import { RevisionData } from "..";
import { UID } from "../misc";
import { Client, ClientPosition, ClientId } from "./session";

export interface RemoteRevisionMessage {
  type: "REMOTE_REVISION";
  revision: RevisionData;
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

export type CollaborationMessage =
  | RemoteRevisionMessage
  | ClientMovedMessage
  | ClientJoinedMessage
  | ClientLeftMessage;

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
