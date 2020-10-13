import { UID } from "./misc";

export type Event = SheetCreatedEvent | SheetMovedEvent | CellUpdatedEvent | SheetDeletedEvent | SheetRenamedEvent | CellClearedEvent;

export type EventTypes = Event["type"];

export interface EventHandler {
  on<T extends EventTypes, E extends Extract<Event, { type: T }>>(
    type: T,
    owner: any,
    callback: (r: Omit<E, "type">) => void
  ): void;
}
export interface EventDispatcher extends EventHandler {
  trigger<T extends EventTypes, E extends Extract<Event, { type: T }>>(type: T): void;
  trigger<T extends EventTypes, E extends Extract<Event, { type: T }>>(
    type: T,
    r: Omit<E, "type">
  ): void;
}

export interface SheetCreatedEvent {
  type: "sheet-created";
  sheetId: UID;
}

export interface CellUpdatedEvent {
  type: "cell-updated";
  sheetId: UID;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface SheetMovedEvent {
  type: "sheet-moved";
  sheetId: UID;
  direction: "left" | "right";
}

export interface SheetDeletedEvent {
  type: "sheet-deleted";
  sheetId: UID;
}

export interface SheetRenamedEvent {
  type: "sheet-renamed";
  sheetId: UID;
  name: string;
}

export interface CellClearedEvent {
  type: "cell-cleared";
  sheetId: UID;
  col: number;
  row: number;
}