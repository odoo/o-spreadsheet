import { UID } from "./misc";

export interface SheetCreatedEvent {
  type: "SHEET_CREATED_EVENT";
  sheetId: UID;
}

export interface CellUpdatedEvent {
  type: "CELL_UPDATED_EVENT";
  sheetId: UID;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface SheetMovedEvent {
  type: "SHEET_MOVED_EVENT";
  sheetId: UID;
  direction: "left" | "right";
}

export type Event = SheetCreatedEvent | SheetMovedEvent | CellUpdatedEvent;

export interface EventDispatcher {
  dispatchEvent<T extends EventTypes, C extends Extract<Event, { type: T }>>(
    type: {} extends Omit<C, "type"> ? T : never
  ): void;
  dispatchEvent<T extends EventTypes, C extends Extract<Event, { type: T }>>(
    type: T,
    r: Omit<C, "type">
  ): void;
}

export interface EventHandler {
  handleEvent(event: Event): void;
}

export type EventTypes = Event["type"];
