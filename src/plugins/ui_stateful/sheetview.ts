import { getDefaultSheetViewSize } from "../../constants";
import { clip, findCellInNewZone, isDefined, range } from "../../helpers";
import { scrollDelay } from "../../helpers/index";
import { InternalViewport } from "../../helpers/internal_viewport";
import { SelectionEvent } from "../../types/event_stream";
import {
  CellPosition,
  Command,
  CommandResult,
  DOMCoordinates,
  DOMDimension,
  Dimension,
  EdgeScrollInfo,
  Figure,
  HeaderIndex,
  LocalCommand,
  Pixel,
  Position,
  Rect,
  ResizeViewportCommand,
  ScrollDirection,
  SheetDOMScrollInfo,
  SheetScrollInfo,
  UID,
  Viewport,
  Zone,
  invalidateEvaluationCommands,
} from "../../types/index";
import { PixelPosition } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

type SheetViewports = {
  topLeft: InternalViewport | undefined;
  bottomLeft: InternalViewport | undefined;
  topRight: InternalViewport | undefined;
  bottomRight: InternalViewport;
};

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
    "getVisibleCellPositions",
    "getColRowOffsetInViewport",
    "getMainViewportCoordinates",
    "getActiveSheetScrollInfo",
    "getActiveSheetDOMScrollInfo",
    "getSheetViewVisibleCols",
    "getSheetViewVisibleRows",
    "getFrozenSheetViewRatio",
    "isPositionVisible",
  ] as const;

  readonly viewports: Record<UID, SheetViewports | undefined> = {};

  /**
   * The viewport dimensions are usually set by one of the components
   * (i.e. when grid component is mounted) to properly reflect its state in the DOM.
   * In the absence of a component (standalone model), is it mandatory to set reasonable default values
   * to ensure the correct operation of this plugin.
   */
  private sheetViewWidth: Pixel = getDefaultSheetViewSize();
  private sheetViewHeight: Pixel = getDefaultSheetViewSize();
  private gridOffsetX: Pixel = 0;
  private gridOffsetY: Pixel = 0;

  private sheetsWithDirtyViewports: Set<UID> = new Set();
  private shouldAdjustViewports: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "SET_VIEWPORT_OFFSET":
        return this.checkScrollingDirection(cmd);
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
    this.cleanViewports();
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
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
        }
        this.shouldAdjustViewports = true;
        break;
      case "RESIZE_SHEETVIEW":
        this.resizeSheetView(cmd.height, cmd.width, cmd.gridOffsetX, cmd.gridOffsetY);
        break;
      case "SET_VIEWPORT_OFFSET":
        this.setSheetViewOffset(cmd.offsetX, cmd.offsetY);
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
      case "REMOVE_FILTER_TABLE":
      case "UPDATE_FILTER":
        this.sheetsWithDirtyViewports.add(cmd.sheetId);
        break;
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
      case "FOLD_ALL_HEADER_GROUPS": {
        const sheetId = "sheetId" in cmd ? cmd.sheetId : this.getters.getActiveSheetId();
        this.sheetsWithDirtyViewports.add(sheetId);
        break;
      }
      case "UPDATE_CELL":
        // update cell content or format can change hidden rows because of data filters
        if ("content" in cmd || "format" in cmd || cmd.style?.fontSize !== undefined) {
          for (const sheetId of this.getters.getSheetIds()) {
            this.sheetsWithDirtyViewports.add(sheetId);
          }
        }
        break;
      case "ACTIVATE_SHEET":
        this.sheetsWithDirtyViewports.add(cmd.sheetIdTo);
        break;
      case "UNFREEZE_ROWS":
      case "UNFREEZE_COLUMNS":
      case "FREEZE_COLUMNS":
      case "FREEZE_ROWS":
      case "UNFREEZE_COLUMNS_ROWS":
        this.resetViewports(this.getters.getActiveSheetId());
        break;
      case "DELETE_SHEET":
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
      case "START_EDITION":
        const { col, row } = this.getters.getActivePosition();
        this.refreshViewport(this.getters.getActiveSheetId(), { col, row });
        break;
    }
  }

  finalize() {
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.resetViewports(sheetId);
      if (this.shouldAdjustViewports) {
        const position = this.getters.getSheetPosition(sheetId);
        const viewports = this.getSubViewports(sheetId);
        Object.values(viewports).forEach((viewport) => {
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
      if (!this.viewports[sheetId]?.bottomRight) {
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
    const sheetId = this.getters.getActiveSheetId();
    return Math.max(...this.getSubViewports(sheetId).map((viewport) => viewport.getColIndex(x)));
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    return Math.max(...this.getSubViewports(sheetId).map((viewport) => viewport.getRowIndex(y)));
  }

  getSheetViewDimensionWithHeaders(): DOMDimension {
    return {
      width: this.sheetViewWidth + this.gridOffsetX,
      height: this.sheetViewHeight + this.gridOffsetY,
    };
  }

  getSheetViewDimension(): DOMDimension {
    return {
      width: this.sheetViewWidth,
      height: this.sheetViewHeight,
    };
  }

  /** type as pane, not viewport but basically pane extends viewport */
  getActiveMainViewport(): Viewport {
    const sheetId = this.getters.getActiveSheetId();
    return this.getMainViewport(sheetId);
  }

  /**
   * Return the scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, snapped to the columns/rows.
   */
  getActiveSheetScrollInfo(): SheetScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    const viewport = this.getMainInternalViewport(sheetId);
    return {
      scrollX: viewport.offsetX,
      scrollY: viewport.offsetY,
    };
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetDOMScrollInfo(): SheetDOMScrollInfo {
    const sheetId = this.getters.getActiveSheetId();
    const viewport = this.getMainInternalViewport(sheetId);
    return {
      scrollX: viewport.offsetScrollbarX,
      scrollY: viewport.offsetScrollbarY,
    };
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    const sheetId = this.getters.getActiveSheetId();
    const viewports = this.getSubViewports(sheetId);

    //TODO ake another commit to eimprove this
    return [...new Set(viewports.map((v) => range(v.left, v.right + 1)).flat())].filter(
      (col) => !this.getters.isHeaderHidden(sheetId, "COL", col)
    );
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    const sheetId = this.getters.getActiveSheetId();
    const viewports = this.getSubViewports(sheetId);
    return [...new Set(viewports.map((v) => range(v.top, v.bottom + 1)).flat())].filter(
      (row) => !this.getters.isHeaderHidden(sheetId, "ROW", row)
    );
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    const visibleCols = this.getSheetViewVisibleCols();
    const visibleRows = this.getSheetViewVisibleRows();
    const sheetId = this.getters.getActiveSheetId();

    const positions: CellPosition[] = [];
    for (const col of visibleCols) {
      for (const row of visibleRows) {
        const position = { sheetId, col, row };
        const mainPosition = this.getters.getMainCellPosition(position);
        if (mainPosition.row !== row || mainPosition.col !== col) {
          continue;
        }
        positions.push(position);
      }
    }
    return positions;
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  getMainViewportRect(): Rect {
    const sheetId = this.getters.getActiveSheetId();
    const viewport = this.getMainInternalViewport(sheetId);
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    let { width, height } = viewport.getMaxSize();
    const x = this.getters.getColDimensions(sheetId, xSplit).start;
    const y = this.getters.getRowDimensions(sheetId, ySplit).start;
    return { x, y, width, height };
  }

  private getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    const sheetId = this.getters.getActiveSheetId();
    const { width, height } = this.getMainViewportRect();
    const viewport = this.getMainInternalViewport(sheetId);
    return {
      maxOffsetX: Math.max(0, width - viewport.viewportWidth + 1),
      maxOffsetY: Math.max(0, height - viewport.viewportHeight + 1),
    };
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceIndex: HeaderIndex,
    index: HeaderIndex
  ): Pixel {
    const sheetId = this.getters.getActiveSheetId();
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const visibleRows = this.getters.getSheetViewVisibleRows();
    if (index < referenceIndex) {
      return -this.getColRowOffsetInViewport(dimension, index, referenceIndex);
    }
    let offset = 0;
    const visibleIndexes = dimension === "COL" ? visibleCols : visibleRows;
    for (let i = referenceIndex; i < index; i++) {
      if (!visibleIndexes.includes(i)) {
        continue;
      }
      offset += this.getters.getHeaderSize(sheetId, dimension, i);
    }
    return offset;
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport({ sheetId, col, row }: CellPosition): boolean {
    return this.getSubViewports(sheetId).some((pane) => pane.isVisible(col, row));
  }

  // => return s the new offset
  getEdgeScrollCol(x: number, previousX: number, startingX: number): EdgeScrollInfo {
    let canEdgeScroll = false;
    let direction: ScrollDirection = 0;
    let delay = 0;
    /** 4 cases : See EdgeScrollCases Schema at the top
     * 1. previous in XRight > XLeft
     * 3. previous in XRight > outside
     * 5. previous in Left > outside
     * A. previous in Left > right
     * with X a position taken in the bottomRIght (aka scrollable) viewport
     */
    const { xSplit } = this.getters.getPaneDivisions(this.getters.getActiveSheetId());
    const { width } = this.getSheetViewDimension();
    const { x: offsetCorrectionX } = this.getMainViewportCoordinates();
    const currentOffsetX = this.getActiveSheetScrollInfo().scrollX;

    if (x > width) {
      // 3 & 5
      canEdgeScroll = true;
      delay = scrollDelay(x - width);
      direction = 1;
    } else if (x < offsetCorrectionX && startingX >= offsetCorrectionX && currentOffsetX > 0) {
      // 1
      canEdgeScroll = true;
      delay = scrollDelay(offsetCorrectionX - x);
      direction = -1;
    } else if (xSplit && previousX < offsetCorrectionX && x > offsetCorrectionX) {
      // A
      canEdgeScroll = true;
      delay = scrollDelay(x);
      direction = "reset";
    }
    return { canEdgeScroll, direction, delay };
  }

  getEdgeScrollRow(y: number, previousY: number, tartingY: number): EdgeScrollInfo {
    let canEdgeScroll = false;
    let direction: ScrollDirection = 0;
    let delay = 0;
    /** 4 cases : See EdgeScrollCases Schema at the top
     * 2. previous in XBottom > XTop
     * 4. previous in XRight > outside
     * 6. previous in Left > outside
     * B. previous in Left > right
     * with X a position taken in the bottomRIght (aka scrollable) viewport
     */
    const { ySplit } = this.getters.getPaneDivisions(this.getters.getActiveSheetId());

    const { height } = this.getSheetViewDimension();
    const { y: offsetCorrectionY } = this.getMainViewportCoordinates();
    const currentOffsetY = this.getActiveSheetScrollInfo().scrollY;

    if (y > height) {
      // 4 & 6
      canEdgeScroll = true;
      delay = scrollDelay(y - height);
      direction = 1;
    } else if (y < offsetCorrectionY && tartingY >= offsetCorrectionY && currentOffsetY > 0) {
      // 2
      canEdgeScroll = true;
      delay = scrollDelay(offsetCorrectionY - y);
      direction = -1;
    } else if (ySplit && previousY < offsetCorrectionY && y > offsetCorrectionY) {
      // B
      canEdgeScroll = true;
      delay = scrollDelay(y);
      direction = "reset";
    }
    return { canEdgeScroll, direction, delay };
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getVisibleRect(zone: Zone): Rect {
    const rect = this.getVisibleRectWithoutHeaders(zone);
    return { ...rect, x: rect.x + this.gridOffsetX, y: rect.y + this.gridOffsetY };
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    const sheetId = this.getters.getActiveSheetId();
    const viewportRects = this.getSubViewports(sheetId)
      .map((viewport) => viewport.getRect(zone))
      .filter(isDefined);

    if (viewportRects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const x = Math.min(...viewportRects.map((rect) => rect.x));
    const y = Math.min(...viewportRects.map((rect) => rect.y));
    const width = Math.max(...viewportRects.map((rect) => rect.x + rect.width)) - x;
    const height = Math.max(...viewportRects.map((rect) => rect.y + rect.height)) - y;
    return { x, y, width, height };
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    const sheetId = this.getters.getActiveSheetId();
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const x = this.getters.getColDimensions(sheetId, xSplit).start;
    const y = this.getters.getRowDimensions(sheetId, ySplit).start;
    return { x, y };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private ensureMainViewportExist(sheetId) {
    if (!this.viewports[sheetId]) {
      this.resetViewports(sheetId);
    }
  }

  private getSubViewports(sheetId: UID): InternalViewport[] {
    this.ensureMainViewportExist(sheetId);
    return Object.values(this.viewports[sheetId]!).filter(isDefined);
  }

  private checkPositiveDimension(cmd: ResizeViewportCommand) {
    if (cmd.width < 0 || cmd.height < 0) {
      return CommandResult.InvalidViewportSize;
    }
    return CommandResult.Success;
  }

  private checkValuesAreDifferent(cmd: ResizeViewportCommand) {
    const { height, width } = this.getSheetViewDimension();
    if (
      cmd.gridOffsetX === this.gridOffsetX &&
      cmd.gridOffsetY === this.gridOffsetY &&
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
    this.ensureMainViewportExist(sheetId);
    return this.viewports[sheetId]!.bottomRight;
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const sheetIds = this.getters.getSheetIds();
    for (let sheetId of Object.keys(this.viewports)) {
      if (!sheetIds.includes(sheetId)) {
        delete this.viewports[sheetId];
      }
    }
  }

  private resizeSheetView(
    height: Pixel,
    width: Pixel,
    gridOffsetX: Pixel = 0,
    gridOffsetY: Pixel = 0
  ) {
    this.sheetViewHeight = height;
    this.sheetViewWidth = width;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.recomputeViewports();
  }

  private recomputeViewports() {
    for (let sheetId of Object.keys(this.viewports)) {
      this.resetViewports(sheetId);
    }
  }

  private setSheetViewOffset(offsetX: Pixel, offsetY: Pixel) {
    const sheetId = this.getters.getActiveSheetId();
    const { maxOffsetX, maxOffsetY } = this.getMaximumSheetOffset();
    Object.values(this.getSubViewports(sheetId)).forEach((viewport) =>
      viewport.setViewportOffset(clip(offsetX, 0, maxOffsetX), clip(offsetY, 0, maxOffsetY))
    );
  }

  private getViewportOffset(sheetId: UID) {
    return {
      x: this.viewports[sheetId]?.bottomRight.offsetScrollbarX || 0,
      y: this.viewports[sheetId]?.bottomRight.offsetScrollbarY || 0,
    };
  }

  private resetViewports(sheetId: UID) {
    if (!this.getters.tryGetSheet(sheetId)) {
      return;
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const nCols = this.getters.getNumberCols(sheetId);
    const nRows = this.getters.getNumberRows(sheetId);
    const colOffset = this.getters.getColRowOffset("COL", 0, xSplit, sheetId);
    const rowOffset = this.getters.getColRowOffset("ROW", 0, ySplit, sheetId);
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
            { width: this.sheetViewWidth - colOffset, height: rowOffset },
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
            { width: colOffset, height: this.sheetViewHeight - rowOffset },
            { canScrollHorizontally: false, canScrollVertically },
            { x: 0, y: canScrollVertically ? previousOffset.y : 0 }
          )) ||
        undefined,
      bottomRight: new InternalViewport(
        this.getters,
        sheetId,
        { left: xSplit, right: nCols - 1, top: ySplit, bottom: nRows - 1 },
        {
          width: this.sheetViewWidth - colOffset,
          height: this.sheetViewHeight - rowOffset,
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
  private refreshViewport(sheetId: UID, anchorPosition?: Position) {
    Object.values(this.getSubViewports(sheetId)).forEach((viewport) => {
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

  getVisibleFigures(): Figure[] {
    const sheetId = this.getters.getActiveSheetId();
    const result: Figure[] = [];
    const figures = this.getters.getFigures(sheetId);
    const { scrollX, scrollY } = this.getActiveSheetScrollInfo();
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.getters.getMainViewportCoordinates();
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();

    for (const figure of figures) {
      if (
        figure.x >= offsetCorrectionX &&
        (figure.x + figure.width <= offsetCorrectionX + scrollX ||
          figure.x >= width + scrollX + offsetCorrectionX)
      ) {
        continue;
      }
      if (
        figure.y >= offsetCorrectionY &&
        (figure.y + figure.height <= offsetCorrectionY + scrollY ||
          figure.y >= height + scrollY + offsetCorrectionY)
      ) {
        continue;
      }
      result.push(figure);
    }
    return result;
  }

  isPositionVisible(position: PixelPosition): boolean {
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

  getFrozenSheetViewRatio(sheetId: UID) {
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const offsetCorrectionX = this.getters.getColDimensions(sheetId, xSplit).start;
    const offsetCorrectionY = this.getters.getRowDimensions(sheetId, ySplit).start;
    const width = this.sheetViewWidth + this.gridOffsetX;
    const height = this.sheetViewHeight + this.gridOffsetY;
    return { xRatio: offsetCorrectionX / width, yRatio: offsetCorrectionY / height };
  }
}
