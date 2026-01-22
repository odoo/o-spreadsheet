import { getDefaultSheetViewSize, SCROLLBAR_WIDTH } from "../../constants";
import { clip, isDefined, range } from "../../helpers";
import { scrollDelay } from "../../helpers/edge_scrolling";
import { InternalViewport } from "../../helpers/internal_viewport";
import { positionToZone } from "../../helpers/zones";
import {
  CommandResult,
  ResizeViewportCommand,
  SetViewportOffsetCommand,
} from "../../types/commands";
import { AnchorOffset, Figure, FigureUI } from "../../types/figure";
import { CustomGetters } from "../../types/getters";
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
  ScrollDirection,
  SheetDOMScrollInfo,
  Viewport,
} from "../../types/rendering";

type SheetViewports = {
  topLeft: InternalViewport | undefined;
  bottomLeft: InternalViewport | undefined;
  topRight: InternalViewport | undefined;
  bottomRight: InternalViewport;
};

export interface SheetViewState {
  viewports: Record<UID, SheetViewports | undefined>;
  sheetViewWidth: Pixel;
  sheetViewHeight: Pixel;
  gridOffsetX: Pixel;
  gridOffsetY: Pixel;
  zoomLevel: number;
}

export class SheetView {
  private getters: CustomGetters;
  private sheetId: UID;
  viewports: SheetViewports;
  sheetViewWidth: Pixel = getDefaultSheetViewSize();
  sheetViewHeight: Pixel = getDefaultSheetViewSize();
  gridOffsetX: Pixel = 0;
  gridOffsetY: Pixel = 0;
  zoomLevel: number = 1;

  constructor(getters: CustomGetters, sheetId: UID, initialState?: Partial<SheetViewState>) {
    this.getters = getters;
    for (const key in initialState) {
      this[key] = initialState[key];
    }
    this.sheetId = sheetId;
    this.viewports = this.resetViewports(sheetId);
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
    return Math.max(...this.getSubViewports().map((viewport) => viewport.getColIndex(x)));
  }

  /**
   * Return the index of a row given an offset y, based on the viewport top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    return Math.max(...this.getSubViewports().map((viewport) => viewport.getRowIndex(y)));
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

  getGridOffset(): DOMCoordinates {
    return { x: this.gridOffsetX, y: this.gridOffsetY };
  }

  /** type as pane, not viewport but basically pane extends viewport */
  getActiveMainViewport(): Viewport {
    return this.getMainViewport();
  }

  /**
   * Return the DOM scroll info of the active sheet, ie. the offset between the viewport left/top side and
   * the grid left/top side, corresponding to the scroll of the scrollbars and not snapped to the grid.
   */
  getActiveSheetScrollInfo(): SheetDOMScrollInfo {
    const viewport = this.getMainInternalViewport();
    return {
      scrollX: viewport.offsetX,
      scrollY: viewport.offsetY,
    };
  }

  getSheetViewVisibleCols(): HeaderIndex[] {
    const viewports = this.getSubViewports();

    //TODO ake another commit to eimprove this
    return [...new Set(viewports.map((v) => range(v.left, v.right + 1)).flat())].filter(
      (col) => col >= 0 && !this.getters.isHeaderHidden(this.sheetId, "COL", col)
    );
  }

  getSheetViewVisibleRows(): HeaderIndex[] {
    const viewports = this.getSubViewports();
    return [...new Set(viewports.map((v) => range(v.top, v.bottom + 1)).flat())].filter(
      (row) => row >= 0 && !this.getters.isHeaderHidden(this.sheetId, "ROW", row)
    );
  }

  /**
   * Get the positions of all the cells that are visible in the viewport, taking merges into account.
   */
  getVisibleCellPositions(): CellPosition[] {
    const visibleCols = this.getSheetViewVisibleCols();
    const visibleRows = this.getSheetViewVisibleRows();
    const sheetId = this.sheetId;

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
    const sheetId = this.sheetId;
    const viewport = this.getMainInternalViewport();
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const { width, height } = viewport.getMaxSize();
    const x = this.getters.getColDimensions(sheetId, xSplit).start;
    const y = this.getters.getRowDimensions(sheetId, ySplit).start;
    return { x, y, width, height };
  }

  getMaximumSheetOffset(): { maxOffsetX: Pixel; maxOffsetY: Pixel } {
    const { width, height } = this.getMainViewportRect();
    const viewport = this.getMainInternalViewport();
    return {
      maxOffsetX: Math.max(0, width - viewport.viewportWidth),
      maxOffsetY: Math.max(0, height - viewport.viewportHeight),
    };
  }

  getColRowOffsetInViewport(
    dimension: Dimension,
    referenceHeaderIndex: HeaderIndex,
    targetHeaderIndex: HeaderIndex
  ): Pixel {
    if (targetHeaderIndex < referenceHeaderIndex) {
      return -this.getColRowOffsetInViewport(dimension, targetHeaderIndex, referenceHeaderIndex);
    }

    const sheetId = this.sheetId;
    const visibleHeaders =
      dimension === "COL" ? this.getSheetViewVisibleCols() : this.getSheetViewVisibleRows();
    const startIndex = visibleHeaders.findIndex((header) => referenceHeaderIndex >= header);
    let endIndex = visibleHeaders.findIndex((header) => targetHeaderIndex <= header);
    endIndex = endIndex === -1 ? visibleHeaders.length : endIndex;
    const relevantIndexes = visibleHeaders.slice(startIndex, endIndex);
    let offset = 0;
    for (const i of relevantIndexes) {
      offset += this.getters.getHeaderSize(sheetId, dimension, i);
    }
    return offset * this.zoomLevel;
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport({ col, row }: Position): boolean {
    return this.getSubViewports().some((pane) => pane.isVisible(col, row));
  }

  getScrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.zoomLevel;
  }

  // => returns the new offset
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
    const { xSplit } = this.getters.getPaneDivisions(this.sheetId);
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

  getEdgeScrollRow(y: number, previousY: number, startingY: number): EdgeScrollInfo {
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
    const { ySplit } = this.getters.getPaneDivisions(this.sheetId);

    const { height } = this.getSheetViewDimension();
    const { y: offsetCorrectionY } = this.getMainViewportCoordinates();
    const currentOffsetY = this.getActiveSheetScrollInfo().scrollY;

    if (y > height) {
      // 4 & 6
      canEdgeScroll = true;
      delay = scrollDelay(y - height);
      direction = 1;
    } else if (y < offsetCorrectionY && startingY >= offsetCorrectionY && currentOffsetY > 0) {
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
   * Computes the coordinates and size to draw the zone on the canvas after it has been zoomed
   */
  getVisibleRectWithZoom(zone: Zone): Rect {
    const zoom = this.getViewportZoomLevel();
    const rect = this.getVisibleRectWithoutHeaders(zone);
    rect.width = rect.width * zoom;
    rect.height = rect.height * zoom;
    rect.x = rect.x * zoom + this.gridOffsetX * zoom;
    rect.y = rect.y * zoom + this.gridOffsetY * zoom;
    return rect;
  }

  /**
   * Computes the coordinates and size to draw the zone without taking the grid offset into account
   */
  getVisibleRectWithoutHeaders(zone: Zone): Rect {
    return this.mapViewportsToRect((viewport) => viewport.getVisibleRect(zone));
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRect(zone: Zone): Rect {
    const rect = this.mapViewportsToRect((viewport) => viewport.getFullRect(zone));
    return { ...rect, x: rect.x + this.gridOffsetX, y: rect.y + this.gridOffsetY };
  }

  /**
   * Computes the actual size and position (:Rect) of the zone on the canvas
   * regardless of the viewport dimensions.
   */
  getRectWithoutHeaders(zone: Zone): Rect {
    return this.mapViewportsToRect((viewport) => viewport.getFullRect(zone));
  }

  /**
   * Returns the position of the MainViewport relatively to the start of the grid (without headers)
   * It corresponds to the summed dimensions of the visible cols/rows (in x/y respectively)
   * situated before the pane divisions.
   */
  getMainViewportCoordinates(): DOMCoordinates {
    const sheetId = this.sheetId;
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const x = this.getters.getColDimensions(sheetId, xSplit).start;
    const y = this.getters.getRowDimensions(sheetId, ySplit).start;
    return { x, y };
  }

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(col: HeaderIndex): HeaderDimensions {
    const { top } = this.getMainInternalViewport();
    const zone = {
      left: col,
      right: col,
      top: top,
      bottom: top,
    };
    const { x, width } = this.getVisibleRect(zone);
    const start = x - this.gridOffsetX;
    return { start, size: width, end: start + width };
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(row: HeaderIndex): HeaderDimensions {
    const { left } = this.getMainInternalViewport();
    const zone = {
      left: 0,
      right: left,
      top: row,
      bottom: row,
    };
    const { y, height } = this.getVisibleRect(zone);
    const start = y - this.gridOffsetY;
    return { start, size: height, end: start + height };
  }

  getAllActiveViewportsZonesAndRect(): { zone: Zone; rect: Rect }[] {
    return this.getSubViewports().map((viewport) => {
      return {
        zone: viewport,
        rect: {
          x: viewport.offsetCorrectionX + this.gridOffsetX,
          y: viewport.offsetCorrectionY + this.gridOffsetY,
          ...viewport.getMaxSize(),
        },
      };
    });
  }

  getViewportZoomLevel(): number {
    return this.zoomLevel;
  }

  // ---------------------------------------------------------------------------
  //
  // ---------------------------------------------------------------------------

  getSubViewports(): InternalViewport[] {
    return Object.values(this.viewports).filter(isDefined);
  }

  checkPositiveDimension(cmd: ResizeViewportCommand) {
    if (cmd.width < 0 || cmd.height < 0) {
      return CommandResult.InvalidViewportSize;
    }
    return CommandResult.Success;
  }

  checkScrollingDirection({ offsetX, offsetY }: { offsetX: Pixel; offsetY: Pixel }): CommandResult {
    const pane = this.getMainInternalViewport();
    if (
      (!pane.canScrollHorizontally && offsetX > 0) ||
      (!pane.canScrollVertically && offsetY > 0)
    ) {
      return CommandResult.InvalidScrollingDirection;
    }
    return CommandResult.Success;
  }

  checkIfViewportsWillChange({ offsetX, offsetY }: SetViewportOffsetCommand) {
    const { maxOffsetX, maxOffsetY } = this.getMaximumSheetOffset();
    const willScroll = this.getSubViewports().some((viewport) =>
      viewport.willNewOffsetScrollViewport(
        clip(offsetX, 0, maxOffsetX),
        clip(offsetY, 0, maxOffsetY)
      )
    );
    return willScroll ? CommandResult.Success : CommandResult.ViewportScrollLimitsReached;
  }

  getMainViewport(): Viewport {
    const viewport = this.getMainInternalViewport();
    return {
      top: viewport.top,
      left: viewport.left,
      bottom: viewport.bottom,
      right: viewport.right,
    };
  }

  getMainInternalViewport(): InternalViewport {
    return this.viewports.bottomRight;
  }

  resizeSheetView(height: Pixel, width: Pixel, gridOffsetX: Pixel = 0, gridOffsetY: Pixel = 0) {
    this.sheetViewHeight = height;
    this.sheetViewWidth = width;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.recomputeViewports();
  }

  recomputeViewports() {
    for (const sheetId of this.getters.getSheetIds()) {
      this.resetViewports(sheetId);
    }
  }

  setSheetViewOffset(offsetX: Pixel, offsetY: Pixel) {
    const { maxOffsetX, maxOffsetY } = this.getMaximumSheetOffset();
    this.getSubViewports().forEach((viewport) =>
      viewport.setViewportOffset(clip(offsetX, 0, maxOffsetX), clip(offsetY, 0, maxOffsetY))
    );
  }

  getViewportOffset() {
    return {
      x: this.viewports.bottomRight.offsetX || 0,
      y: this.viewports.bottomRight.offsetY || 0,
    };
  }

  resetViewports(sheetId: UID) {
    if (!this.getters.tryGetSheet(sheetId)) {
      throw new Error(`Sheet with id ${sheetId} does not exist`);
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(this.sheetId);
    const nCols = this.getters.getNumberCols(sheetId);
    const nRows = this.getters.getNumberRows(sheetId);
    const colOffset = Math.min(
      this.getters.getColRowOffset("COL", 0, xSplit, this.sheetId),
      this.sheetViewWidth
    );
    const rowOffset = Math.min(
      this.getters.getColRowOffset("ROW", 0, ySplit, this.sheetId),
      this.sheetViewHeight
    );
    const unfrozenWidth = Math.max(this.sheetViewWidth - colOffset, 0);
    const unfrozenHeight = Math.max(this.sheetViewHeight - rowOffset, 0);
    const { xRatio, yRatio } = this.getFrozenSheetViewRatio();
    const canScrollHorizontally = xRatio < 1.0;
    const canScrollVertically = yRatio < 1.0;
    const previousOffset = this.getViewportOffset();

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
    return sheetViewports;
  }

  /**
   * Adjust the viewport such that the anchor position is visible
   */
  refreshViewport(anchorPosition: Position) {
    this.getSubViewports().forEach((viewport) => {
      viewport.adjustViewportZone();
      viewport.adjustPosition(anchorPosition);
    });
  }

  /**
   * Return the index of a col given a negative offset x, based on the main viewport top
   * visible cell of the main viewport.
   * It returns -1 if no col is found.
   */
  getColIndexLeftOfMainViewport(x: Pixel): HeaderIndex {
    if (x >= 0) {
      return -1;
    }
    const sheetId = this.sheetId;
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
  getRowIndexTopOfMainViewport(y: Pixel): HeaderIndex {
    if (y >= 0) {
      return -1;
    }
    const sheetId = this.sheetId;
    let row = this.getActiveMainViewport().top;
    let rowStart =
      -this.getActiveSheetScrollInfo().scrollY - this.getters.getColRowOffset("ROW", row, 0);
    for (; y < rowStart; row--) {
      rowStart -= this.getters.getRowSize(sheetId, row - 1);
    }
    return Math.max(row, 0);
  }

  getVisibleFigures(): FigureUI[] {
    const sheetId = this.sheetId;
    const result: FigureUI[] = [];
    const figures = this.getters.getFigures(sheetId);
    const { scrollX, scrollY } = this.getActiveSheetScrollInfo();
    const { x: offsetCorrectionX, y: offsetCorrectionY } = this.getMainViewportCoordinates();
    const { width, height } = this.getSheetViewDimensionWithHeaders();

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
    const { scrollX, scrollY } = this.getActiveSheetScrollInfo();
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
    const { scrollX, scrollY } = this.getActiveSheetScrollInfo();
    const { x: mainViewportX, y: mainViewportY } = this.getMainViewportCoordinates();
    const { width, height } = this.getSheetViewDimension();

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

  getFrozenSheetViewRatio() {
    const { xSplit, ySplit } = this.getters.getPaneDivisions(this.sheetId);
    const offsetCorrectionX = this.getters.getColDimensions(this.sheetId, xSplit).start;
    const offsetCorrectionY = this.getters.getRowDimensions(this.sheetId, ySplit).start;
    const width = this.sheetViewWidth + this.gridOffsetX;
    const height = this.sheetViewHeight + this.gridOffsetY;
    return { xRatio: offsetCorrectionX / width, yRatio: offsetCorrectionY / height };
  }

  mapViewportsToRect(rectCallBack: (viewport: InternalViewport) => Rect | undefined): Rect {
    let x: Pixel = Infinity;
    let y: Pixel = Infinity;
    let width: Pixel = 0;
    let height: Pixel = 0;
    let hasViewports: boolean = false;
    for (const viewport of this.getSubViewports()) {
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
