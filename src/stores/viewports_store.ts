import {
  CellPosition,
  FigureUI,
  HeaderIndex,
  PaneDivision,
  Pixel,
  SheetViewDimensions,
  UID,
} from "..";
import { FOOTER_HEIGHT, getDefaultSheetViewSize, SCROLLBAR_WIDTH } from "../constants";
import { ViewportCollection } from "../helpers/viewport_collection";
import { findCellInNewZone, isEqual } from "../helpers/zones";
import { Command, invalidateEvaluationCommands } from "../types/commands";
import { SelectionEvent } from "../types/event_stream/selection_events";
import {
  DOMCoordinates,
  DOMDimension,
  Rect,
  SheetDOMScrollInfo,
  Viewport,
} from "../types/rendering";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";

/**
 * Viewport store.
 *
 * This store manages all things related to all viewport states.
 *
 */
export class ViewportsStore extends SpreadsheetStore {
  mutators = [
    "setViewportOffset",
    "resizeSheetView",
    "setZoom",
    "shiftViewportDown",
    "shiftViewportUp",
    "scrollToCell",
    "setDisplayedSheetId",
  ] as const;

  viewports: ViewportCollection = new ViewportCollection({
    getters: this.getters,
    paneDivision: this.getPaneDivisions(),
    sheetViewHeight: getDefaultSheetViewSize(),
    sheetViewWidth: getDefaultSheetViewSize(),
    zoomLevel: 1,
    getFooterSize: this.getFooterSize.bind(this),
  });
  private sheetsWithDirtyViewports: Set<UID> = new Set();
  private shouldRepositionViewports: boolean = false;

  displayedSheetId: UID = this.model.getters.getActiveSheetId();

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.handleEvent.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.viewports.resetViewports(this.displayedSheetId);
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  private handleEvent(event: SelectionEvent) {
    const eventSheetId = this.getters.getActiveSheetId();
    if (event.options.scrollIntoView) {
      const oldZone = event.previousAnchor.zone;
      const newZone = event.anchor.zone;
      const isUpdateAnchorEvent = event.mode === "updateAnchor";
      const sameZone = isEqual(oldZone, newZone);
      let { col, row } =
        isUpdateAnchorEvent && sameZone ? event.anchor.cell : findCellInNewZone(oldZone, newZone);
      if (isUpdateAnchorEvent && !sameZone) {
        // altering a zone should not move the viewport in a dimension that wasn't changed
        const { top, bottom, left, right } = this.viewports.getMainInternalViewport(eventSheetId);
        if (oldZone.left === newZone.left && oldZone.right === newZone.right) {
          col = left > col || col > right ? left : col;
        }
        if (oldZone.top === newZone.top && oldZone.bottom === newZone.bottom) {
          row = top > row || row > bottom ? top : row;
        }
      }
      col = Math.min(col, this.getters.getNumberCols(eventSheetId) - 1);
      row = Math.min(row, this.getters.getNumberRows(eventSheetId) - 1);
      if (!this.sheetsWithDirtyViewports.has(eventSheetId)) {
        this.viewports.refreshViewport(eventSheetId, { col, row });
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
      case "UNDO":
      case "REDO":
        this.viewports.cleanViewports();
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
          this.syncPaneDivision(sheetId);
        }
        this.shouldRepositionViewports = !this.getters.getSelectedFigureIds().length;
        break;
      case "UNFREEZE_ROWS":
      case "UNFREEZE_COLUMNS":
      case "FREEZE_COLUMNS":
      case "FREEZE_ROWS":
      case "UNFREEZE_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
        this.sheetsWithDirtyViewports.add(cmd.sheetId);
        this.syncPaneDivision(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.sheetsWithDirtyViewports.add(cmd.sheetIdTo);
        this.syncPaneDivision(cmd.sheetIdTo);
        break;
      case "REMOVE_TABLE":
      case "UPDATE_TABLE":
      case "UPDATE_FILTER":
      case "RESIZE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
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
      // Either the content, format or style can impact the header sizes of a sheet
      // As such, every command can have a potential effect on the viewport
      case "UPDATE_CELL":
      case "SET_FORMATTING":
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
        }
        break;
      case "DELETE_SHEET":
        this.viewports.cleanViewports();
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
    }
  }

  finalize() {
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.viewports.resetViewports(sheetId);
      if (this.shouldRepositionViewports) {
        const position = this.getters.getSheetPosition(sheetId);
        this.viewports.getSubViewports(sheetId).forEach(({ viewport }) => {
          viewport.repositionViewport(position);
        });
      }
    }
    this.sheetsWithDirtyViewports = new Set();
    this.shouldRepositionViewports = false;
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

  private syncPaneDivision(sheetId: UID) {
    this.viewports.setPaneDivision(sheetId, this.getters.getPaneDivisions(sheetId));
  }

  setDisplayedSheetId(sheetId: UID) {
    this.displayedSheetId = sheetId;
    this.viewports.resetViewports(sheetId);
  }

  setViewportOffset(offset: { offsetX: Pixel; offsetY: Pixel }) {
    const sheetId = this.displayedSheetId;
    if (
      !this.viewports.checkScrollingDirection(sheetId, offset) ||
      !this.viewports.checkIfViewportsWillChange(sheetId, offset)
    ) {
      return "noStateChange";
    }
    this.viewports.setSheetViewOffset(sheetId, offset.offsetX, offset.offsetY);
    return;
  }

  resizeSheetView(dimensions: SheetViewDimensions) {
    if (
      !this.viewports.checkValuesAreDifferent(dimensions) ||
      !this.viewports.checkPositiveDimension(dimensions)
    ) {
      return "noStateChange";
    }
    this.viewports.resizeSheetView(dimensions);
    return;
  }

  setZoom(zoom: number) {
    if (zoom > 2 || zoom < 0.5) {
      return "noStateChange";
    }
    this.viewports.setZoomLevel(zoom);
    return;
  }

  shiftViewportDown() {
    const sheetId = this.displayedSheetId;
    const { top, viewportHeight, boundaryTopY } = this.viewports.getMainInternalViewport(sheetId);
    const topRowDims = this.getters.getRowDimensions(sheetId, top);
    this.shiftVertically(topRowDims.start + viewportHeight - boundaryTopY);
  }

  shiftViewportUp() {
    const sheetId = this.displayedSheetId;
    const { top, viewportHeight, boundaryTopY } = this.viewports.getMainInternalViewport(sheetId);
    const topRowDims = this.getters.getRowDimensions(sheetId, top);
    this.shiftVertically(topRowDims.end - boundaryTopY - viewportHeight);
  }

  scrollToCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    this.viewports.refreshViewport(sheetId, { col, row });
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get sheetViewDimensionWithHeaders(): DOMDimension {
    return this.viewports.getSheetViewDimensionWithHeaders();
  }

  get sheetViewDimension(): DOMDimension {
    return this.viewports.getSheetViewDimension();
  }

  get gridOffset(): DOMCoordinates {
    return this.viewports.getGridOffset();
  }

  /** type as pane, not viewport but basically pane extends viewport */
  get activeMainViewport(): Viewport {
    return this.viewports.getMainViewport(this.displayedSheetId);
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  get activeSheetScrollInfo(): SheetDOMScrollInfo {
    return this.viewports.getSheetScrollInfo(this.displayedSheetId);
  }

  get visibleCols(): HeaderIndex[] {
    return this.viewports.getSheetViewVisibleCols(this.displayedSheetId);
  }

  get visibleRows(): HeaderIndex[] {
    return this.viewports.getSheetViewVisibleRows(this.displayedSheetId);
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  get visibleCellPositions(): CellPosition[] {
    return this.viewports.getVisibleCellPositions(this.displayedSheetId);
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  get mainViewportRect(): Rect {
    return this.viewports.getMainViewportRect(this.displayedSheetId);
  }

  get maximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    return this.viewports.getMaximumSheetOffset(this.displayedSheetId);
  }

  get scrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.viewports.getZoomLevel();
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  get mainViewportCoordinates(): DOMCoordinates {
    return this.viewports.getMainViewportCoordinates(this.displayedSheetId);
  }

  get zoomLevel(): number {
    return this.viewports.getZoomLevel();
  }

  get visibleFigures(): FigureUI[] {
    return this.viewports.getVisibleFigures(this.displayedSheetId);
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
    const sheetId = this.displayedSheetId;
    const { top } = this.viewports.getMainInternalViewport(sheetId);
    const { scrollX } = this.activeSheetScrollInfo;
    this.viewports.setSheetViewOffset(sheetId, scrollX, offset);
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.viewports.getMainInternalViewport(sheetId).top - top;
      this.model.selection.selectCell(anchor.cell.col, anchor.cell.row + deltaRow);
    }
  }

  private getPaneDivisions(): Record<UID, PaneDivision> {
    const paneDivisions: Record<UID, PaneDivision> = {};
    for (const sheetId of this.getters.getSheetIds()) {
      paneDivisions[sheetId] = this.getters.getPaneDivisions(sheetId);
    }
    return paneDivisions;
  }

  private getFooterSize() {
    return this.getters.isReadonly() ? 0 : FOOTER_HEIGHT;
  }
}
