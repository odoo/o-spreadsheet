import { usePlugin } from "@odoo/owl";
import {
  CellPosition,
  FigureUI,
  HeaderDimensions,
  HeaderIndex,
  PaneDivision,
  Pixel,
  SheetViewDimensions,
  UID,
  ViewportsGetters,
  Zone,
} from "..";
import { invalidateEvaluationCommands } from "../command_registry";
import { FOOTER_HEIGHT, getDefaultSheetViewSize } from "../constants";
import { deepEquals } from "../helpers/misc";
import { ViewportCollection } from "../helpers/viewport_collection";
import { ZoomPlugin } from "../owl_plugins/zoom_plugin";
import { Command } from "../types/commands";
import {
  DOMCoordinates,
  DOMDimension,
  Rect,
  SheetDOMScrollInfo,
  Viewport,
} from "../types/rendering";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";

type getHeaderDimensionsCallback = (
  sheetId: UID,
  dimension: "COL" | "ROW",
  index: number
) => HeaderDimensions;

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
    "shiftViewportDown",
    "shiftViewportUp",
    "scrollToCell",
    "setDisplayedSheetId",
    "setViewportArgs",
    "rebuildViewports",
  ] as const;
  storeGetters = ["getCartesianCoordinates"] as const;

  private zoomPlugin = usePlugin(ZoomPlugin);
  private getHeaderDimensionsCallback = this.getters.getHeaderDimensions;
  private getFooterSizeCallback = this.getFooterSize.bind(this);
  private getZoomLevelCallback = () => this.zoomPlugin.zoomLevel();
  private zoneToDisplay: Zone | undefined = undefined;

  private collection: ViewportCollection = new ViewportCollection({
    getters: this.buildViewportGetters(this.getHeaderDimensionsCallback),
    paneDivision: this.getPaneDivisions(),
    sheetViewHeight: getDefaultSheetViewSize(),
    sheetViewWidth: getDefaultSheetViewSize(),
    getZoomLevel: this.getZoomLevelCallback,
    getFooterSize: this.getFooterSizeCallback,
  });
  private sheetsWithDirtyViewports: Set<UID> = new Set();

  displayedSheetId: UID = this.model.getters.getActiveSheetId();

  constructor(get: Get) {
    super(get);
    this.collection.resetViewports(this.displayedSheetId);
  }

  /**
   * The viewport collection is mutated in place, it is never reassigned.
   * Readers access it through this accessor, and every state change is notified
   * by `invalidate()`.
   */
  get viewports(): ViewportCollection {
    return this.collection;
  }

  /**
   * Notify that the viewport state changed. The store engine currently does this
   * on its own when a mutator returns without the `noStateChange` sentinel, so
   * this is a no-op. It marks the exact points that have to notify once the
   * viewports become reactive.
   */
  private invalidate() {}

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
        this.collection.cleanViewports();
        for (const sheetId of this.getters.getSheetIds()) {
          this.sheetsWithDirtyViewports.add(sheetId);
          this.syncPaneDivision(sheetId);
        }
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
        this.collection.cleanViewports();
        this.sheetsWithDirtyViewports.delete(cmd.sheetId);
        break;
    }
  }

  finalize() {
    let hasChanged = this.sheetsWithDirtyViewports.size > 0;
    for (const sheetId of this.sheetsWithDirtyViewports) {
      this.collection.resetViewports(sheetId);
    }
    this.sheetsWithDirtyViewports = new Set();
    hasChanged = this.setViewports() || hasChanged;
    if (hasChanged) {
      this.invalidate();
    }
  }

  private setViewports(): boolean {
    const sheetIds = this.getters.getSheetIds();
    let hasChanged = false;
    for (const sheetId of sheetIds) {
      if (!this.collection.viewports[sheetId]?.bottomRight) {
        this.collection.resetViewports(sheetId);
        hasChanged = true;
      }
    }
    return hasChanged;
  }

  private syncPaneDivision(sheetId: UID) {
    this.collection.setPaneDivision(sheetId, this.getters.getPaneDivisions(sheetId));
  }

  setDisplayedSheetId(sheetId: UID) {
    this.displayedSheetId = sheetId;
    this.collection.resetViewports(sheetId);
    this.invalidate();
  }

  setViewportOffset(offset: { offsetX: Pixel; offsetY: Pixel }) {
    const sheetId = this.displayedSheetId;
    if (
      !this.collection.checkScrollingDirection(sheetId, offset) ||
      !this.collection.checkIfViewportsWillChange(sheetId, offset)
    ) {
      return "noStateChange";
    }
    this.collection.setSheetViewOffset(sheetId, offset.offsetX, offset.offsetY);
    this.invalidate();
    return;
  }

  resizeSheetView(dimensions: SheetViewDimensions) {
    if (
      !this.collection.checkValuesAreDifferent(dimensions) ||
      !this.collection.checkPositiveDimension(dimensions)
    ) {
      return "noStateChange";
    }
    this.collection.resizeSheetView(dimensions);
    this.invalidate();
    return;
  }

  shiftViewportDown() {
    const sheetId = this.displayedSheetId;
    const { top, viewportHeight, boundaryTopY } = this.collection.getMainInternalViewport(sheetId);
    const topRowDims = this.getters.getRowDimensions(sheetId, top);
    this.shiftVertically(topRowDims.start + viewportHeight - boundaryTopY);
  }

  shiftViewportUp() {
    const sheetId = this.displayedSheetId;
    const { top, viewportHeight, boundaryTopY } = this.collection.getMainInternalViewport(sheetId);
    const topRowDims = this.getters.getRowDimensions(sheetId, top);
    this.shiftVertically(topRowDims.end - boundaryTopY - viewportHeight);
  }

  scrollToCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    if (this.sheetsWithDirtyViewports.has(sheetId)) {
      // we mark the viewports dirty when we cannot update them without waiting for finalize. Trying to refreshViewport would crash.
      return;
    }
    this.collection.refreshViewport(sheetId, { col, row });
    this.invalidate();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get sheetViewDimensionWithHeaders(): DOMDimension {
    return this.collection.getSheetViewDimensionWithHeaders();
  }

  get sheetViewDimension(): DOMDimension {
    return this.collection.getSheetViewDimension();
  }

  get gridOffset(): DOMCoordinates {
    return this.collection.getGridOffset();
  }

  getCartesianCoordinates(x: Pixel, y: Pixel): [HeaderIndex, HeaderIndex] {
    return [
      this.collection.getColIndex(this.displayedSheetId, x),
      this.collection.getRowIndex(this.displayedSheetId, y),
    ];
  }

  /** type as pane, not viewport but basically pane extends viewport */
  get activeMainViewport(): Viewport {
    return this.collection.getMainViewport(this.displayedSheetId);
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  get activeSheetScrollInfo(): SheetDOMScrollInfo {
    return this.collection.getSheetScrollInfo(this.displayedSheetId);
  }

  get visibleCols(): HeaderIndex[] {
    return this.collection.getSheetViewVisibleCols(this.displayedSheetId);
  }

  get visibleRows(): HeaderIndex[] {
    return this.collection.getSheetViewVisibleRows(this.displayedSheetId);
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  get visibleCellPositions(): CellPosition[] {
    return this.collection.getVisibleCellPositions(this.displayedSheetId);
  }

  /**
   * Return the main viewport maximum size relative to the client size.
   */
  get mainViewportRect(): Rect {
    return this.collection.getMainViewportRect(this.displayedSheetId);
  }

  get maximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    return this.collection.getMaximumSheetOffset(this.displayedSheetId);
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  get mainViewportCoordinates(): DOMCoordinates {
    return this.collection.getMainViewportCoordinates(this.displayedSheetId);
  }

  get visibleFigures(): FigureUI[] {
    return this.collection.getVisibleFigures(this.displayedSheetId);
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
    const { top } = this.collection.getMainInternalViewport(sheetId);
    const { scrollX } = this.activeSheetScrollInfo;
    this.collection.setSheetViewOffset(sheetId, scrollX, offset);
    this.invalidate();
    const { anchor } = this.getters.getSelection();
    if (anchor.cell.row >= this.getters.getPaneDivisions(sheetId).ySplit) {
      const deltaRow = this.collection.getMainInternalViewport(sheetId).top - top;
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

  setViewportArgs(args: {
    getHeaderDimensions?: getHeaderDimensionsCallback;
    getFooterSize?: () => Pixel;
    zoneToDisplay?: Zone;
  }) {
    let hasChanged = false;
    if (args.getHeaderDimensions && args.getHeaderDimensions !== this.getHeaderDimensionsCallback) {
      hasChanged = true;
      this.getHeaderDimensionsCallback = args.getHeaderDimensions;
    }
    if (args.getFooterSize && args.getFooterSize !== this.getFooterSizeCallback) {
      hasChanged = true;
      this.getFooterSizeCallback = args.getFooterSize;
    }
    if (args.zoneToDisplay && !deepEquals(args.zoneToDisplay, this.zoneToDisplay)) {
      hasChanged = true;
      this.zoneToDisplay = args.zoneToDisplay;
    }

    if (hasChanged) {
      this.rebuildViewports();
    }
  }

  rebuildViewports() {
    this.collection.changeViewportArgs({
      getters: this.buildViewportGetters(this.getHeaderDimensionsCallback),
      paneDivision: this.getPaneDivisions(),
      sheetViewHeight: this.collection.getSheetViewDimension().height,
      sheetViewWidth: this.collection.getSheetViewDimension().width,
      getZoomLevel: this.getZoomLevelCallback,
      getFooterSize: this.getFooterSizeCallback,
      zoneToDisplay: this.zoneToDisplay,
    });
    this.invalidate();
  }

  buildViewportGetters(
    getHeaderDimensions: (sheetId: UID, dimension: "COL" | "ROW", index: number) => HeaderDimensions
  ): ViewportsGetters {
    return {
      findLastVisibleColRowIndex: this.getters.findLastVisibleColRowIndex,
      isReadonly: this.getters.isReadonly,
      getMainCellPosition: this.getters.getMainCellPosition,
      getNextVisibleCellPosition: this.getters.getNextVisibleCellPosition,
      isColHidden: this.getters.isColHidden,
      isRowHidden: this.getters.isRowHidden,
      isHeaderHidden: this.getters.isHeaderHidden,
      getNumberHeaders: this.getters.getNumberHeaders,
      getSheetIds: this.getters.getSheetIds,
      tryGetSheet: this.getters.tryGetSheet,
      getNumberCols: this.getters.getNumberCols,
      getNumberRows: this.getters.getNumberRows,
      getSheetZone: this.getters.getSheetZone,
      getFigures: this.getters.getFigures,

      getColDimensions: (sheetId, index) => getHeaderDimensions(sheetId, "COL", index),
      getRowDimensions: (sheetId, index) => getHeaderDimensions(sheetId, "ROW", index),
      getHeaderSize: (sheetId, dim, index) =>
        dim === "COL"
          ? getHeaderDimensions(sheetId, "COL", index).size
          : getHeaderDimensions(sheetId, "ROW", index).size,
      getColSize: (sheetId, col) => getHeaderDimensions(sheetId, "COL", col).size,

      getRowSize: (sheetId, row) => getHeaderDimensions(sheetId, "ROW", row).size,
      getColRowOffset: (dim, refIndex, index, sheetId) =>
        getHeaderDimensions(sheetId, dim, index).start -
        getHeaderDimensions(sheetId, dim, refIndex).start,
    };
  }
}
