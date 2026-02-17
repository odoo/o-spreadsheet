import { SquishedFormula } from "../../plugins/core/squisher";
import { CoreCommand } from "../commands";
import { Format } from "../format";
import { Style, UID } from "../misc";
import { WorkbookData } from "../workbook_data";
import { ClientId, ClientWithPosition } from "./session";

interface AbstractMessage {
  version: number;
}

export interface UpdateCellSquish {
  type: "UPDATE_CELL_SQUISH";
  sheetId: string;
  format?: Format;
  style?: Style | null;
  content?: string | SquishedFormula;
}

export interface UpdateCellSquishMultiCommand extends UpdateCellSquish {
  targetRange: string; // either a single cell like "A1" or a range like "A1:A5"
}

// UpdateCellSquishCommand et UpdateCellCommand ont exactement les mêmes propriétés
// à part le content qui peut être une SquishedFormula dans UpdateCellSquishCommand
export interface UpdateCellSquishCommand extends UpdateCellSquish {
  col: number;
  row: number;
}

export type SquishedCoreCommand = UpdateCellSquishCommand | UpdateCellSquishMultiCommand;

export interface RemoteRevisionMessage extends AbstractMessage {
  type: "REMOTE_REVISION";
  clientId: ClientId;
  commands: readonly CoreCommand[];
  nextRevisionId: UID;
  serverRevisionId: UID;
  timestamp?: number;
}

export interface RemoteRevisionsSquishedMessage extends Omit<RemoteRevisionMessage, "commands"> {
  commands: (CoreCommand | SquishedCoreCommand)[];
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
  client: ClientWithPosition;
}

export interface ClientLeftMessage extends AbstractMessage {
  type: "CLIENT_LEFT";
  clientId: ClientId;
}

export interface ClientMovedMessage extends AbstractMessage {
  type: "CLIENT_MOVED";
  client: ClientWithPosition;
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
export interface SnapshotCreatedMessage extends AbstractMessage {
  type: "SNAPSHOT_CREATED";
  serverRevisionId: UID;
  nextRevisionId: UID;
}

export type CollaborationMessage =
  | RevisionUndoneMessage
  | RevisionRedoneMessage
  | RemoteRevisionMessage
  | RemoteRevisionsSquishedMessage
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
