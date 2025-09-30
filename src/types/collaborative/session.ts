import { Color, HeaderIndex, UID } from "@odoo/o-spreadsheet-engine";
export type ClientId = string;

export interface Client {
  id: ClientId;
  name: string;
  position?: ClientPosition;
  color?: Color;
}

export interface ClientWithPosition extends Client {
  position: ClientPosition;
}

export interface ClientWithColor extends Client {
  color: Color;
}

export interface ClientPosition {
  sheetId: UID;
  col: HeaderIndex;
  row: HeaderIndex;
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
