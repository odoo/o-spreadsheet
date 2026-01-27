import { SCROLLBAR_WIDTH } from "../../constants";
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
import { ViewportCollection } from "./sheetview_class";
import {
  getSheetViewVisibleCols,
  getSheetViewVisibleRows,
  SheetViewContext,
} from "./sheetview_helpers";

/**
 *   EdgeScrollCases Schema
 *
 *  The dots/double dots represent a freeze (= a split of viewports)
 *  In this example, we froze vertically between columns D and E
 *  and horizontally between rows 4 and 5.
 *
 *  One can see that we scrolled horizontally from column E to G and
 *  vertically from row 5 to 7.
 *
 *     A  B  C  D   G  H  I  J  K  L  M  N  O  P  Q  R  S  T
 *     _______________________________________________________
 *  1 |           :                                           |
 *  2 |           :                                           |
 *  3 |           :        B   ↑                 6            |
 *  4 |           :        |   |                 |            |
 *     ····················+···+·················+············|
 *  7 |           :        |   |                 |            |
 *  8 |           :        ↓   2                 |            |
 *  9 |           :                              |            |
 * 10 |       A --+--→                           |            |
 * 11 |           :                              |            |
 * 12 |           :                              |            |
 * 13 |        ←--+-- 1                          |            |
 * 14 |           :                              |        3 --+--→
 * 15 |           :                              |            |
 * 16 |           :                              |            |
 * 17 |       5 --+-------------------------------------------+--→
 * 18 |           :                              |            |
 * 19 |           :                  4           |            |
 * 20 |           :                  |           |            |
 *     ______________________________+___________| ____________
 *                                   |           |
 *                                   ↓           ↓
 */

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
    "getSheetViewCtx",
  ] as const;

  private sheetView: ViewportCollection = new ViewportCollection(this.getters);

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
          () => this.sheetView.checkScrollingDirection.call(this.sheetView, sheetId, cmd),
          () => this.sheetView.checkIfViewportsWillChange.call(this.sheetView, sheetId, cmd)
        )(cmd);
      }
      case "RESIZE_SHEETVIEW":
        return this.chainValidations(
          () => this.sheetView.checkValuesAreDifferent.call(this.sheetView, cmd),
          () => this.sheetView.checkPositiveDimension.call(this.sheetView, cmd)
        )(cmd);
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
        const { top, bottom, left, right } = this.sheetView.getMainInternalViewport(sheetId);
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
        this.sheetView.refreshViewport(this.getters.getActiveSheetId(), { col, row });
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
        this.sheetView.resetViewports(this.getters.getActiveSheetId());
        break;
      case "UNDO":
      case "REDO":
        this.sheetView.cleanViewports();
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
        }
        this.shouldAdjustViewports = true;
        break;
      case "RESIZE_SHEETVIEW":
        this.sheetView.resizeSheetView(cmd.height, cmd.width, cmd.gridOffsetX, cmd.gridOffsetY);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.sheetView.setSheetViewOffset(
          this.getters.getActiveSheetId(),
          cmd.offsetX,
          cmd.offsetY
        );
        break;
      case "SET_ZOOM":
        this.sheetView.zoomLevel = cmd.zoom || 1;
        break;
      case "SHIFT_VIEWPORT_DOWN":
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } =
          this.sheetView.getMainInternalViewport(sheetId);
        const topRowDims = this.getters.getRowDimensions(sheetId, top);
        this.shiftVertically(topRowDims.start + viewportHeight - offsetCorrectionY);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } =
          this.sheetView.getMainInternalViewport(sheetId);
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
      case "SET_FORMATTING":
        // update cell content or format can change hidden rows because of data filters
        if (
          "content" in cmd ||
          "format" in cmd ||
          cmd.style?.fontSize !== undefined ||
          cmd.style?.wrapping !== undefined
        ) {
          for (const sheetId of this.getters.getSheetIds()) {
            this.sheetsWithDirtyViewports.add(sheetId);
          }
        }
        break;
      case "DELETE_SHEET":
        this.sheetView.cleanViewports();
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
      case "ACTIVATE_SHEET":
        this.sheetsWithDirtyViewports.add(cmd.sheetIdTo);
        break;
      case "SCROLL_TO_CELL":
        this.sheetView.refreshViewport(this.getters.getActiveSheetId(), {
          col: cmd.col,
          row: cmd.row,
        });
        break;
    }
  }

  finalize() {
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.sheetView.resetViewports(sheetId);
      if (this.shouldAdjustViewports) {
        const position = this.getters.getSheetPosition(sheetId);
        this.sheetView.getSubViewports(sheetId).forEach((viewport) => {
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
      if (!this.sheetView.viewports[sheetId]?.bottomRight) {
        this.sheetView.resetViewports(sheetId);
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
    return this.sheetView.getColIndex(sheetId, x);
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getRowIndex(sheetId, y);
  }

  getSheetViewDimensionWithHeaders(): DOMDimension {
    return this.sheetView.getSheetViewDimensionWithHeaders();
  }

  getSheetViewDimension(): DOMDimension {
    return this.sheetView.getSheetViewDimension();
  }

  getGridOffset(): DOMCoordinates {
    return this.sheetView.getGridOffset();
  }

  /** type as pane, not viewport but basically pane extends viewport */
  getActiveMainViewport(): Viewport {
    return this.sheetView.getMainViewport(this.getters.getActiveSheetId());
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetScrollInfo(): SheetDOMScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getActiveSheetScrollInfo(sheetId);
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    return getSheetViewVisibleCols(this.getSheetViewCtx());
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    return getSheetViewVisibleRows(this.getSheetViewCtx());
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getVisibleCellPositions(sheetId);
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  getMainViewportRect(): Rect {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getMainViewportRect(sheetId);
  }

  getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getMaximumSheetOffset(sheetId);
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceHeaderIndex: HeaderIndex,
    targetHeaderIndex: HeaderIndex
  ): Pixel {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getColRowOffsetInViewport(
      sheetId,
      dimension,
      referenceHeaderIndex,
      targetHeaderIndex
    );
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport(cellPosition: CellPosition): boolean {
    return this.sheetView.isVisibleInViewport(cellPosition);
  }

  getScrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.sheetView.zoomLevel;
  }

  // => returns the new offset
  getEdgeScrollCol(x: number, previousX: number, startingX: number): EdgeScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getEdgeScrollCol(sheetId, x, previousX, startingX);
  }

  getEdgeScrollRow(y: number, previousY: number, startingY: number): EdgeScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    return this.sheetView.getEdgeScrollRow(sheetId, y, previousY, startingY);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getVisibleRect(zone: Zone): Rect {
    return this.sheetView.getVisibleRect(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas after it has been zoomed
   */
  getVisibleRectWithZoom(zone: Zone): Rect {
    return this.sheetView.getVisibleRectWithZoom(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetView.getVisibleRectWithoutHeaders(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRect(zone: Zone): Rect {
    return this.sheetView.getRect(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetView.getRectWithoutHeaders(this.getters.getActiveSheetId(), zone);
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    return this.sheetView.getMainViewportCoordinates(this.getters.getActiveSheetId());
  }

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    return this.sheetView.getColDimensionsInViewport(sheetId, col);
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    return this.sheetView.getRowDimensionsInViewport(sheetId, row);
  }

  getViewportZoomLevel(): number {
    return this.sheetView.zoomLevel;
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
    const { top } = this.sheetView.getMainInternalViewport(sheetId);
    const { scrollX } = this.getActiveSheetScrollInfo();
    this.sheetView.setSheetViewOffset(sheetId, scrollX, offset);
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.sheetView.getMainInternalViewport(sheetId).top - top;
      this.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
    }
  }

  getVisibleFigures(): FigureUI[] {
    return this.sheetView.getVisibleFigures(this.getters.getActiveSheetId());
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    return this.sheetView.getFigureUI(sheetId, figure);
  }

  getPositionAnchorOffset(position: PixelPosition): AnchorOffset {
    return this.sheetView.getPositionAnchorOffset(this.getters.getActiveSheetId(), position);
  }

  isPixelPositionVisible(position: PixelPosition): boolean {
    return this.sheetView.isPixelPositionVisible(this.getters.getActiveSheetId(), position);
  }

  getFrozenSheetViewRatio(sheetId: UID) {
    return this.sheetView.getFrozenSheetViewRatio(sheetId);
  }

  getSheetViewCtx(): SheetViewContext {
    return this.sheetView.getSheetViewCtx(this.getters.getActiveSheetId());
  }
}
