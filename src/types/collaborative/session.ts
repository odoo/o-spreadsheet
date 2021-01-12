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
}

export interface RevisionRedone {
  type: "revision-redone";
  revisionId: UID;
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

export type CollaborativeEvent =
  | NewLocalStateUpdateEvent
  | UnexpectedRevisionIdEvent
  | RemoteRevisionReceivedEvent
  | RevisionAcknowledgedEvent
  | RevisionUndone
  | RevisionRedone
  | CollaborativeEventReceived;

export type CollaborativeEventTypes = CollaborativeEvent["type"];
