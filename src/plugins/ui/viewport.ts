import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../constants";
import { findCellInNewZone } from "../../helpers";
import { SelectionEvent } from "../../types/event_stream";
import {
  Command,
  CommandResult,
  Dimension,
  Position,
  Sheet,
  UID,
  Viewport,
  ZoneDimension,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface ViewportPluginState {
  readonly viewports: Record<UID, Viewport>;
}

/**
 * Viewport plugin.
 *
 * This plugin manages all things related to all viewport states.
 *
 */
export class ViewportPlugin extends UIPlugin {
  static getters = [
    "getColIndex",
    "getRowIndex",
    "getActiveViewport",
    "getViewportDimension",
    "getViewportDimensionWithHeaders",
    "getMaxViewportSize",
    "getMaximumViewportOffset",
  ] as const;

  readonly viewports: ViewportPluginState["viewports"] = {};
  /**
   * The viewport dimensions are usually set by one of the components
   * (i.e. when grid component is mounted) to properly reflect its state in the DOM.
   * In the absence of a component (standalone model), is it mandatory to set reasonable default values
   * to ensure the correct operation of this plugin.
   */
  private viewportWidth: number = 1000;
  private viewportHeight: number = 1000;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SET_VIEWPORT_OFFSET":
        return this.checkOffsetValidity(cmd.offsetX, cmd.offsetY);
      case "RESIZE_VIEWPORT":
        if (cmd.width < 0 || cmd.height < 0) {
          return CommandResult.InvalidViewportSize;
        }
        return CommandResult.Success;
      default:
        return CommandResult.Success;
    }
  }

  private handleEvent(event: SelectionEvent) {
    switch (event.type) {
      case "HeadersSelected":
      case "AlterZoneCorner":
        break;
      case "ZonesSelected":
        // altering a zone should not move the viewport
        const sheetId = this.getters.getActiveSheetId();
        let { col, row } = findCellInNewZone(event.previousAnchor.zone, event.anchor.zone);
        col = Math.min(col, this.getters.getNumberCols(sheetId) - 1);
        row = Math.min(row, this.getters.getNumberRows(sheetId) - 1);
        this.refreshViewport(this.getters.getActiveSheetId(), { col, row });
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.selection.observe(this, {
          handleEvent: this.handleEvent.bind(this),
        });
        this.generateViewportState(this.getters.getActiveSheetId());
        break;
      case "UNDO":
      case "REDO":
        this.cleanViewports();
        this.resetViewports();
        break;
      case "RESIZE_VIEWPORT":
        this.cleanViewports();
        this.resizeViewport(cmd.height, cmd.width);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.setViewportOffset(cmd.offsetX, cmd.offsetY);
        break;
      case "SHIFT_VIEWPORT_DOWN":
        const { top } = this.getActiveViewport();
        const sheetId = this.getters.getActiveSheetId();
        const shiftedOffsetY = this.clipOffsetY(
          this.getters.getRowDimensions(sheetId, top).start + this.viewportHeight
        );
        this.shiftVertically(shiftedOffsetY);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const { top } = this.getActiveViewport();
        const sheetId = this.getters.getActiveSheetId();
        const shiftedOffsetY = this.clipOffsetY(
          this.getters.getRowDimensions(sheetId, top).end - this.viewportHeight
        );
        this.shiftVertically(shiftedOffsetY);
        break;
      }
      case "REMOVE_COLUMNS_ROWS":
      case "RESIZE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.adjustViewportOffsetX(cmd.sheetId, this.getViewport(cmd.sheetId));
        } else {
          this.adjustViewportOffsetY(cmd.sheetId, this.getViewport(cmd.sheetId));
        }
        break;
      case "ADD_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.adjustViewportZoneX(cmd.sheetId, this.getViewport(cmd.sheetId));
        } else {
          this.adjustViewportZoneY(cmd.sheetId, this.getViewport(cmd.sheetId));
        }
        break;
      case "ACTIVATE_SHEET":
        this.refreshViewport(cmd.sheetIdTo);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Return the index of a column given an offset x, based on the viewport left
   * visible cell.
   * It returns -1 if no column is found.
   */
  getColIndex(x: number): number {
    if (x < 0) {
      return -1;
    }
    const viewport = this.getActiveViewport();
    return this.searchHeaderIndex("COL", this.getters.getActiveSheetId(), x, viewport.left);
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: number): number {
    if (y < 0) {
      return -1;
    }
    const viewport = this.getActiveViewport();
    return this.searchHeaderIndex("ROW", this.getters.getActiveSheetId(), y, viewport.top);
  }

  getViewportDimensionWithHeaders(): ZoneDimension {
    return {
      width: this.viewportWidth + (this.getters.isDashboard() ? 0 : HEADER_WIDTH),
      height: this.viewportHeight + (this.getters.isDashboard() ? 0 : HEADER_HEIGHT),
    };
  }

  getViewportDimension(): ZoneDimension {
    return {
      width: this.viewportWidth,
      height: this.viewportHeight,
    };
  }

  getActiveViewport(): Viewport {
    const sheetId = this.getters.getActiveSheetId();
    return this.getViewport(sheetId);
  }

  /**
   * Return the maximum viewport size. That is the sheet dimension
   * with some bottom and right padding.
   */
  getMaxViewportSize(sheet: Sheet): ZoneDimension {
    const sheetId = sheet.id;
    const lastCol = this.getters.findLastVisibleColRowIndex(sheetId, "COL");
    const lastRow = this.getters.findLastVisibleColRowIndex(sheetId, "ROW");
    const { end: lastColEnd, size: lastColSize } = this.getters.getColDimensions(sheetId, lastCol);
    const { end: lastRowEnd, size: lastRowSize } = this.getters.getRowDimensions(sheetId, lastRow);
    const leftColIndex = this.searchHeaderIndex("COL", sheetId, lastColEnd - this.viewportWidth, 0);
    const leftCol = this.getters.getColSize(sheetId, leftColIndex);
    const leftRowIndex = this.searchHeaderIndex(
      "ROW",
      sheetId,
      lastRowEnd - this.viewportHeight,
      0
    );
    const topRow = this.getters.getRowSize(sheetId, leftRowIndex);

    const width =
      lastColEnd +
      Math.max(DEFAULT_CELL_WIDTH, Math.min(leftCol, this.viewportWidth - lastColSize));
    const height =
      lastRowEnd +
      Math.max(DEFAULT_CELL_HEIGHT + 5, Math.min(topRow, this.viewportHeight - lastRowSize));

    return { width, height };
  }

  getMaximumViewportOffset(sheet: Sheet): { maxOffsetX: number; maxOffsetY: number } {
    const { width, height } = this.getters.getMaxViewportSize(sheet);
    return {
      maxOffsetX: Math.max(0, width - this.viewportWidth + 1),
      maxOffsetY: Math.max(0, height - this.viewportHeight + 1),
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private searchHeaderIndex(
    dimension: Dimension,
    sheetId: UID,
    position: number,
    startIndex: number = 0
  ): number {
    let size = 0;
    const headers = this.getters.getNumberHeaders(sheetId, dimension);
    for (let i = startIndex; i <= headers - 1; i++) {
      if (this.getters.isHeaderHidden(sheetId, dimension, i)) {
        continue;
      }
      size +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
      if (size > position) {
        return i;
      }
    }
    return -1;
  }

  private checkOffsetValidity(offsetX: number, offsetY: number): CommandResult {
    const sheet = this.getters.getActiveSheet();
    const { maxOffsetX, maxOffsetY } = this.getMaximumViewportOffset(sheet);
    if (offsetX < 0 || offsetY < 0 || offsetY > maxOffsetY || offsetX > maxOffsetX) {
      return CommandResult.InvalidOffset;
    }
    return CommandResult.Success;
  }

  private getViewport(sheetId: UID) {
    if (!this.viewports[sheetId]) {
      this.generateViewportState(sheetId);
    }
    return this.viewports[sheetId];
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const sheets = this.getters.getSheetIds();
    for (let sheetId of Object.keys(this.viewports)) {
      if (!sheets.includes(sheetId)) {
        delete this.viewports[sheetId];
      }
    }
  }

  private resetViewports() {
    for (let [sheetId, viewport] of Object.entries(this.viewports)) {
      const position = this.getters.getSheetPosition(sheetId);
      this.adjustViewportOffsetX(sheetId, viewport);
      this.adjustViewportOffsetY(sheetId, viewport);
      this.adjustViewportsPosition(sheetId, position);
    }
  }

  /** Corrects the viewport's horizontal offset based on the current structure
   *  To make sure that at least on column is visible inside the viewport.
   */
  private adjustViewportOffsetX(sheetId: UID, viewport: Viewport) {
    const { offsetX } = viewport;
    const { width: sheetWidth } = this.getMaxViewportSize(this.getters.getSheet(sheetId));
    if (this.viewportWidth + offsetX > sheetWidth) {
      const diff = this.viewportWidth + offsetX - sheetWidth;
      viewport.offsetScrollbarX = Math.max(0, offsetX - diff);
    }
    this.adjustViewportZoneX(sheetId, viewport);
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least on row is visible inside the viewport.
   */
  private adjustViewportOffsetY(sheetId: UID, viewport: Viewport) {
    const { offsetY } = viewport;
    const { height: sheetHeight } = this.getMaxViewportSize(this.getters.getSheet(sheetId));
    if (this.viewportHeight + offsetY > sheetHeight) {
      const diff = this.viewportHeight + offsetY - sheetHeight;
      viewport.offsetScrollbarY = Math.max(0, offsetY - diff);
    }
    this.adjustViewportZoneY(sheetId, viewport);
  }

  private resizeViewport(height: number, width: number) {
    this.viewportHeight = height;
    this.viewportWidth = width;
    this.recomputeViewports();
  }

  private recomputeViewports() {
    for (let sheetId of Object.keys(this.viewports)) {
      this.adjustViewportOffsetX(sheetId, this.viewports[sheetId]);
      this.adjustViewportOffsetY(sheetId, this.viewports[sheetId]);
    }
  }

  private setViewportOffset(offsetX: number, offsetY: number) {
    const sheetId = this.getters.getActiveSheetId();
    this.getViewport(sheetId);
    this.viewports[sheetId].offsetScrollbarX = offsetX;
    this.viewports[sheetId].offsetScrollbarY = offsetY;
    this.adjustViewportZone(sheetId, this.viewports[sheetId]);
  }

  /**
   * Clip the vertical offset within the allowed range.
   * Not above the sheet, nor below the sheet.
   */
  private clipOffsetY(offsetY: number): number {
    const { height } = this.getters.getMaxViewportSize(this.getters.getActiveSheet());
    const maxOffset = height - this.viewportHeight;
    offsetY = Math.min(offsetY, maxOffset);
    offsetY = Math.max(offsetY, 0);
    return offsetY;
  }

  private generateViewportState(sheetId: UID) {
    this.viewports[sheetId] = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      offsetX: 0,
      offsetY: 0,
      offsetScrollbarX: 0,
      offsetScrollbarY: 0,
    };
    this.adjustViewportZone(sheetId, this.viewports[sheetId]);
  }

  /**
   * Adjust the viewport such that the anchor position is visible
   */
  private refreshViewport(sheetId: UID, anchorPosition?: Position) {
    const viewport = this.getViewport(sheetId);
    this.adjustViewportZone(sheetId, viewport);
    this.adjustViewportsPosition(sheetId, anchorPosition);
  }

  private adjustViewportZone(sheetId: UID, viewport: Viewport) {
    this.adjustViewportZoneX(sheetId, viewport);
    this.adjustViewportZoneY(sheetId, viewport);
  }

  /** Updates the viewport zone based on its horizontal offset (will find Left) and its width (will find Right) */
  private adjustViewportZoneX(sheetId: UID, viewport: Viewport) {
    viewport.left = this.searchHeaderIndex("COL", sheetId, viewport.offsetScrollbarX);
    viewport.right = this.searchHeaderIndex("COL", sheetId, this.viewportWidth, viewport.left);
    if (viewport.right === -1) {
      viewport.right = this.getters.getNumberCols(sheetId) - 1;
    }
    viewport.offsetX = this.getters.getColDimensions(sheetId, viewport.left).start;
  }

  /** Updates the viewport zone based on its vertical offset (will find Top) and its width (will find Bottom) */
  private adjustViewportZoneY(sheetId: UID, viewport: Viewport) {
    viewport.top = this.searchHeaderIndex("ROW", sheetId, viewport.offsetScrollbarY);
    viewport.bottom = this.searchHeaderIndex("ROW", sheetId, this.viewportHeight, viewport.top);
    if (viewport.bottom === -1) {
      viewport.bottom = this.getters.getNumberRows(sheetId) - 1;
    }
    viewport.offsetY = this.getters.getRowDimensions(sheetId, viewport.top).start;
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the viewport that is actually displayed on the client. We therefore adjust the offset of the snapped
   * viewport until it contains the cell completely.
   */
  private adjustViewportsPosition(sheetId: UID, position?: Position) {
    const sheet = this.getters.getSheet(sheetId);

    const adjustedViewport = this.getViewport(sheetId);
    if (!position) {
      position = this.getters.getSheetPosition(sheetId);
    }
    const mainCellPosition = this.getters.getMainCellPosition(sheetId, position.col, position.row);
    const { col, row } = this.getters.getNextVisibleCellPosition(
      sheet.id,
      mainCellPosition.col,
      mainCellPosition.row
    );
    const { start, end } = this.getters.getColDimensions(sheetId, col);
    while (
      end > adjustedViewport.offsetX + this.viewportWidth &&
      adjustedViewport.offsetX < start
    ) {
      adjustedViewport.offsetX = this.getters.getColDimensions(sheetId, adjustedViewport.left).end;
      adjustedViewport.offsetScrollbarX = adjustedViewport.offsetX;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (col < adjustedViewport.left) {
      let leftCol: number;
      for (leftCol = adjustedViewport.left; leftCol >= 0; leftCol--) {
        if (!this.getters.isColHidden(sheetId, leftCol)) {
          break;
        }
      }
      adjustedViewport.offsetX = this.getters.getColDimensions(sheetId, leftCol - 1).start;
      adjustedViewport.offsetScrollbarX = adjustedViewport.offsetX;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (
      this.getters.getRowDimensions(sheetId, row).end >
        adjustedViewport.offsetY + this.viewportHeight &&
      adjustedViewport.offsetY < this.getters.getRowDimensions(sheetId, row).start
    ) {
      adjustedViewport.offsetY = this.getters.getRowDimensions(sheetId, adjustedViewport.top).end;
      adjustedViewport.offsetScrollbarY = adjustedViewport.offsetY;
      this.adjustViewportZoneY(sheetId, adjustedViewport);
    }
    while (row < adjustedViewport.top) {
      let topRow: number;
      for (topRow = adjustedViewport.top; topRow >= 0; topRow--) {
        if (!this.getters.isRowHidden(sheetId, topRow)) {
          break;
        }
      }
      adjustedViewport.offsetY = this.getters.getRowDimensions(sheetId, topRow - 1).start;
      adjustedViewport.offsetScrollbarY = adjustedViewport.offsetY;
      this.adjustViewportZoneY(sheetId, adjustedViewport);
    }
  }

  /**
   * Shift the viewport vertically and move the selection anchor
   * such that it remains at the same place relative to the
   * viewport top.
   */
  private shiftVertically(offset: number) {
    const { top, offsetX } = this.getActiveViewport();
    this.setViewportOffset(offsetX, offset);
    const { anchor } = this.getters.getSelection();
    const deltaRow = this.getActiveViewport().top - top;
    this.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
  }
}
