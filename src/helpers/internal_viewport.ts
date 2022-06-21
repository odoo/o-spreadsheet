import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import {
  Dimension,
  Getters,
  HeaderIndex,
  Pixel,
  Position,
  Rect,
  UID,
  Zone,
  ZoneDimension,
} from "../types";
import { intersection, isInside } from "./zones";

export class InternalViewport {
  top!: HeaderIndex;
  bottom!: HeaderIndex;
  left!: HeaderIndex;
  right!: HeaderIndex;
  offsetX!: Pixel;
  offsetY!: Pixel;
  offsetScrollbarX: Pixel;
  offsetScrollbarY: Pixel;
  canScrollVertically: boolean;
  canScrollHorizontally: boolean;
  width: Pixel;
  height: Pixel;
  offsetCorrectionX: Pixel;
  offsetCorrectionY: Pixel;

  constructor(
    private getters: Getters,
    private sheetId: UID,
    private boundaries: Zone,
    sizeInGrid: { width: Pixel; height: Pixel },
    options: { canScrollVertically: boolean; canScrollHorizontally: boolean },
    offsets: { x: Pixel; y: Pixel }
  ) {
    this.width = sizeInGrid.width;
    this.height = sizeInGrid.height;
    this.offsetScrollbarX = offsets.x;
    this.offsetScrollbarY = offsets.y;
    this.canScrollVertically = options.canScrollVertically;
    this.canScrollHorizontally = options.canScrollHorizontally;

    this.offsetCorrectionX = this.getters.getColDimensions(
      this.sheetId,
      this.boundaries.left
    ).start;
    this.offsetCorrectionY = this.getters.getRowDimensions(this.sheetId, this.boundaries.top).start;

    this.adjustViewportOffsetX();
    this.adjustViewportOffsetY();
  }

  // PUBLIC

  getMaxSize(): ZoneDimension {
    const lastCol = this.getters.findLastVisibleColRowIndex(this.sheetId, "COL", {
      first: this.boundaries.left,
      last: this.boundaries.right,
    });
    const lastRow = this.getters.findLastVisibleColRowIndex(this.sheetId, "ROW", {
      first: this.boundaries.top,
      last: this.boundaries.bottom,
    });
    const { end: lastColEnd, size: lastColSize } = this.getters.getColDimensions(
      this.sheetId,
      lastCol
    );
    const { end: lastRowEnd, size: lastRowSize } = this.getters.getRowDimensions(
      this.sheetId,
      lastRow
    );
    const leftColIndex = this.searchHeaderIndex("COL", lastColEnd - this.width, 0);
    const leftColSize = this.getters.getColSize(this.sheetId, leftColIndex);
    const leftRowIndex = this.searchHeaderIndex("ROW", lastRowEnd - this.height, 0);
    const topRowSize = this.getters.getRowSize(this.sheetId, leftRowIndex);

    const width =
      lastColEnd -
      this.offsetCorrectionX +
      (this.canScrollHorizontally
        ? Math.max(DEFAULT_CELL_WIDTH, Math.min(leftColSize, this.width - lastColSize))
        : 0);
    const height =
      lastRowEnd -
      this.offsetCorrectionY +
      (this.canScrollVertically
        ? Math.max(DEFAULT_CELL_HEIGHT + 5, Math.min(topRowSize, this.height - lastRowSize))
        : 0);

    return { width, height };
  }

  /**
   * Return the index of a column given an offset x, based on the pane left
   * visible cell.
   * It returns -1 if no column is found.
   */
  getColIndex(x: Pixel, absolute = false): HeaderIndex {
    if (x < this.offsetCorrectionX || x > this.offsetCorrectionX + this.width) {
      return -1;
    }
    return this.searchHeaderIndex("COL", x - this.offsetCorrectionX, this.left, absolute);
  }

  /**
   * Return the index of a row given an offset y, based on the pane top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel, absolute = false): HeaderIndex {
    if (y < this.offsetCorrectionY || y > this.offsetCorrectionY + this.height) {
      return -1;
    }
    return this.searchHeaderIndex("ROW", y - this.offsetCorrectionY, this.top, absolute);
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the pane that is actually displayed on the client. We therefore adjust the offset of the pane
   * until it contains the cell completely.
   */
  adjustPosition(position?: Position) {
    const sheetId = this.sheetId;
    if (!position) {
      position = this.getters.getSheetPosition(sheetId);
    }
    const mainCellPosition = this.getters.getMainCellPosition(sheetId, position.col, position.row);

    const { col, row } = this.getters.getNextVisibleCellPosition(
      sheetId,
      mainCellPosition.col,
      mainCellPosition.row
    );
    if (isInside(col, this.boundaries.top, this.boundaries)) {
      this.adjustPositionX(col);
    }

    if (isInside(this.boundaries.left, row, this.boundaries)) {
      this.adjustPositionY(row);
    }
  }

  adjustPositionX(col: HeaderIndex) {
    const sheetId = this.sheetId;
    const { start, end } = this.getters.getColDimensions(sheetId, col);
    while (
      end > this.offsetX + this.offsetCorrectionX + this.width &&
      this.offsetX + this.offsetCorrectionX < start
    ) {
      this.offsetX = this.getters.getColDimensions(sheetId, this.left).end - this.offsetCorrectionX;
      this.offsetScrollbarX = this.offsetX;
      this.adjustViewportZoneX();
    }
    while (col < this.left) {
      let leftCol: HeaderIndex;
      for (leftCol = this.left; leftCol >= 0; leftCol--) {
        if (!this.getters.isColHidden(sheetId, leftCol)) {
          break;
        }
      }
      this.offsetX =
        this.getters.getColDimensions(sheetId, leftCol - 1).start - this.offsetCorrectionX;
      this.offsetScrollbarX = this.offsetX;
      this.adjustViewportZoneX();
    }
  }

  adjustPositionY(row: HeaderIndex) {
    const sheetId = this.sheetId;
    while (
      this.getters.getRowDimensions(sheetId, row).end >
        this.offsetY + this.height + this.offsetCorrectionY &&
      this.offsetY + this.offsetCorrectionY < this.getters.getRowDimensions(sheetId, row).start
    ) {
      this.offsetY = this.getters.getRowDimensions(sheetId, this.top).end - this.offsetCorrectionY;
      this.offsetScrollbarY = this.offsetY;
      this.adjustViewportZoneY();
    }
    while (row < this.top) {
      let topRow: HeaderIndex;
      for (topRow = this.top; topRow >= 0; topRow--) {
        if (!this.getters.isRowHidden(sheetId, topRow)) {
          break;
        }
      }
      this.offsetY =
        this.getters.getRowDimensions(sheetId, topRow - 1).start - this.offsetCorrectionY;
      this.offsetScrollbarY = this.offsetY;
      this.adjustViewportZoneY();
    }
  }

  setViewportOffset(offsetX: Pixel, offsetY: Pixel) {
    this.setViewportOffsetX(offsetX);
    this.setViewportOffsetY(offsetY);
  }

  adjustViewportZone() {
    this.adjustViewportZoneX();
    this.adjustViewportZoneY();
  }

  getRect(zone: Zone): Rect | undefined {
    const targetZone = intersection(zone, this.zone);
    if (targetZone) {
      return {
        x:
          this.getters.getColRowOffset("COL", this.zone.left, targetZone.left) +
          this.offsetCorrectionX,
        y:
          this.getters.getColRowOffset("ROW", this.zone.top, targetZone.top) +
          this.offsetCorrectionY,
        width: this.getters.getColRowOffset("COL", targetZone.left, targetZone.right + 1),
        height: this.getters.getColRowOffset("ROW", targetZone.top, targetZone.bottom + 1),
      };
    } else {
      return undefined;
    }
  }

  isVisible(col: HeaderIndex, row: HeaderIndex) {
    const isInside = row <= this.bottom && row >= this.top && col >= this.left && col <= this.right;
    return (
      isInside &&
      !this.getters.isColHidden(this.sheetId, col) &&
      !this.getters.isRowHidden(this.sheetId, row)
    );
  }

  // PRIVATE
  private searchHeaderIndex(
    dimension: Dimension,
    position: Pixel,
    startIndex: HeaderIndex = 0,
    absolute = false
  ): HeaderIndex {
    let size = 0;
    const sheetId = this.sheetId;
    const headers = this.getters.getNumberHeaders(sheetId, dimension);
    for (let i = startIndex; i <= headers - 1; i++) {
      const isHiddenInViewport =
        !absolute && dimension === "COL"
          ? i < this.left && i > this.right
          : i < this.top && i > this.bottom;
      if (this.getters.isHeaderHidden(sheetId, dimension, i) || isHiddenInViewport) {
        continue;
      }
      size +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
      if (size > position) {
        return i;
      }
    }
    return -1;
  }

  get zone() {
    return { left: this.left, right: this.right, top: this.top, bottom: this.bottom };
  }
  private setViewportOffsetX(offsetX: Pixel) {
    if (!this.canScrollHorizontally) {
      return;
    }
    this.offsetScrollbarX = offsetX;
    this.adjustViewportZoneX();
  }
  private setViewportOffsetY(offsetY: Pixel) {
    if (!this.canScrollVertically) {
      return;
    }
    this.offsetScrollbarY = offsetY;
    this.adjustViewportZoneY();
  }

  /** Corrects the viewport's horizontal offset based on the current structure
   *  To make sure that at least on column is visible inside the viewport.
   */
  private adjustViewportOffsetX() {
    if (this.canScrollHorizontally) {
      const { width: viewportWidth } = this.getMaxSize();
      if (this.width + this.offsetScrollbarX > viewportWidth) {
        this.offsetScrollbarX = Math.max(0, viewportWidth - this.width);
      }
    }
    this.left = this.getColIndex(this.offsetScrollbarX, true);
    this.right = this.getColIndex(this.offsetScrollbarX + this.width, true);
    if (this.right === -1) {
      this.right = this.boundaries.right;
    }
    this.adjustViewportZoneX();
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least on row is visible inside the viewport.
   */
  private adjustViewportOffsetY() {
    if (this.canScrollVertically) {
      const { height: paneHeight } = this.getMaxSize();
      if (this.height + this.offsetScrollbarY > paneHeight) {
        this.offsetScrollbarY = Math.max(0, paneHeight - this.height);
      }
    }
    this.top = this.getRowIndex(this.offsetScrollbarY, true);
    this.bottom = this.getRowIndex(this.offsetScrollbarY + this.width, true);
    if (this.bottom === -1) {
      this.bottom = this.boundaries.bottom;
    }
    this.adjustViewportZoneY();
  }

  /** Updates the pane zone and snapped offset based on its horizontal
   * offset (will find Left) and its width (will find Right) */
  private adjustViewportZoneX() {
    const sheetId = this.sheetId;
    this.left = this.searchHeaderIndex("COL", this.offsetScrollbarX, this.boundaries.left);
    this.right = Math.min(
      this.boundaries.right,
      this.searchHeaderIndex("COL", this.width, this.left)
    );
    if (this.right === -1) {
      this.right = this.getters.getNumberCols(sheetId) - 1;
    }
    this.offsetX =
      this.getters.getColDimensions(sheetId, this.left).start -
      this.getters.getColDimensions(sheetId, this.boundaries.left).start;
  }

  /** Updates the pane zone and snapped offset based on its vertical
   * offset (will find Top) and its width (will find Bottom) */
  private adjustViewportZoneY() {
    const sheetId = this.sheetId;
    this.top = this.searchHeaderIndex("ROW", this.offsetScrollbarY, this.boundaries.top);
    this.bottom = Math.min(
      this.boundaries.bottom,
      this.searchHeaderIndex("ROW", this.height, this.top)
    );
    if (this.bottom === -1) {
      this.bottom = this.getters.getNumberRows(sheetId) - 1;
    }
    this.offsetY =
      this.getters.getRowDimensions(sheetId, this.top).start -
      this.getters.getRowDimensions(sheetId, this.boundaries.top).start;
  }
}
