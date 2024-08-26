import { CoreCommand } from "../commands";
import { UID } from "../misc";
import { WorkbookData } from "../workbook_data";
import { Client, ClientId } from "./session";

interface AbstractMessage {
  version: number;
}

export interface RemoteRevisionMessage extends AbstractMessage {
  type: "REMOTE_REVISION";
  clientId: ClientId;
  commands: readonly CoreCommand[];
  nextRevisionId: UID;
  serverRevisionId: UID;
  timestamp?: number;
}

export interface RevisionUndoneMessage extends AbstractMessage {
  type: "REVISION_UNDONE";
  undoneRevisionId: UID;
  nextRevisionId: UID;
  serverRevisionId: UID;
}

export interface RevisionRedoneMessage extends AbstractMessage {
  type: "REVISION_REDONE";
  redoneRevisionId: UID;
  nextRevisionId: UID;
  serverRevisionId: UID;
}

export interface ClientJoinedMessage extends AbstractMessage {
  type: "CLIENT_JOINED";
  client: Required<Client>;
}

export interface ClientLeftMessage extends AbstractMessage {
  type: "CLIENT_LEFT";
  clientId: ClientId;
}

export interface ClientMovedMessage extends AbstractMessage {
  type: "CLIENT_MOVED";
  client: Required<Client>;
}

/**
 * Send a snapshot of the spreadsheet to the collaborative server
 */
interface SnapshotMessage extends AbstractMessage {
  type: "SNAPSHOT";
  data: WorkbookData;
  serverRevisionId: UID;
  nextRevisionId: UID;
}

/**
 * Notify all clients that the server has a new snapshot of the
 * spreadsheet and that the previous history may be lost.
 */
interface SnapshotCreatedMessage extends AbstractMessage {
  type: "SNAPSHOT_CREATED";
  serverRevisionId: UID;
  nextRevisionId: UID;
}

export type CollaborationMessage =
  | RevisionUndoneMessage
  | RevisionRedoneMessage
  | RemoteRevisionMessage
  | SnapshotMessage
  | SnapshotCreatedMessage
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
  sendMessage: (message: T) => Promise<void>;
  /**
   * Register a callback function which will be called each time
   * a new message is received.
   * The new message is given to the callback.
   *
   * ```js
   * transportService.onNewMessage(id, (message) => {
   *   // ... handle the new message
   * })
   * ```
   * The `id` is used to unregister this callback when the session is closed.
   */
  onNewMessage: (id: UID, callback: NewMessageCallback<T>) => void;

  /**
   * Unregister a callback linked to the given id
   */
  leave: (id: UID) => void;
}
