import { StreamCallbacks } from "../selection_stream/event_stream";
import { DispatchResult } from "./commands";
import { SelectionEvent, SelectionEventOptions } from "./event_stream";
import { AnchorZone, Direction, SelectionStep } from "./misc";

type StatefulStream<Event, State> = {
  capture(owner: unknown, state: State, callbacks: StreamCallbacks<Event>): void;
  registerAsDefault: (owner: unknown, state: State, callbacks: StreamCallbacks<Event>) => void;
  resetDefaultAnchor: (owner: unknown, state: State) => void;
  resetAnchor: (owner: unknown, state: State) => void;
  observe: (owner: unknown, callbacks: StreamCallbacks<Event>) => void;
  unobserve: (owner: unknown) => void;
  release: (owner: unknown) => void;
  getBackToDefault(): void;
};

/**
 * Allows to select cells in the grid and update the selection
 */
interface SelectionProcessor {
  selectZone(anchor: AnchorZone, options?: SelectionEventOptions): DispatchResult;

  selectCell(col: number, row: number): DispatchResult;

  moveAnchorCell(direction: Direction, step: SelectionStep): DispatchResult;

  updateAnchorCell(col: number, row: number, options?: SelectionEventOptions): DispatchResult;

  setAnchorCorner(col: number, row: number): DispatchResult;

  addCellToSelection(col: number, row: number): DispatchResult;

  resizeAnchorZone(direction: Direction, step: SelectionStep): DispatchResult;

  selectColumn(index: number, mode: SelectionEvent["mode"]): DispatchResult;

  selectRow(index: number, mode: SelectionEvent["mode"]): DispatchResult;

  selectAll(): DispatchResult;

  loopSelection(): DispatchResult;

  selectTableAroundSelection(): DispatchResult;

  commitSelection(): DispatchResult;

  isListening(owner: unknown): boolean;
}

export type SelectionStreamProcessor = SelectionProcessor &
  StatefulStream<SelectionEvent, AnchorZone>;
