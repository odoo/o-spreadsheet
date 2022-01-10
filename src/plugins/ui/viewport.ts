import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../constants";
import { findCellInNewZone, findLastVisibleColRow, getNextVisibleCellCoords } from "../../helpers";
import { Mode } from "../../model";
import { SelectionEvent } from "../../types/event_stream";
import {
  Command,
  CommandResult,
  Position,
  Row,
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
 * The viewport is a representation of the current visible cells
 * via a Zone and the the scrollbar absolute position (defined as offsetX and offsetY)
 *
 */
export class ViewportPlugin extends UIPlugin {
  static getters = [
    "getActiveViewport",
    "getViewportDimensionWithHeaders",
    "getMaxViewportSize",
    "getMaximumViewportOffset",
  ] as const;
  static modes: Mode[] = ["normal"];

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
        const sheetId = this.getters.getActiveSheetId();
        if (event.mode === "updateAnchor") {
          // altering a zone should not move the viewport
          const [col, row] = findCellInNewZone(event.previousAnchor.zone, event.anchor.zone);
          this.refreshViewport(sheetId, { col, row });
        } else {
          this.refreshViewport(sheetId);
        }
        break;
    }
  }

  handle(cmd: Command) {
    const sheetId = this.getters.getActiveSheetId();
    switch (cmd.type) {
      case "START":
        this.selection.observe(this, {
          handleEvent: this.handleEvent.bind(this),
        });
        break;
      case "UNDO":
      case "REDO":
        this.cleanViewports();
        this.resetViewports();
        this._scroll(sheetId);
        break;
      case "RESIZE_VIEWPORT":
        this.cleanViewports();
        this.resizeViewport(cmd.height, cmd.width);
        this._scroll(sheetId);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.setViewportOffset(cmd.offsetX, cmd.offsetY);
        break;
      case "SHIFT_VIEWPORT_DOWN":
        const { maxOffsetY } = this.getMaximumViewportOffset(this.getters.getActiveSheet());
        const topRow = this.getActiveTopRow();
        const shiftedOffsetY = Math.min(maxOffsetY, topRow.start + this.viewportHeight);
        const newRowIndex = this.getters.getRowIndex(shiftedOffsetY + HEADER_HEIGHT, 0);
        this.shiftVertically(this.getters.getRow(sheetId, newRowIndex).start);
        this._scroll(sheetId);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const topRow = this.getActiveTopRow();
        const shiftedOffsetY = Math.max(topRow.end - this.viewportHeight, 0);
        const newRowIndex = this.getters.getRowIndex(shiftedOffsetY + HEADER_HEIGHT, 0);
        this.shiftVertically(this.getters.getRow(sheetId, newRowIndex).start);
        this._scroll(sheetId);
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
        this._scroll(sheetId);
        break;
      case "ADD_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.adjustViewportZoneX(cmd.sheetId, this.getViewport(cmd.sheetId));
        } else {
          this.adjustViewportZoneY(cmd.sheetId, this.getViewport(cmd.sheetId));
        }
        this._scroll(sheetId);
        break;
      case "ACTIVATE_SHEET":
        this.refreshViewport(cmd.sheetIdTo);
        this._scroll(sheetId);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getViewportDimensionWithHeaders(): ZoneDimension {
    return {
      width: this.viewportWidth + HEADER_WIDTH,
      height: this.viewportHeight + HEADER_HEIGHT,
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
    const lastCol = findLastVisibleColRow(sheet, "cols");
    const lastRow = findLastVisibleColRow(sheet, "rows");

    const leftCol =
      sheet.cols.find((col) => col.end > lastCol!.end - this.viewportWidth) ||
      sheet.cols[sheet.cols.length - 1];
    const topRow =
      sheet.rows.find((row) => row.end > lastRow!.end - this.viewportHeight) ||
      sheet.rows[sheet.rows.length - 1];

    const width =
      lastCol!.end +
      Math.max(DEFAULT_CELL_WIDTH, Math.min(leftCol.size, this.viewportWidth - lastCol!.size));
    const height =
      lastRow!.end +
      Math.max(DEFAULT_CELL_HEIGHT + 5, Math.min(topRow.size, this.viewportHeight - lastRow!.size));

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

  /**
   * Broadcasts the expected viewport scroll value following the alteration of a sheet structure.
   * Meant to be caught by the rendering side to synchronize.
   */
  private _scroll(sheetId: UID) {
    const { offsetX, offsetY } = this.getViewport(sheetId);
    this.ui.notifyUI({ type: "SCROLL", offsetX, offsetY });
  }

  private checkOffsetValidity(offsetX: number, offsetY: number): CommandResult {
    const sheet = this.getters.getActiveSheet();
    const { maxOffsetX, maxOffsetY } = this.getMaximumViewportOffset(sheet);
    if (offsetX < 0 || offsetY < 0 || offsetY > maxOffsetY || offsetX > maxOffsetX) {
      return CommandResult.InvalidOffset;
    }
    return CommandResult.Success;
  }

  private getViewport(sheetId: UID): Viewport {
    if (!this.viewports[sheetId]) {
      const viewport = this.generateViewportState(sheetId);
      this.adjustViewportZone(sheetId, viewport);
      this.adjustViewportsPosition(sheetId);
    }
    return this.viewports[sheetId];
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const sheets = this.getters.getVisibleSheets();
    for (let sheetId of Object.keys(this.viewports)) {
      if (!sheets.includes(sheetId)) {
        delete this.viewports[sheetId];
      }
    }
  }

  private resetViewports() {
    for (let [sheetId, viewport] of Object.entries(this.viewports)) {
      const [col, row] = this.getters.getSheetPosition(sheetId);
      this.adjustViewportOffsetX(sheetId, viewport);
      this.adjustViewportOffsetY(sheetId, viewport);
      this.adjustViewportsPosition(sheetId, { col, row });
    }
  }

  /** Corrects the viewport's horizontal offset based on the current structure
   *  To make sure that at least one column is visible inside the viewport.
   */
  private adjustViewportOffsetX(sheetId: UID, viewport: Viewport) {
    const { offsetX } = viewport;
    const { width: sheetWidth } = this.getMaxViewportSize(this.getters.getSheet(sheetId));
    if (this.viewportWidth + offsetX > sheetWidth) {
      const diff = this.viewportWidth + offsetX - sheetWidth;
      viewport.offsetX = Math.max(0, offsetX - diff);
    }
    this.adjustViewportZoneX(sheetId, viewport);
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least one row is visible inside the viewport.
   */
  private adjustViewportOffsetY(sheetId: UID, viewport: Viewport) {
    const { offsetY } = viewport;
    const { height: sheetHeight } = this.getMaxViewportSize(this.getters.getSheet(sheetId));
    if (this.viewportHeight + offsetY > sheetHeight) {
      const diff = this.viewportHeight + offsetY - sheetHeight;
      viewport.offsetY = Math.max(0, offsetY - diff);
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
    this.getActiveViewport();
    this.viewports[sheetId].offsetX = offsetX;
    this.viewports[sheetId].offsetY = offsetY;
    this.adjustViewportZone(sheetId, this.viewports[sheetId]);
  }

  private generateViewportState(sheetId: UID): Viewport {
    this.viewports[sheetId] = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      offsetX: 0,
      offsetY: 0,
    };
    return this.viewports[sheetId];
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
    const sheet = this.getters.getSheet(sheetId);
    const cols = sheet.cols;
    viewport.left = this.getters.getColIndex(viewport.offsetX + HEADER_WIDTH, 0, sheet);
    const x = this.viewportWidth + viewport.offsetX;
    viewport.right = cols.length - 1;
    for (let i = viewport.left; i < cols.length; i++) {
      if (x < cols[i].end) {
        viewport.right = i;
        break;
      }
    }
  }

  /** Updates the viewport zone based on its vertical offset (will find Top) and its width (will find Bottom) */
  private adjustViewportZoneY(sheetId: UID, viewport: Viewport) {
    const sheet = this.getters.getSheet(sheetId);
    const rows = sheet.rows;
    viewport.top = this.getters.getRowIndex(viewport.offsetY + HEADER_HEIGHT, 0, sheet);
    const y = this.viewportHeight + viewport.offsetY;
    viewport.bottom = rows.length - 1;
    for (let i = viewport.top; i < rows.length; i++) {
      if (y < rows[i].end) {
        viewport.bottom = i;
        break;
      }
    }
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the viewport that is actually displayed on the client. We therefore adjust
   * the offset of the viewport until it contains the cell completely.
   */
  private adjustViewportsPosition(sheetId: UID, position?: Position) {
    const sheet = this.getters.getSheet(sheetId);
    const { cols, rows } = sheet;
    const adjustedViewport = this.getViewport(sheetId);
    if (!position) {
      const sheetPosition = this.getters.getSheetPosition(sheetId);
      position = { col: sheetPosition[0], row: sheetPosition[1] };
    }
    const [col, row] = getNextVisibleCellCoords(
      sheet,
      ...this.getters.getMainCell(sheetId, position.col, position.row)
    );
    while (
      cols[col].end > adjustedViewport.offsetX + this.viewportWidth &&
      adjustedViewport.offsetX < cols[col].start
    ) {
      adjustedViewport.offsetX = cols[adjustedViewport.left].end;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (col < adjustedViewport.left) {
      const step = cols
        .slice(0, adjustedViewport.left)
        .reverse()
        .findIndex((col) => !col.isHidden);
      adjustedViewport.offsetX = cols[adjustedViewport.left - 1 - step].start;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (
      rows[row].end > adjustedViewport.offsetY + this.viewportHeight &&
      adjustedViewport.offsetY < rows[row].start
    ) {
      adjustedViewport.offsetY = rows[adjustedViewport.top].end;
      this.adjustViewportZoneY(sheetId, adjustedViewport);
    }
    while (row < adjustedViewport.top) {
      const step = rows
        .slice(0, adjustedViewport.top)
        .reverse()
        .findIndex((row) => !row.isHidden);
      adjustedViewport.offsetY = rows[adjustedViewport.top - 1 - step].start;
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
    this.selection.selectCell(anchor[0], anchor[1] + deltaRow);
  }

  /**
   * Return the row at the viewport's top
   */
  private getActiveTopRow(): Row {
    const { top } = this.getActiveViewport();
    const sheet = this.getters.getActiveSheet();
    return this.getters.getRow(sheet.id, top);
  }
}
