import { SCROLLBAR_WIDTH } from "../../constants";
import { ViewportCollection } from "../../helpers/viewport_collection";
import { findCellInNewZone, isEqual } from "../../helpers/zones";
import {
  Command,
  CommandResult,
  invalidateEvaluationCommands,
  LocalCommand,
} from "../../types/commands";
import { SelectionEvent } from "../../types/event_stream";
import { AnchorOffset, Figure, FigureUI } from "../../types/figure";
import {
  CellPosition,
  Dimension,
  HeaderDimensions,
  HeaderIndex,
  Pixel,
  PixelPosition,
  UID,
  Zone,
} from "../../types/misc";
import {
  DOMCoordinates,
  DOMDimension,
  EdgeScrollInfo,
  Rect,
  SheetDOMScrollInfo,
  Viewport,
} from "../../types/rendering";
import { UIPlugin } from "../ui_plugin";

/**
 * Viewport plugin.
 *
 * This plugin manages all things related to all viewport states.
 *
 */
export class SheetViewPlugin extends UIPlugin {
  static getters = [
    "getColIndex",
    "getRowIndex",
    "getActiveMainViewport",
    "getSheetViewDimension",
    "getSheetViewDimensionWithHeaders",
    "getMainViewportRect",
    "isVisibleInViewport",
    "getEdgeScrollCol",
    "getEdgeScrollRow",
    "getVisibleFigures",
    "getVisibleRect",
    "getVisibleRectWithoutHeaders",
    "getVisibleRectWithZoom",
    "getVisibleCellPositions",
    "getColRowOffsetInViewport",
    "getMainViewportCoordinates",
    "getActiveSheetScrollInfo",
    "getSheetViewVisibleCols",
    "getSheetViewVisibleRows",
    "getFrozenSheetViewRatio",
    "isPixelPositionVisible",
    "getColDimensionsInViewport",
    "getRowDimensionsInViewport",
    "getRect",
    "getFigureUI",
    "getPositionAnchorOffset",
    "getGridOffset",
    "getViewportZoomLevel",
    "getScrollBarWidth",
    "getMaximumSheetOffset",
    "getViewportCollection",
  ] as const;

  private viewports: ViewportCollection = new ViewportCollection(this.getters);

  private sheetsWithDirtyViewports: Set<UID> = new Set();
  private shouldAdjustViewports: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "SET_VIEWPORT_OFFSET": {
        const sheetId = this.getters.getActiveSheetId();
        return this.chainValidations(
          () => this.viewports.checkScrollingDirection.call(this.viewports, sheetId, cmd),
          () => this.viewports.checkIfViewportsWillChange.call(this.viewports, sheetId, cmd)
        )(cmd);
      }
      case "RESIZE_SHEETVIEW":
        return this.chainValidations(
          () => this.viewports.checkValuesAreDifferent.call(this.viewports, cmd),
          () => this.viewports.checkPositiveDimension.call(this.viewports, cmd)
        )(cmd);
      case "SET_ZOOM":
        if (cmd.zoom > 2 || cmd.zoom < 0.5) {
          return CommandResult.InvalidZoomLevel;
        } else {
          return CommandResult.Success;
        }
      default:
        return CommandResult.Success;
    }
  }

  private handleEvent(event: SelectionEvent) {
    const sheetId = this.getters.getActiveSheetId();
    if (event.options.scrollIntoView) {
      const oldZone = event.previousAnchor.zone;
      const newZone = event.anchor.zone;
      const isUpdateAnchorEvent = event.mode === "updateAnchor";
      const sameZone = isEqual(oldZone, newZone);
      let { col, row } =
        isUpdateAnchorEvent && sameZone ? event.anchor.cell : findCellInNewZone(oldZone, newZone);
      if (isUpdateAnchorEvent && !sameZone) {
        // altering a zone should not move the viewport in a dimension that wasn't changed
        const { top, bottom, left, right } = this.viewports.getMainInternalViewport(sheetId);
        if (oldZone.left === newZone.left && oldZone.right === newZone.right) {
          col = left > col || col > right ? left : col;
        }
        if (oldZone.top === newZone.top && oldZone.bottom === newZone.bottom) {
          row = top > row || row > bottom ? top : row;
        }
      }
      col = Math.min(col, this.getters.getNumberCols(sheetId) - 1);
      row = Math.min(row, this.getters.getNumberRows(sheetId) - 1);
      if (!this.sheetsWithDirtyViewports.has(sheetId)) {
        this.viewports.refreshViewport(this.getters.getActiveSheetId(), { col, row });
      }
    }
  }

  handle(cmd: Command) {
    // changing the evaluation can hide/show rows because of data filters
    if (invalidateEvaluationCommands.has(cmd.type)) {
      for (const sheetId of this.getters.getSheetIds()) {
        this.sheetsWithDirtyViewports.add(sheetId);
      }
    }

    switch (cmd.type) {
      case "START":
        this.selection.observe(this, {
          handleEvent: this.handleEvent.bind(this),
        });
        this.viewports.resetViewports(this.getters.getActiveSheetId());
        break;
      case "UNDO":
      case "REDO":
        this.viewports.cleanViewports();
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
        }
        this.shouldAdjustViewports = true;
        break;
      case "RESIZE_SHEETVIEW":
        this.viewports.resizeSheetView(cmd.height, cmd.width, cmd.gridOffsetX, cmd.gridOffsetY);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.viewports.setSheetViewOffset(
          this.getters.getActiveSheetId(),
          cmd.offsetX,
          cmd.offsetY
        );
        break;
      case "SET_ZOOM":
        this.viewports.zoomLevel = cmd.zoom || 1;
        break;
      case "SHIFT_VIEWPORT_DOWN":
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } =
          this.viewports.getMainInternalViewport(sheetId);
        const topRowDims = this.getters.getRowDimensions(sheetId, top);
        this.shiftVertically(topRowDims.start + viewportHeight - offsetCorrectionY);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } =
          this.viewports.getMainInternalViewport(sheetId);
        const topRowDims = this.getters.getRowDimensions(sheetId, top);
        this.shiftVertically(topRowDims.end - offsetCorrectionY - viewportHeight);
        break;
      }
      case "REMOVE_TABLE":
      case "UPDATE_TABLE":
      case "UPDATE_FILTER":
      case "UNFREEZE_ROWS":
      case "UNFREEZE_COLUMNS":
      case "FREEZE_COLUMNS":
      case "FREEZE_ROWS":
      case "UNFREEZE_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "RESIZE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "UNGROUP_HEADERS":
      case "GROUP_HEADERS":
      case "FOLD_HEADER_GROUP":
      case "UNFOLD_HEADER_GROUP":
      case "FOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_ALL_HEADER_GROUPS":
      case "FOLD_ALL_HEADER_GROUPS":
        this.sheetsWithDirtyViewports.add(cmd.sheetId);
        break;
      case "UPDATE_CELL":
        // update cell content or format can change hidden rows because of data filters
        if ("content" in cmd || "format" in cmd || cmd.style?.fontSize !== undefined) {
          for (const sheetId of this.getters.getSheetIds()) {
            this.sheetsWithDirtyViewports.add(sheetId);
          }
        }
        break;
      case "DELETE_SHEET":
        this.viewports.cleanViewports();
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
      case "ACTIVATE_SHEET":
        this.sheetsWithDirtyViewports.add(cmd.sheetIdTo);
        break;
      case "SCROLL_TO_CELL":
        this.viewports.refreshViewport(this.getters.getActiveSheetId(), {
          col: cmd.col,
          row: cmd.row,
        });
        break;
    }
  }

  finalize() {
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.viewports.resetViewports(sheetId);
      if (this.shouldAdjustViewports) {
        const position = this.getters.getSheetPosition(sheetId);
        this.viewports.getSubViewports(sheetId).forEach((viewport) => {
          viewport.adjustPosition(position);
        });
      }
    }
    this.sheetsWithDirtyViewports = new Set();
    this.shouldAdjustViewports = false;
    this.setViewports();
  }

  private setViewports() {
    const sheetIds = this.getters.getSheetIds();
    for (const sheetId of sheetIds) {
      if (!this.viewports.viewports[sheetId]?.bottomRight) {
        this.viewports.resetViewports(sheetId);
      }
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
  getColIndex(x: Pixel): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    return this.viewports.getColIndex(sheetId, x);
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    return this.viewports.getRowIndex(sheetId, y);
  }

  getSheetViewDimensionWithHeaders(): DOMDimension {
    return this.viewports.getSheetViewDimensionWithHeaders();
  }

  getSheetViewDimension(): DOMDimension {
    return this.viewports.getSheetViewDimension();
  }

  getGridOffset(): DOMCoordinates {
    return this.viewports.getGridOffset();
  }

  /** type as pane, not viewport but basically pane extends viewport */
  getActiveMainViewport(): Viewport {
    return this.viewports.getMainViewport(this.getters.getActiveSheetId());
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetScrollInfo(): SheetDOMScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.viewports.getSheetScrollInfo(sheetId);
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    return this.viewports.getSheetViewVisibleCols(this.getters.getActiveSheetId());
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    return this.viewports.getSheetViewVisibleRows(this.getters.getActiveSheetId());
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    return this.viewports.getVisibleCellPositions(this.getters.getActiveSheetId());
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  getMainViewportRect(): Rect {
    return this.viewports.getMainViewportRect(this.getters.getActiveSheetId());
  }

  getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    return this.viewports.getMaximumSheetOffset(this.getters.getActiveSheetId());
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceHeaderIndex: HeaderIndex,
    targetHeaderIndex: HeaderIndex
  ): Pixel {
    return this.viewports.getColRowOffsetInViewport(
      this.getters.getActiveSheetId(),
      dimension,
      referenceHeaderIndex,
      targetHeaderIndex
    );
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport(cellPosition: CellPosition): boolean {
    return this.viewports.isVisibleInViewport(cellPosition);
  }

  getScrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.viewports.zoomLevel;
  }

  // => returns the new offset
  getEdgeScrollCol(x: number, previousX: number, startingX: number): EdgeScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.viewports.getEdgeScrollCol(sheetId, x, previousX, startingX);
  }

  getEdgeScrollRow(y: number, previousY: number, startingY: number): EdgeScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.viewports.getEdgeScrollRow(sheetId, y, previousY, startingY);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getVisibleRect(zone: Zone): Rect {
    return this.viewports.getVisibleRect(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas after it has been zoomed
   */
  getVisibleRectWithZoom(zone: Zone): Rect {
    return this.viewports.getVisibleRectWithZoom(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    return this.viewports.getVisibleRectWithoutHeaders(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRect(zone: Zone): Rect {
    return this.viewports.getRect(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRectWithoutHeaders(zone: Zone): Rect {
    return this.viewports.getRectWithoutHeaders(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    return this.viewports.getMainViewportCoordinates(this.getters.getActiveSheetId());
  }

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    return this.viewports.getColDimensionsInViewport(sheetId, col);
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    return this.viewports.getRowDimensionsInViewport(sheetId, row);
  }

  getViewportZoomLevel(): number {
    return this.viewports.zoomLevel;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Shift the viewport vertically and move the selection anchor
   * such that it remains at the same place relative to the
   * viewport top.
   */
  private shiftVertically(offset: Pixel) {
    const sheetId = this.getters.getActiveSheetId();
    const { top } = this.viewports.getMainInternalViewport(sheetId);
    const { scrollX } = this.getActiveSheetScrollInfo();
    this.viewports.setSheetViewOffset(sheetId, scrollX, offset);
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.viewports.getMainInternalViewport(sheetId).top - top;
      this.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
    }
  }

  getVisibleFigures(): FigureUI[] {
    return this.viewports.getVisibleFigures(this.getters.getActiveSheetId());
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    return this.viewports.getFigureUI(sheetId, figure);
  }

  getPositionAnchorOffset(position: PixelPosition): AnchorOffset {
    return this.viewports.getPositionAnchorOffset(this.getters.getActiveSheetId(), position);
  }

  isPixelPositionVisible(position: PixelPosition): boolean {
    return this.viewports.isPixelPositionVisible(this.getters.getActiveSheetId(), position);
  }

  getFrozenSheetViewRatio(sheetId: UID) {
    return this.viewports.getFrozenSheetViewRatio(sheetId);
  }

  getViewportCollection(): ViewportCollection {
    return this.viewports;
  }
}
