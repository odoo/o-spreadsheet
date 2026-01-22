import { clip, isDefined } from "../../helpers";
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

  private sheetView = new SheetView(this.getters);

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
        this.sheetView.resetViewports(this.getters.getActiveSheetId());
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
        this.sheetView.setSheetViewOffset(cmd.offsetX, cmd.offsetY);
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
      this.sheetView.resetViewports(sheetId);
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
    return this.sheetView.getColIndex(x);
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    return this.sheetView.getRowIndex(y);
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
    return this.sheetView.getActiveMainViewport();
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetScrollInfo(): SheetDOMScrollInfo {
    return this.sheetView.getActiveSheetScrollInfo();
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    return this.sheetView.getSheetViewVisibleCols();
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    return this.sheetView.getSheetViewVisibleRows();
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    return this.sheetView.getVisibleCellPositions();
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  getMainViewportRect(): Rect {
    return this.sheetView.getMainViewportRect();
  }

  getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    return this.sheetView.getMaximumSheetOffset();
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceHeaderIndex: HeaderIndex,
    targetHeaderIndex: HeaderIndex
  ): Pixel {
    return this.sheetView.getColRowOffsetInViewport(
      dimension,
      referenceHeaderIndex,
      targetHeaderIndex
    );
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport({ sheetId, col, row }: CellPosition): boolean {
    return this.sheetView.isVisibleInViewport({ sheetId, col, row });
  }

  getScrollBarWidth(): Pixel {
    return this.sheetView.getScrollBarWidth();
  }

  // => returns the new offset
  getEdgeScrollCol(x: number, previousX: number, startingX: number): EdgeScrollInfo {
    return this.sheetView.getEdgeScrollCol(x, previousX, startingX);
  }

  getEdgeScrollRow(y: number, previousY: number, startingY: number): EdgeScrollInfo {
    return this.sheetView.getEdgeScrollRow(y, previousY, startingY);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getVisibleRect(zone: Zone): Rect {
    return this.sheetView.getVisibleRect(zone);
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas after it has been zoomed
   */
  getVisibleRectWithZoom(zone: Zone): Rect {
    return this.sheetView.getVisibleRectWithZoom(zone);
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetView.getVisibleRectWithoutHeaders(zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRect(zone: Zone): Rect {
    return this.sheetView.getRect(zone);
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRectWithoutHeaders(zone: Zone): Rect {
    return this.sheetView.getRectWithoutHeaders(zone);
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    return this.sheetView.getMainViewportCoordinates();
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

  getAllActiveViewportsZonesAndRect(): { zone: Zone; rect: Rect }[] {
    return this.sheetView.getAllActiveViewportsZonesAndRect();
  }

  getViewportZoomLevel(): number {
    return this.sheetView.getViewportZoomLevel();
  }

  getFrozenSheetViewRatio(sheetId: UID) {
    return this.sheetView.getFrozenSheetViewRatio(sheetId);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private ensureMainViewportExist(sheetId: UID) {
    if (!this.sheetView.viewports[sheetId]) {
      this.sheetView.resetViewports(sheetId);
    }
  }

  private getSubViewports(sheetId: UID): InternalViewport[] {
    this.ensureMainViewportExist(sheetId);
    return Object.values(this.sheetView.viewports[sheetId]!).filter(isDefined);
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
      cmd.gridOffsetX === this.sheetView.gridOffsetX &&
      cmd.gridOffsetY === this.sheetView.gridOffsetY &&
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
    const pane = this.sheetView.getMainInternalViewport(this.getters.getActiveSheetId());
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
    const willScroll = this.sheetView
      .getSubViewports(sheetId)
      .some((viewport) =>
        viewport.willNewOffsetScrollViewport(
          clip(offsetX, 0, maxOffsetX),
          clip(offsetY, 0, maxOffsetY)
        )
      );
    return willScroll ? CommandResult.Success : CommandResult.ViewportScrollLimitsReached;
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const newViewport = {};
    for (const sheetId of this.getters.getSheetIds()) {
      newViewport[sheetId] = this.sheetView.viewports[sheetId];
    }
    this.sheetView.viewports = newViewport;
  }

  private resizeSheetView(
    height: Pixel,
    width: Pixel,
    gridOffsetX: Pixel = 0,
    gridOffsetY: Pixel = 0
  ) {
    this.sheetView.sheetViewHeight = height;
    this.sheetView.sheetViewWidth = width;
    this.sheetView.gridOffsetX = gridOffsetX;
    this.sheetView.gridOffsetY = gridOffsetY;
    this.recomputeViewports();
  }

  private recomputeViewports() {
    for (const sheetId of this.getters.getSheetIds()) {
      this.sheetView.resetViewports(sheetId);
    }
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
    const { top } = this.sheetView.getMainInternalViewport(sheetId);
    const { scrollX } = this.getActiveSheetScrollInfo();
    this.sheetView.setSheetViewOffset(scrollX, offset);
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.sheetView.getMainInternalViewport(sheetId).top - top;
      this.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
    }
  }

  getVisibleFigures(): FigureUI[] {
    return this.sheetView.getVisibleFigures();
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    return this.sheetView.getFigureUI(sheetId, figure);
  }

  getPositionAnchorOffset(position: PixelPosition): AnchorOffset {
    return this.sheetView.getPositionAnchorOffset(position);
  }

  isPixelPositionVisible(position: PixelPosition): boolean {
    return this.sheetView.isPixelPositionVisible(position);
  }
}
