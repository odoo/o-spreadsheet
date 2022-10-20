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
 * There are two types of viewports :
 *  1. The viewport related to the scrollbar absolute position
 *  2. The snappedViewport which represents the previous one but but 'snapped' to
 *     the col/row structure, so, the offsets are correct for computations necessary
 *     to align elements to the grid.
 */
export class ViewportPlugin extends UIPlugin {
  static getters = [
    "getActiveViewport",
    "getActiveSnappedViewport",
    "getViewportDimensionWithHeaders",
    "getMaxViewportSize",
    "getMaximumViewportOffset",
  ] as const;
  static modes: Mode[] = ["normal"];

  readonly viewports: ViewportPluginState["viewports"] = {};
  readonly snappedViewports: ViewportPluginState["viewports"] = {};
  private updateSnap: boolean = false;
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
        const sheet = this.getters.getActiveSheet();
        let [col, row] = findCellInNewZone(
          event.previousAnchor.zone,
          event.anchor.zone,
          this.getActiveSnappedViewport()
        );
        col = Math.min(col, sheet.cols.length - 1);
        row = Math.min(row, sheet.rows.length - 1);
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
        const topRow = this.getActiveTopRow();
        const shiftedOffsetY = this.clipOffsetY(topRow.start + this.viewportHeight);
        this.shiftVertically(shiftedOffsetY);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const topRow = this.getActiveTopRow();
        const shiftedOffsetY = this.clipOffsetY(topRow.end - this.viewportHeight);
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

  finalize() {
    if (this.updateSnap) {
      this.snapViewportToCell(this.getters.getActiveSheetId());
      this.updateSnap = false;
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

  getActiveSnappedViewport(): Viewport {
    const sheetId = this.getters.getActiveSheetId();
    return this.getSnappedViewport(sheetId);
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

  private checkOffsetValidity(offsetX: number, offsetY: number): CommandResult {
    const sheet = this.getters.getActiveSheet();
    const { maxOffsetX, maxOffsetY } = this.getMaximumViewportOffset(sheet);
    if (offsetX < 0 || offsetY < 0 || offsetY > maxOffsetY || offsetX > maxOffsetX) {
      return CommandResult.InvalidOffset;
    }
    return CommandResult.Success;
  }

  private getSnappedViewport(sheetId: UID) {
    this.snapViewportToCell(sheetId);
    return this.snappedViewports[sheetId];
  }

  private getViewport(sheetId: UID): Viewport {
    if (!this.viewports[sheetId]) {
      return this.generateViewportState(sheetId);
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
   *  To make sure that at least on column is visible inside the viewport.
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
   *  To make sure that at least on row is visible inside the viewport.
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
    this.updateSnap = true;
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
    this.updateSnap = true;
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the viewport that is actually displayed on the client, that is, the snapped one. We therefore adjust
   * the offset of the snapped viewport until it contains the cell completely.
   * In order to keep the coherence of both viewports, it is also necessary to update the standard viewport
   * if the zones of both viewports don't match.
   */
  private adjustViewportsPosition(sheetId: UID, position?: Position) {
    const sheet = this.getters.getSheet(sheetId);
    const { cols, rows } = sheet;
    const adjustedViewport = this.getSnappedViewport(sheetId);
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
    // cast the new snappedViewport in the standard viewport
    const { top, left } = this.viewports[sheetId];
    if (top !== adjustedViewport.top || left !== adjustedViewport.left)
      this.viewports[sheetId] = adjustedViewport;
    this.updateSnap = false;
  }

  /** Will update the snapped viewport based on the "standard" viewport to ensure its
   * offsets match the start of the viewport left (resp. top) column (resp. row). */
  private snapViewportToCell(sheetId: UID) {
    const { cols, rows } = this.getters.getSheet(sheetId);
    const viewport = this.getViewport(sheetId);
    const adjustedViewport = Object.assign({}, viewport);
    this.adjustViewportOffsetX(sheetId, adjustedViewport);
    this.adjustViewportOffsetY(sheetId, adjustedViewport);
    adjustedViewport.offsetX = cols[adjustedViewport.left].start;
    adjustedViewport.offsetY = rows[adjustedViewport.top].start;
    this.adjustViewportZone(sheetId, adjustedViewport);
    this.snappedViewports[sheetId] = adjustedViewport;
  }

  /**
   * Shift the viewport vertically and move the selection anchor
   * such that it remains at the same place relative to the
   * viewport top.
   */
  private shiftVertically(offset: number) {
    const { top, offsetX } = this.getActiveSnappedViewport();
    this.setViewportOffset(offsetX, offset);
    const { anchor } = this.getters.getSelection();
    const deltaRow = this.getActiveSnappedViewport().top - top;
    this.selection.selectCell(anchor[0], anchor[1] + deltaRow);
  }

  /**
   * Return the row at the viewport's top
   */
  private getActiveTopRow(): Row {
    const { top } = this.getActiveSnappedViewport();
    const sheet = this.getters.getActiveSheet();
    return this.getters.getRow(sheet.id, top)!;
  }
}
