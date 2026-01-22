import { clip } from "../../helpers";
import { InternalViewport } from "../../helpers/internal_viewport";
import { findCellInNewZone } from "../../helpers/zones";
import {
  Command,
  CommandResult,
  invalidateEvaluationCommands,
  LocalCommand,
  ResizeViewportCommand,
  SetViewportOffsetCommand,
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
  Position,
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
import { SheetView } from "./sheetview_helpers";

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
    "getAllActiveViewportsZonesAndRect",
    "getRect",
    "getFigureUI",
    "getPositionAnchorOffset",
    "getGridOffset",
    "getViewportZoomLevel",
    "getScrollBarWidth",
    "getMaximumSheetOffset",
  ] as const;

  private sheetsWithDirtyViewports: Set<UID> = new Set();
  private shouldAdjustViewports: boolean = false;

  private sheetViews: { [sheetId: UID]: SheetView } = {};

  // constructor(config: UIPluginConfig) {
  //   super(config);
  //   this.custom = config.custom;
  // }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "SET_VIEWPORT_OFFSET":
        return this.chainValidations(
          this.checkScrollingDirection,
          this.checkIfViewportsWillChange
        )(cmd);
      case "RESIZE_SHEETVIEW":
        return this.chainValidations(
          this.checkValuesAreDifferent,
          this.checkPositiveDimension
        )(cmd);
      default:
        return CommandResult.Success;
    }
  }

  private handleEvent(event: SelectionEvent) {
    const sheetId = this.getters.getActiveSheetId();
    if (event.options.scrollIntoView) {
      let { col, row } = findCellInNewZone(event.previousAnchor.zone, event.anchor.zone);
      if (event.mode === "updateAnchor") {
        const oldZone = event.previousAnchor.zone;
        const newZone = event.anchor.zone;
        // altering a zone should not move the viewport in a dimension that wasn't changed
        const { top, bottom, left, right } = this.getMainInternalViewport(sheetId);
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
        this.refreshViewport(this.getters.getActiveSheetId(), { col, row });
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
        this.resetViewports(this.getters.getActiveSheetId());
        break;
      case "UNDO":
      case "REDO":
        this.cleanViewports();
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
        }
        this.shouldAdjustViewports = true;
        break;
      case "RESIZE_SHEETVIEW":
        this.resizeSheetView(cmd.height, cmd.width, cmd.gridOffsetX, cmd.gridOffsetY);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.sheetViews[sheetId].setSheetViewOffset(cmd.offsetX, cmd.offsetY);
        break;
      case "SET_ZOOM":
        this.sheetViews[sheetId].zoomLevel = cmd.zoom || 1;
        break;
      case "SHIFT_VIEWPORT_DOWN":
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } = this.getMainInternalViewport(sheetId);
        const topRowDims = this.getters.getRowDimensions(sheetId, top);
        this.shiftVertically(topRowDims.start + viewportHeight - offsetCorrectionY);
        break;
      case "SHIFT_VIEWPORT_UP": {
        const sheetId = this.getters.getActiveSheetId();
        const { top, viewportHeight, offsetCorrectionY } = this.getMainInternalViewport(sheetId);
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
        this.cleanViewports();
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
      case "ACTIVATE_SHEET":
        this.sheetsWithDirtyViewports.add(cmd.sheetIdTo);
        break;
      case "SCROLL_TO_CELL":
        this.refreshViewport(this.getters.getActiveSheetId(), { col: cmd.col, row: cmd.row });
        break;
    }
  }

  finalize() {
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.resetViewports(sheetId);
      if (this.shouldAdjustViewports) {
        const position = this.getters.getSheetPosition(sheetId);
        this.getSubViewports(sheetId).forEach((viewport) => {
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
      if (!this.sheetViews[sheetId].viewports[sheetId]?.bottomRight) {
        this.resetViewports(sheetId);
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
    return this.sheetViews[sheetId].getColIndex(x);
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    return this.sheetViews[sheetId].getRowIndex(y);
  }

  getSheetViewDimensionWithHeaders(): DOMDimension {
    return this.sheetViews[sheetId].getSheetViewDimensionWithHeaders();
  }

  getSheetViewDimension(): DOMDimension {
    return this.sheetViews[sheetId].getSheetViewDimension();
  }

  getGridOffset(): DOMCoordinates {
    return this.sheetViews[sheetId].getGridOffset();
  }

  /** type as pane, not viewport but basically pane extends viewport */
  getActiveMainViewport(): Viewport {
    const sheetId = this.getters.getActiveSheetId();
    return this.getMainViewport(sheetId);
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetScrollInfo(): SheetDOMScrollInfo {
    return this.sheetViews[sheetId].getActiveSheetScrollInfo();
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    return this.sheetViews[sheetId].getSheetViewVisibleCols();
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    return this.sheetViews[sheetId].getSheetViewVisibleRows();
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    return this.sheetViews[sheetId].getVisibleCellPositions();
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  getMainViewportRect(): Rect {
    return this.sheetViews[sheetId].getMainViewportRect();
  }

  getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    return this.sheetViews[sheetId].getMaximumSheetOffset();
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceHeaderIndex: HeaderIndex,
    targetHeaderIndex: HeaderIndex
  ): Pixel {
    return this.sheetViews[sheetId].getColRowOffsetInViewport(
      dimension,
      referenceHeaderIndex,
      targetHeaderIndex
    );
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport({ sheetId, col, row }: CellPosition): boolean {
    return this.sheetViews[sheetId].isVisibleInViewport({ sheetId, col, row });
  }

  getScrollBarWidth(): Pixel {
    return this.sheetViews[sheetId].getScrollBarWidth();
  }

  // => returns the new offset
  getEdgeScrollCol(x: number, previousX: number, startingX: number): EdgeScrollInfo {
    return this.sheetViews[sheetId].getEdgeScrollCol(x, previousX, startingX);
  }

  getEdgeScrollRow(y: number, previousY: number, startingY: number): EdgeScrollInfo {
    return this.sheetViews[sheetId].getEdgeScrollRow(y, previousY, startingY);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getVisibleRect(zone: Zone): Rect {
    return this.sheetViews[sheetId].getVisibleRect(zone);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas after it has been zoomed
   */
  getVisibleRectWithZoom(zone: Zone): Rect {
    return this.sheetViews[sheetId].getVisibleRectWithZoom(zone);
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetViews[sheetId].getVisibleRectWithoutHeaders(zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRect(zone: Zone): Rect {
    return this.sheetViews[sheetId].getRect(zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetViews[sheetId].getRectWithoutHeaders(zone);
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    return this.sheetViews[sheetId].getMainViewportCoordinates();
  }

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    return this.sheetViews[sheetId].getColDimensionsInViewport(sheetId, col);
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    return this.sheetViews[sheetId].getRowDimensionsInViewport(sheetId, row);
  }

  getAllActiveViewportsZonesAndRect(): { zone: Zone; rect: Rect }[] {
    return this.sheetViews[sheetId].getAllActiveViewportsZonesAndRect();
  }

  getViewportZoomLevel(): number {
    return this.sheetViews[sheetId].getViewportZoomLevel();
  }

  getFrozenSheetViewRatio(sheetId: UID) {
    return this.sheetViews[sheetId].getFrozenSheetViewRatio();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private ensureSheetViewExist(sheetId: UID) {
    if (!this.sheetViews[sheetId]) {
      this.resetViewports(sheetId);
    }
  }

  private getSubViewports(sheetId: UID): InternalViewport[] {
    this.ensureSheetViewExist(sheetId);
    return this.sheetViews[sheetId]!.getSubViewports();
  }

  private checkPositiveDimension(cmd: ResizeViewportCommand) {
    if (cmd.width < 0 || cmd.height < 0) {
      return CommandResult.InvalidViewportSize;
    }
    return CommandResult.Success;
  }

  private checkValuesAreDifferent(cmd: ResizeViewportCommand) {
    const { height, width } = this.getSheetViewDimension();
    const sheetView = this.sheetViews[this.getters.getActiveSheetId()];
    if (
      cmd.gridOffsetX === sheetView.gridOffsetX &&
      cmd.gridOffsetY === sheetView.gridOffsetY &&
      cmd.width === width &&
      cmd.height === height
    ) {
      return CommandResult.ValuesNotChanged;
    }
    return CommandResult.Success;
  }

  private checkScrollingDirection({
    offsetX,
    offsetY,
  }: {
    offsetX: Pixel;
    offsetY: Pixel;
  }): CommandResult {
    const pane = this.getMainInternalViewport(this.getters.getActiveSheetId());
    if (
      (!pane.canScrollHorizontally && offsetX > 0) ||
      (!pane.canScrollVertically && offsetY > 0)
    ) {
      return CommandResult.InvalidScrollingDirection;
    }
    return CommandResult.Success;
  }

  private checkIfViewportsWillChange({ offsetX, offsetY }: SetViewportOffsetCommand) {
    const sheetId = this.getters.getActiveSheetId();
    const { maxOffsetX, maxOffsetY } = this.getMaximumSheetOffset();
    const willScroll = this.getSubViewports(sheetId).some((viewport) =>
      viewport.willNewOffsetScrollViewport(
        clip(offsetX, 0, maxOffsetX),
        clip(offsetY, 0, maxOffsetY)
      )
    );
    return willScroll ? CommandResult.Success : CommandResult.ViewportScrollLimitsReached;
  }

  private getMainViewport(sheetId: UID): Viewport {
    const viewport = this.getMainInternalViewport(sheetId);
    return {
      top: viewport.top,
      left: viewport.left,
      bottom: viewport.bottom,
      right: viewport.right,
    };
  }

  private getMainInternalViewport(sheetId: UID): InternalViewport {
    this.ensureSheetViewExist(sheetId);
    return this.sheetViews[sheetId]!.viewports.bottomRight;
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const sheetViews = {};
    for (const sheetId of this.getters.getSheetIds()) {
      sheetViews[sheetId] = this.sheetViews[sheetId];
    }
    this.sheetViews = sheetViews;
  }

  private resizeSheetView(
    height: Pixel,
    width: Pixel,
    gridOffsetX: Pixel = 0,
    gridOffsetY: Pixel = 0
  ) {
    for (const sheetId of this.getters.getSheetIds()) {
      const sheetView = this.sheetViews[sheetId];
      sheetView.sheetViewHeight = height;
      sheetView.sheetViewWidth = width;
      sheetView.gridOffsetX = gridOffsetX;
      sheetView.gridOffsetY = gridOffsetY;
    }
    this.recomputeViewports();
  }

  private recomputeViewports() {
    for (const sheetId of this.getters.getSheetIds()) {
      this.resetViewports(sheetId);
    }
  }

  private setSheetViewOffset(offsetX: Pixel, offsetY: Pixel) {
    const sheetId = this.getters.getActiveSheetId();
    const { maxOffsetX, maxOffsetY } = this.getMaximumSheetOffset();
    this.getSubViewports(sheetId).forEach((viewport) =>
      viewport.setViewportOffset(clip(offsetX, 0, maxOffsetX), clip(offsetY, 0, maxOffsetY))
    );
  }

  private getViewportOffset(sheetId: UID) {
    return {
      x: this.viewports[sheetId]?.bottomRight.offsetX || 0,
      y: this.viewports[sheetId]?.bottomRight.offsetY || 0,
    };
  }

  private resetViewports(sheetId: UID) {
    if (!this.getters.tryGetSheet(sheetId)) {
      return;
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const nCols = this.getters.getNumberCols(sheetId);
    const nRows = this.getters.getNumberRows(sheetId);
    const colOffset = Math.min(
      this.getters.getColRowOffset("COL", 0, xSplit, sheetId),
      this.sheetViewWidth
    );
    const rowOffset = Math.min(
      this.getters.getColRowOffset("ROW", 0, ySplit, sheetId),
      this.sheetViewHeight
    );
    const unfrozenWidth = Math.max(this.sheetViewWidth - colOffset, 0);
    const unfrozenHeight = Math.max(this.sheetViewHeight - rowOffset, 0);
    const { xRatio, yRatio } = this.getFrozenSheetViewRatio(sheetId);
    const canScrollHorizontally = xRatio < 1.0;
    const canScrollVertically = yRatio < 1.0;
    const previousOffset = this.getViewportOffset(sheetId);

    const sheetViewports: SheetViewports = {
      topLeft:
        (ySplit &&
          xSplit &&
          new InternalViewport(
            this.getters,
            sheetId,
            { left: 0, right: xSplit - 1, top: 0, bottom: ySplit - 1 },
            { width: colOffset, height: rowOffset },
            { canScrollHorizontally: false, canScrollVertically: false },
            { x: 0, y: 0 }
          )) ||
        undefined,
      topRight:
        (ySplit &&
          new InternalViewport(
            this.getters,
            sheetId,
            { left: xSplit, right: nCols - 1, top: 0, bottom: ySplit - 1 },
            { width: unfrozenWidth, height: rowOffset },
            { canScrollHorizontally, canScrollVertically: false },
            { x: canScrollHorizontally ? previousOffset.x : 0, y: 0 }
          )) ||
        undefined,
      bottomLeft:
        (xSplit &&
          new InternalViewport(
            this.getters,
            sheetId,
            { left: 0, right: xSplit - 1, top: ySplit, bottom: nRows - 1 },
            { width: colOffset, height: unfrozenHeight },
            { canScrollHorizontally: false, canScrollVertically },
            { x: 0, y: canScrollVertically ? previousOffset.y : 0 }
          )) ||
        undefined,
      bottomRight: new InternalViewport(
        this.getters,
        sheetId,
        { left: xSplit, right: nCols - 1, top: ySplit, bottom: nRows - 1 },
        {
          width: unfrozenWidth,
          height: unfrozenHeight,
        },
        { canScrollHorizontally, canScrollVertically },
        {
          x: canScrollHorizontally ? previousOffset.x : 0,
          y: canScrollVertically ? previousOffset.y : 0,
        }
      ),
    };
    this.viewports[sheetId] = sheetViewports;
  }

  /**
   * Adjust the viewport such that the anchor position is visible
   */
  private refreshViewport(sheetId: UID, anchorPosition: Position) {
    this.getSubViewports(sheetId).forEach((viewport) => {
      viewport.adjustViewportZone();
      viewport.adjustPosition(anchorPosition);
    });
  }

  /**
   * Shift the viewport vertically and move the selection anchor
   * such that it remains at the same place relative to the
   * viewport top.
   */
  private shiftVertically(offset: Pixel) {
    const sheetId = this.getters.getActiveSheetId();
    const { top } = this.getMainInternalViewport(sheetId);
    const { scrollX } = this.getActiveSheetScrollInfo();
    this.setSheetViewOffset(scrollX, offset);
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.getMainInternalViewport(sheetId).top - top;
      this.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
    }
  }

  /**
   * Return the index of a col given a negative offset x, based on the main viewport top
   * visible cell of the main viewport.
   * It returns -1 if no col is found.
   */
  private getColIndexLeftOfMainViewport(x: Pixel): HeaderIndex {
    if (x >= 0) {
      return -1;
    }
    const sheetId = this.getters.getActiveSheetId();
    let col = this.getActiveMainViewport().left;
    let colStart =
      -this.getActiveSheetScrollInfo().scrollX - this.getters.getColRowOffset("COL", col, 0);
    for (; x < colStart; col--) {
      colStart -= this.getters.getColSize(sheetId, col - 1);
    }
    return Math.max(col, 0);
  }

  /**
   * Return the index of a row given a negative offset y, based on the main viewport top
   * visible cell of the main viewport.
   * It returns -1 if no row is found.
   */
  private getRowIndexTopOfMainViewport(y: Pixel): HeaderIndex {
    if (y >= 0) {
      return -1;
    }
    const sheetId = this.getters.getActiveSheetId();
    let row = this.getActiveMainViewport().top;
    let rowStart =
      -this.getActiveSheetScrollInfo().scrollY - this.getters.getColRowOffset("ROW", row, 0);
    for (; y < rowStart; row--) {
      rowStart -= this.getters.getRowSize(sheetId, row - 1);
    }
    return Math.max(row, 0);
  }

  getVisibleFigures(): FigureUI[] {
    const sheetId = this.getters.getActiveSheetId();
    const result: FigureUI[] = [];
    const figures = this.getters.getFigures(sheetId);
    const { scrollX, scrollY } = this.getters.getActiveSheetScrollInfo();
    const { x: offsetCorrectionX, y: offsetCorrectionY } = this.getMainViewportCoordinates();
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();

    for (const figure of figures) {
      const figureUI = this.getFigureUI(sheetId, figure);
      const { x, y } = figureUI;
      if (
        x >= offsetCorrectionX &&
        (x + figure.width < scrollX + offsetCorrectionX || x > width + scrollX + offsetCorrectionX)
      ) {
        continue;
      } else if (
        y >= offsetCorrectionY &&
        (y + figure.height < scrollY + offsetCorrectionY ||
          y > height + scrollY + offsetCorrectionY)
      ) {
        continue;
      }
      result.push(figureUI);
    }
    return result;
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    const x = figure.offset.x + this.getters.getColDimensions(sheetId, figure.col).start;
    const y = figure.offset.y + this.getters.getRowDimensions(sheetId, figure.row).start;
    return { ...figure, x, y };
  }

  getPositionAnchorOffset(position: PixelPosition): AnchorOffset {
    const { scrollX, scrollY } = this.getters.getActiveSheetScrollInfo();
    const x = position.x - scrollX;
    const y = position.y - scrollY;
    const col = x >= 0 ? this.getColIndex(x) : this.getColIndexLeftOfMainViewport(x);
    const row = y >= 0 ? this.getRowIndex(y) : this.getRowIndexTopOfMainViewport(y);
    const { x: colX, y: rowY } = this.getRect(positionToZone({ col, row }));
    return {
      col,
      row,
      offset: {
        x: Math.max(x - colX + this.gridOffsetX, 0),
        y: Math.max(y - rowY + this.gridOffsetY, 0),
      },
    };
  }

  isPixelPositionVisible(position: PixelPosition): boolean {
    const { scrollX, scrollY } = this.getters.getActiveSheetScrollInfo();
    const { x: mainViewportX, y: mainViewportY } = this.getters.getMainViewportCoordinates();
    const { width, height } = this.getters.getSheetViewDimension();

    if (
      position.x >= mainViewportX &&
      (position.x < mainViewportX + scrollX || position.x > width + scrollX + mainViewportX)
    ) {
      return false;
    }
    if (
      position.y >= mainViewportY &&
      (position.y < mainViewportY + scrollY || position.y > height + scrollY + mainViewportY)
    ) {
      return false;
    }

    return true;
  }

  mapViewportsToRect(
    sheetId: UID,
    rectCallBack: (viewport: InternalViewport) => Rect | undefined
  ): Rect {
    let x: Pixel = Infinity;
    let y: Pixel = Infinity;
    let width: Pixel = 0;
    let height: Pixel = 0;
    let hasViewports: boolean = false;
    for (const viewport of this.getSubViewports(sheetId)) {
      const rect = rectCallBack(viewport);
      if (rect) {
        hasViewports = true;
        x = Math.min(x, rect.x);
        y = Math.min(y, rect.y);
        width = Math.max(width, rect.x + rect.width);
        height = Math.max(height, rect.y + rect.height);
      }
    }
    if (!hasViewports) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return { x, y, width: width - x, height: height - y };
  }
}
