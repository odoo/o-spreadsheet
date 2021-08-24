import { CoreCommand } from "../commands";
import { UID } from "../misc";

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

export interface RemoteRevisionReceivedEvent {
  type: "remote-revision-received";
  commands: readonly CoreCommand[];
}

export interface RevisionAcknowledgedEvent {
  type: "revision-acknowledged";
  revisionId: UID;
}

export interface RevisionUndone {
  type: "revision-undone";
  revisionId: UID;
  commands: readonly CoreCommand[];
}

export interface RevisionRedone {
  type: "revision-redone";
  revisionId: UID;
  commands: readonly CoreCommand[];
}

export interface CollaborativeEventReceived {
  type: "collaborative-event-received";
}

export interface UnexpectedRevisionIdEvent {
  type: "unexpected-revision-id";
  revisionId: UID;
}

export interface NewLocalStateUpdateEvent {
  type: "new-local-state-update";
  id: UID;
}

export interface SnapshotEvent {
  type: "snapshot";
}

export type CollaborativeEvent =
  | NewLocalStateUpdateEvent
  | UnexpectedRevisionIdEvent
  | RemoteRevisionReceivedEvent
  | RevisionAcknowledgedEvent
  | RevisionUndone
  | RevisionRedone
  | SnapshotEvent
  | CollaborativeEventReceived;

export type CollaborativeEventTypes = CollaborativeEvent["type"];

export interface ClientToDisplay extends Required<Client> {
  color: string;
}
