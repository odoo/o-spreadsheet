import { EventBus } from "../../helpers/event_bus";
import { UID } from "../misc";
import { Revision } from "./revisions";

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

/**
 * Manages the collaboration between multiple users on the same spreadsheet.
 * It can forward local state changes to other users to ensure they all eventually
 * reach the same state.
 * It also manages the positions of each clients in the spreadsheet to provide
 * a visual indication of what other users are doing in the spreadsheet.
 */
export interface Session extends EventBus<CollaborativeEvent> {
  /**
   * Add a new revision to the collaborative session.
   * It will be transmitted to all other connected clients.
   */
  addRevision: (revision: Revision) => void;

  /**
   * Notify that the position of the client has changed
   */
  move: (position: ClientPosition) => void;

  /**
   * Notify the server that the user client left the collaborative session
   */
  leave: () => void;
  getClient: () => Client;
  getConnectedClients: () => Set<Client>;
  setRevisionId: (id: UID) => void;
  getRevisionId: () => UID;
}

export interface RemoteRevisionReceivedEvent extends Revision {
  type: "remote-revision-received";
}

export interface RevisionAcknowledgedEvent extends Revision {
  type: "revision-acknowledged";
}

export interface CollaborativeEventReceived {
  type: "collaborative-event-received";
}

export type CollaborativeEvent =
  | RemoteRevisionReceivedEvent
  | RevisionAcknowledgedEvent
  | CollaborativeEventReceived;

export type CollaborativeEventTypes = CollaborativeEvent["type"];
