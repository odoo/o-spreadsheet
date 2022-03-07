import {
  findVisibleHeader,
  isEqual,
  isInside,
  organizeZone,
  positionToZone,
  range,
  union,
} from "../helpers";
import {
  AnchorZone,
  CommandResult,
  DispatchResult,
  Getters,
  Header,
  Increment,
  Position,
  Zone,
} from "../types";
import { SelectionEvent } from "../types/event_stream";
import { SelectionDirection } from "../types/selection";
import { EventStream, StreamCallbacks } from "./event_stream";

type StatefulStream<Event, State> = {
  capture(owner: unknown, state: State, callbacks: StreamCallbacks<Event>): void;
  registerAsDefault: (owner: unknown, state: State, callbacks: StreamCallbacks<Event>) => void;
  resetDefaultAnchor: (owner: unknown, state: State) => void;
  resetAnchor: (owner: unknown, state: State) => void;
  observe: (owner: unknown, callbacks: StreamCallbacks<Event>) => void;
  release: (owner: unknown) => void;
};

/**
 * Allows to select cells in the grid and update the selection
 */
export interface SelectionProcessor {
  selectZone(anchor: AnchorZone): DispatchResult;
  selectCell(col: number, row: number): DispatchResult;
  moveAnchorCell(direction: SelectionDirection): DispatchResult;
  setAnchorCorner(col: number, row: number): DispatchResult;
  addCellToSelection(col: number, row: number): DispatchResult;
  resizeAnchorZone(direction: SelectionDirection): DispatchResult;
  selectColumn(index: number, mode: SelectionEvent["mode"]): DispatchResult;
  selectRow(
    index: number,
    mode: "overrideSelection" | "updateAnchor" | "newAnchor"
  ): DispatchResult;
  selectAll(): DispatchResult;
}

/**
 * Processes all selection updates (usually from user inputs) and emits an event
 * with the new selected anchor
 */
export class SelectionStreamProcessor
  implements SelectionProcessor, StatefulStream<SelectionEvent, AnchorZone>
{
  private stream: EventStream<SelectionEvent>;
  /**
   * "Active" anchor used as a reference to compute new anchors
   * An new initial value is given each time the stream is
   * captured. The value is updated with each new anchor.
   */
  private anchor: AnchorZone;
  private defaultAnchor: AnchorZone;

  constructor(private getters: Getters) {
    this.stream = new EventStream<SelectionEvent>();
    this.anchor = { cell: { col: 0, row: 0 }, zone: positionToZone({ col: 0, row: 0 }) };
    this.defaultAnchor = this.anchor;
  }

  capture(owner: unknown, anchor: AnchorZone, callbacks: StreamCallbacks<SelectionEvent>) {
    this.stream.capture(owner, callbacks);
    this.anchor = anchor;
  }

  /**
   * Register as default subscriber and capture the event stream.
   */
  registerAsDefault(
    owner: unknown,
    anchor: AnchorZone,
    callbacks: StreamCallbacks<SelectionEvent>
  ) {
    this.stream.registerAsDefault(owner, callbacks);
    this.defaultAnchor = anchor;
    this.capture(owner, anchor, callbacks);
  }

  resetDefaultAnchor(owner: unknown, anchor: AnchorZone) {
    if (this.stream.isListening(owner)) {
      this.anchor = anchor;
    }
    this.defaultAnchor = anchor;
  }

  resetAnchor(owner: unknown, anchor: AnchorZone) {
    if (this.stream.isListening(owner)) {
      this.anchor = anchor;
    }
  }

  observe(owner: unknown, callbacks: StreamCallbacks<SelectionEvent>) {
    this.stream.observe(owner, callbacks);
  }

  release(owner: unknown) {
    this.stream.release(owner);
    this.anchor = this.defaultAnchor;
  }

  /**
   * Select a new anchor
   */
  selectZone(anchor: AnchorZone): DispatchResult {
    const sheetId = this.getters.getActiveSheetId();
    anchor = {
      ...anchor,
      zone: this.getters.expandZone(sheetId, anchor.zone),
    };
    return this.processEvent({
      type: "ZonesSelected",
      anchor,
      mode: "overrideSelection",
    });
  }

  /**
   * Select a single cell as the new anchor.
   */
  selectCell(col: number, row: number): DispatchResult {
    const zone = positionToZone({ col, row });
    return this.selectZone({ zone, cell: { col, row } });
  }

  /**
   * Set the selection to one of the cells adjacent to the current anchor cell.
   */
  moveAnchorCell(direction: SelectionDirection): DispatchResult {
    const { col, row } = this.getNextAvailablePosition(direction);
    return this.selectCell(col, row);
  }

  /**
   * Update the current anchor such that it includes the given
   * cell position.
   */
  setAnchorCorner(col: number, row: number): DispatchResult {
    const sheetId = this.getters.getActiveSheetId();
    const { col: anchorCol, row: anchorRow } = this.anchor.cell;
    const zone: Zone = {
      left: Math.min(anchorCol, col),
      top: Math.min(anchorRow, row),
      right: Math.max(anchorCol, col),
      bottom: Math.max(anchorRow, row),
    };
    const expandedZone = this.getters.expandZone(sheetId, zone);
    const anchor = { zone: expandedZone, cell: { col: anchorCol, row: anchorRow } };
    return this.processEvent({
      type: "AlterZoneCorner",
      mode: "updateAnchor",
      anchor: anchor,
    });
  }

  /**
   * Add a new cell to the current selection
   */
  addCellToSelection(col: number, row: number): DispatchResult {
    const sheetId = this.getters.getActiveSheetId();
    [col, row] = this.getters.getMainCell(sheetId, col, row);
    const zone = positionToZone({ col, row });
    return this.processEvent({
      type: "ZonesSelected",
      anchor: { zone, cell: { col, row } },
      mode: "newAnchor",
    });
  }

  /**
   * Increase or decrease the size of the current anchor zone.
   * The anchor cell remains where it is. It's the opposite side
   * of the anchor zone which moves.
   */
  resizeAnchorZone(direction: SelectionDirection): DispatchResult {
    const sheet = this.getters.getActiveSheet();
    const anchor = this.anchor;
    const delta = this.directionToDelta(direction);
    const { col: anchorCol, row: anchorRow } = anchor.cell;
    const { left, right, top, bottom } = anchor.zone;
    let result: Zone | null = anchor.zone;
    const expand = (z: Zone) => {
      z = organizeZone(z);
      const { left, right, top, bottom } = this.getters.expandZone(sheet.id, z);
      return {
        left: Math.max(0, left),
        right: Math.min(sheet.cols.length - 1, right),
        top: Math.max(0, top),
        bottom: Math.min(sheet.rows.length - 1, bottom),
      };
    };

    const { col: refCol, row: refRow } = this.getReferencePosition();
    // check if we can shrink selection
    let n = 0;
    while (result !== null) {
      n++;
      if (delta[0] < 0) {
        const newRight = this.getNextAvailableCol(delta[0], right - (n - 1), refRow);
        result = refCol <= right - n ? expand({ top, left, bottom, right: newRight }) : null;
      }
      if (delta[0] > 0) {
        const newLeft = this.getNextAvailableCol(delta[0], left + (n - 1), refRow);
        result = left + n <= refCol ? expand({ top, left: newLeft, bottom, right }) : null;
      }
      if (delta[1] < 0) {
        const newBottom = this.getNextAvailableRow(delta[1], refCol, bottom - (n - 1));
        result = refRow <= bottom - n ? expand({ top, left, bottom: newBottom, right }) : null;
      }
      if (delta[1] > 0) {
        const newTop = this.getNextAvailableRow(delta[1], refCol, top + (n - 1));
        result = top + n <= refRow ? expand({ top: newTop, left, bottom, right }) : null;
      }
      result = result ? organizeZone(result) : result;
      if (result && !isEqual(result, anchor.zone)) {
        return this.processEvent({
          type: "ZonesSelected",
          mode: "updateAnchor",
          anchor: { zone: result, cell: { col: anchorCol, row: anchorRow } },
        });
      }
    }
    const currentZone = {
      top: anchorRow,
      bottom: anchorRow,
      left: anchorCol,
      right: anchorCol,
    };
    const zoneWithDelta = organizeZone({
      top: this.getNextAvailableRow(delta[1], refCol!, top),
      left: this.getNextAvailableCol(delta[0], left, refRow!),
      bottom: this.getNextAvailableRow(delta[1], refCol!, bottom),
      right: this.getNextAvailableCol(delta[0], right, refRow!),
    });
    result = expand(union(currentZone, zoneWithDelta));
    const newAnchor = { zone: result, cell: { col: anchorCol, row: anchorRow } };
    return this.processEvent({
      type: "ZonesSelected",
      anchor: newAnchor,
      mode: "updateAnchor",
    });
  }

  selectColumn(index: number, mode: SelectionEvent["mode"]): DispatchResult {
    const sheet = this.getters.getActiveSheet();
    const bottom = sheet.rows.length - 1;
    let zone = { left: index, right: index, top: 0, bottom };
    const top = sheet.rows.findIndex((row) => !row.isHidden);
    let col: number, row: number;
    switch (mode) {
      case "overrideSelection":
      case "newAnchor":
        col = index;
        row = top;
        break;
      case "updateAnchor":
        ({ col, row } = this.anchor.cell);
        zone = union(zone, { left: col, right: col, top, bottom });
        break;
    }
    return this.processEvent({
      type: "HeadersSelected",
      anchor: { zone, cell: { col, row } },
      mode,
    });
  }

  selectRow(
    index: number,
    mode: "overrideSelection" | "updateAnchor" | "newAnchor"
  ): DispatchResult {
    const right = this.getters.getActiveSheet().cols.length - 1;
    let zone = { top: index, bottom: index, left: 0, right };
    const left = this.getters.getActiveSheet().cols.findIndex((col) => !col.isHidden);
    let col: number, row: number;
    switch (mode) {
      case "overrideSelection":
      case "newAnchor":
        col = left;
        row = index;
        break;
      case "updateAnchor":
        ({ col, row } = this.anchor.cell);
        zone = union(zone, { left, right, top: row, bottom: row });
        break;
    }
    return this.processEvent({
      type: "HeadersSelected",
      anchor: { zone, cell: { col, row } },
      mode,
    });
  }

  /**
   * Select the entire sheet
   */
  selectAll(): DispatchResult {
    const sheet = this.getters.getActiveSheet();
    const bottom = sheet.rows.length - 1;
    const right = sheet.cols.length - 1;
    const zone = { left: 0, top: 0, bottom, right };
    return this.processEvent({
      type: "HeadersSelected",
      mode: "overrideSelection",
      anchor: { zone, cell: { col: 0, row: 0 } },
    });
  }

  /**
   * Process a new anchor selection event. If the new anchor is inside
   * the sheet boundaries, the event is pushed to the event stream to
   * be processed.
   */
  private processEvent(newAnchorEvent: Omit<SelectionEvent, "previousAnchor">): DispatchResult {
    const event = { ...newAnchorEvent, previousAnchor: this.anchor };
    const commandResult = this.checkAnchorZone(event);
    if (commandResult !== CommandResult.Success) {
      return new DispatchResult(commandResult);
    }
    this.anchor = event.anchor;
    this.stream.send(event);
    return DispatchResult.Success;
  }

  private checkAnchorZone(event: SelectionEvent): CommandResult {
    const { cell, zone } = event.anchor;
    if (!isInside(cell.col, cell.row, zone)) {
      return CommandResult.InvalidAnchorZone;
    }
    const { left, right, top, bottom } = zone;
    const sheet = this.getters.getActiveSheet();
    const refCol = findVisibleHeader(sheet, "cols", range(left, right + 1));
    const refRow = findVisibleHeader(sheet, "rows", range(top, bottom + 1));
    if (refRow === undefined || refCol === undefined) {
      return CommandResult.SelectionOutOfBound;
    }
    return CommandResult.Success;
  }

  /**
   *  ---- PRIVATE ----
   */

  private directionToDelta(direction: SelectionDirection): [Increment, Increment] {
    switch (direction) {
      case "up":
        return [0, -1];
      case "down":
        return [0, 1];
      case "left":
        return [-1, 0];
      case "right":
        return [1, 0];
    }
  }

  /** Computes the next cell position in the direction of deltaX and deltaY
   * by crossing through merges and skipping hidden cells.
   * Note that the resulting position might be out of the sheet, it needs to be validated.
   */
  private getNextAvailablePosition(direction: SelectionDirection): Position {
    const { col, row } = this.anchor.cell;
    const delta = this.directionToDelta(direction);
    return {
      col: this.getNextAvailableCol(delta[0], col, row),
      row: this.getNextAvailableRow(delta[1], col, row),
    };
  }

  private getNextAvailableCol(delta: Increment, colIndex: number, rowIndex: number): number {
    const { cols, id: sheetId } = this.getters.getActiveSheet();
    const position = { col: colIndex, row: rowIndex };
    const isInPositionMerge = (nextCol: number) =>
      this.getters.isInSameMerge(sheetId, colIndex, rowIndex, nextCol, rowIndex);
    return this.getNextAvailableHeader(delta, cols, colIndex, position, isInPositionMerge);
  }

  private getNextAvailableRow(delta: Increment, colIndex: number, rowIndex: number): number {
    const { rows, id: sheetId } = this.getters.getActiveSheet();
    const position = { col: colIndex, row: rowIndex };
    const isInPositionMerge = (nextRow: number) =>
      this.getters.isInSameMerge(sheetId, colIndex, rowIndex, colIndex, nextRow);
    return this.getNextAvailableHeader(delta, rows, rowIndex, position, isInPositionMerge);
  }

  private getNextAvailableHeader(
    delta: Increment,
    headers: Header[],
    startingHeaderIndex: number,
    position: Position,
    isInPositionMerge: (nextHeader: number) => boolean
  ): number {
    const sheetId = this.getters.getActiveSheetId();
    const { col, row } = position;
    if (delta === 0) {
      return startingHeaderIndex;
    }
    let header = startingHeaderIndex + delta;

    if (this.getters.isInMerge(sheetId, col, row)) {
      while (isInPositionMerge(header)) {
        header += delta;
      }
      while (headers[header]?.isHidden) {
        header += delta;
      }
    } else if (headers[header]?.isHidden) {
      while (headers[header]?.isHidden) {
        header += delta;
      }
    }
    const outOfBound = header < 0 || header > headers.length - 1;
    if (outOfBound) {
      if (headers[startingHeaderIndex].isHidden) {
        return this.getNextAvailableHeader(
          -delta as Increment,
          headers,
          startingHeaderIndex,
          position,
          isInPositionMerge
        );
      } else {
        return startingHeaderIndex;
      }
    }
    return header;
  }

  /**
   * Finds a visible cell in the currently selected zone starting with the anchor.
   * If the anchor is hidden, browses from left to right and top to bottom to
   * find a visible cell.
   */
  private getReferencePosition(): Position {
    const sheet = this.getters.getActiveSheet();
    const anchor = this.anchor;
    const { left, right, top, bottom } = anchor.zone;
    const { col: anchorCol, row: anchorRow } = anchor.cell;

    return {
      col: sheet.cols[anchorCol].isHidden
        ? findVisibleHeader(sheet, "cols", range(left, right + 1)) || anchorCol
        : anchorCol,
      row: sheet.rows[anchorRow].isHidden
        ? findVisibleHeader(sheet, "rows", range(top, bottom + 1)) || anchorRow
        : anchorRow,
    };
  }
}
