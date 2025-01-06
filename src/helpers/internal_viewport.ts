import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, FOOTER_HEIGHT } from "../constants";
import {
  DOMCoordinates,
  DOMDimension,
  Dimension,
  Getters,
  HeaderIndex,
  Pixel,
  Position,
  Rect,
  UID,
  Zone,
} from "../types";
import { intersection, isInside } from "./zones";

export class InternalViewport {
  top: HeaderIndex;
  bottom: HeaderIndex;
  left: HeaderIndex;
  right: HeaderIndex;
  offsetX: Pixel;
  offsetY: Pixel;
  canScrollVertically: boolean;
  canScrollHorizontally: boolean;
  viewportWidth: Pixel;
  viewportHeight: Pixel;
  offsetCorrectionX: Pixel;
  offsetCorrectionY: Pixel;

  constructor(
    private getters: Getters,
    private sheetId: UID,
    private boundaries: Zone,
    sizeInGrid: DOMDimension,
    options: { canScrollVertically: boolean; canScrollHorizontally: boolean },
    offsets: DOMCoordinates
  ) {
    if (sizeInGrid.width < 0 || sizeInGrid.height < 0) {
      throw new Error("Viewport size cannot be negative");
    }
    this.viewportWidth = sizeInGrid.height && sizeInGrid.width;
    this.viewportHeight = sizeInGrid.width && sizeInGrid.height;
    this.top = boundaries.top;
    this.bottom = boundaries.bottom;
    this.left = boundaries.left;
    this.right = boundaries.right;
    this.offsetX = offsets.x;
    this.offsetY = offsets.y;
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

  /** Returns the maximum size (in Pixels) of the viewport relative to its allocated client size
   * When the viewport grid size is smaller than its client width (resp. height), it will return
   * the client width (resp. height).
   */
  getMaxSize(): DOMDimension {
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

    const leftColIndex = this.searchHeaderIndex("COL", lastColEnd - this.viewportWidth, 0);
    const leftColSize = this.getters.getColSize(this.sheetId, leftColIndex);
    const leftRowIndex = this.searchHeaderIndex("ROW", lastRowEnd - this.viewportHeight, 0);
    const topRowSize = this.getters.getRowSize(this.sheetId, leftRowIndex);

    let width = lastColEnd - this.offsetCorrectionX;
    if (this.canScrollHorizontally) {
      width += Math.max(
        DEFAULT_CELL_WIDTH, // leave some minimal space to let the user know they scrolled all the way
        Math.min(leftColSize, this.viewportWidth - lastColSize) // Add pixels that allows the snapping at maximum horizontal scroll
      );
      width = Math.max(width, this.viewportWidth); // if the viewport grid size is smaller than its client width, return client width
    }

    let height = lastRowEnd - this.offsetCorrectionY;
    if (this.canScrollVertically) {
      height += Math.max(
        DEFAULT_CELL_HEIGHT + 5, // leave some space to let the user know they scrolled all the way
        Math.min(topRowSize, this.viewportHeight - lastRowSize) // Add pixels that allows the snapping at maximum vertical scroll
      );
      height = Math.max(height, this.viewportHeight); // if the viewport grid size is smaller than its client height, return client height

      if (lastRowEnd + FOOTER_HEIGHT > height && !this.getters.isReadonly()) {
        height += FOOTER_HEIGHT;
      }
    }

    return { width, height };
  }

  /**
   * Return the index of a column given an offset x, based on the pane left
   * visible cell.
   * It returns -1 if no column is found.
   */
  getColIndex(x: Pixel): HeaderIndex {
    if (x < this.offsetCorrectionX || x > this.offsetCorrectionX + this.viewportWidth) {
      return -1;
    }
    return this.searchHeaderIndex(
      "COL",
      x - this.offsetCorrectionX + this.snapCorrection.x,
      this.left
    );
  }

  /**
   * Return the index of a row given an offset y, based on the pane top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    if (y < this.offsetCorrectionY || y > this.offsetCorrectionY + this.viewportHeight) {
      return -1;
    }
    return this.searchHeaderIndex(
      "ROW",
      y - this.offsetCorrectionY + this.snapCorrection.y,
      this.top
    );
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the pane that is actually displayed on the client. We therefore adjust the offset of the pane
   * until it contains the cell completely.
   */
  adjustPosition(position: Position) {
    const sheetId = this.sheetId;
    const mainCellPosition = this.getters.getMainCellPosition({ sheetId, ...position });

    const { col, row } = this.getters.getNextVisibleCellPosition(mainCellPosition);
    if (isInside(col, this.boundaries.top, this.boundaries)) {
      this.adjustPositionX(col);
    }

    if (isInside(this.boundaries.left, row, this.boundaries)) {
      this.adjustPositionY(row);
    }
  }

  private adjustPositionX(targetCol: HeaderIndex) {
    const sheetId = this.sheetId;
    const { start, end } = this.getters.getColDimensions(sheetId, targetCol);

    if (this.offsetX + this.viewportWidth + this.offsetCorrectionX < end) {
      this.offsetX = end - this.viewportWidth;
    } else if (this.offsetX + this.offsetCorrectionX > start) {
      this.offsetX = start - this.offsetCorrectionX;
    }
    this.adjustViewportZoneX();
  }

  private adjustPositionY(targetRow: HeaderIndex) {
    const sheetId = this.sheetId;
    const { start, end } = this.getters.getRowDimensions(sheetId, targetRow);
    if (this.offsetY + this.viewportHeight + this.offsetCorrectionY < end) {
      this.offsetY = end - this.viewportHeight;
    } else if (this.offsetY + this.offsetCorrectionY > start) {
      this.offsetY = start - this.offsetCorrectionY;
    }
    this.adjustViewportZoneY();
  }

  willNewOffsetScrollViewport(offsetX: Pixel, offsetY: Pixel) {
    return (
      (this.canScrollHorizontally && this.offsetX !== offsetX) ||
      (this.canScrollVertically && this.offsetY !== offsetY)
    );
  }

  setViewportOffset(offsetX: Pixel, offsetY: Pixel) {
    this.setViewportOffsetX(offsetX);
    this.setViewportOffsetY(offsetY);
  }

  adjustViewportZone() {
    this.adjustViewportZoneX();
    this.adjustViewportZoneY();
  }

  /**
   *
   * Computes the visible coordinates & dimensions of a given zone inside the viewport
   *
   */
  getVisibleRect(zone: Zone): Rect | undefined {
    const targetZone = intersection(zone, this);
    const scrollDeltaX = this.snapCorrection.x;
    const scrollDeltaY = this.snapCorrection.y;
    if (targetZone) {
      const x =
        this.getters.getColRowOffset("COL", this.left, targetZone.left) +
        this.offsetCorrectionX -
        (this.left !== targetZone.left ? scrollDeltaX : 0);

      const y =
        this.getters.getColRowOffset("ROW", this.top, targetZone.top) +
        this.offsetCorrectionY -
        (this.top !== targetZone.top ? scrollDeltaY : 0);

      const width = Math.min(
        this.getters.getColRowOffset("COL", targetZone.left, targetZone.right + 1) -
          (this.left === targetZone.left ? scrollDeltaX : 0),
        this.viewportWidth
      );
      const height = Math.min(
        this.getters.getColRowOffset("ROW", targetZone.top, targetZone.bottom + 1) -
          (this.top === targetZone.top ? scrollDeltaY : 0),
        this.viewportHeight
      );
      return { x, y, width, height };
    }
    return undefined;
  }

  /**
   *
   * @returns Computes the absolute coordinates & dimensions of a given zone inside the viewport
   *
   */
  getFullRect(zone: Zone): Rect | undefined {
    const targetZone = intersection(zone, this);
    const scrollDeltaX = this.snapCorrection.x;
    const scrollDeltaY = this.snapCorrection.y;
    if (targetZone) {
      const x = this.getters.getColRowOffset("COL", this.left, zone.left) + this.offsetCorrectionX;
      const y = this.getters.getColRowOffset("ROW", this.top, zone.top) + this.offsetCorrectionY;
      const width = this.getters.getColRowOffset("COL", zone.left, zone.right + 1);

      const height = this.getters.getColRowOffset("ROW", zone.top, zone.bottom + 1);
      return { x: x - scrollDeltaX, y: y - scrollDeltaY, width, height };
    }
    return undefined;
  }

  isVisible(col: HeaderIndex, row: HeaderIndex) {
    const isInside = row <= this.bottom && row >= this.top && col >= this.left && col <= this.right;
    return (
      isInside &&
      !this.getters.isColHidden(this.sheetId, col) &&
      !this.getters.isRowHidden(this.sheetId, row)
    );
  }

  private searchHeaderIndex(
    dimension: Dimension,
    position: Pixel,
    startIndex: HeaderIndex = 0
  ): HeaderIndex {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) {
      return -1;
    }
    const sheetId = this.sheetId;
    const headers = this.getters.getNumberHeaders(sheetId, dimension);
    // using a binary search:
    let start = startIndex;
    let end = headers;
    while (start <= end && start !== headers && end !== -1) {
      const mid: HeaderIndex = Math.floor((start + end) / 2);
      const offset = this.getters.getColRowOffset(dimension, startIndex, mid);
      const size = this.getters.getHeaderSize(sheetId, dimension, mid);
      if (position >= offset && position < offset + size) {
        return mid;
      } else if (position >= offset + size) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    return -1;
  }

  private setViewportOffsetX(offsetX: Pixel) {
    if (!this.canScrollHorizontally) {
      return;
    }
    this.offsetX = offsetX;
    this.adjustViewportZoneX();
  }

  private setViewportOffsetY(offsetY: Pixel) {
    if (!this.canScrollVertically) {
      return;
    }
    this.offsetY = offsetY;
    this.adjustViewportZoneY();
  }

  /** Corrects the viewport's horizontal offset based on the current structure
   *  To make sure that at least one column is visible inside the viewport.
   */
  private adjustViewportOffsetX() {
    if (this.canScrollHorizontally) {
      const { width: viewportWidth } = this.getMaxSize();
      if (this.viewportWidth + this.offsetX > viewportWidth) {
        this.offsetX = Math.max(0, viewportWidth - this.viewportWidth);
      }
    }
    this.adjustViewportZoneX();
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least one row is visible inside the viewport.
   */
  private adjustViewportOffsetY() {
    if (this.canScrollVertically) {
      const { height: paneHeight } = this.getMaxSize();
      if (this.viewportHeight + this.offsetY > paneHeight) {
        this.offsetY = Math.max(0, paneHeight - this.viewportHeight);
      }
    }
    this.adjustViewportZoneY();
  }

  /** Updates the pane zone and snapped offset based on its horizontal
   * offset (will find Left) and its width (will find Right) */
  private adjustViewportZoneX() {
    this.left = this.searchHeaderIndex("COL", this.offsetX, this.boundaries.left);
    this.right = Math.min(
      this.boundaries.right,
      this.searchHeaderIndex(
        "COL",
        // if we hit the border of two cells, we want to match the previous
        Math.max(this.viewportWidth + this.snapCorrection.x - 0.1),
        this.left
      )
    );
    if (!this.viewportWidth) {
      return;
    }
    if (this.left === -1) {
      this.left = this.boundaries.left;
    }
    if (this.right === -1) {
      this.right = this.boundaries.right;
    }
  }

  /** Updates the pane zone and snapped offset based on its vertical
   * offset (will find Top) and its width (will find Bottom) */
  private adjustViewportZoneY() {
    this.top = this.searchHeaderIndex("ROW", this.offsetY, this.boundaries.top);
    this.bottom = Math.min(
      this.boundaries.bottom,
      this.searchHeaderIndex(
        "ROW",
        // if we hit the border of two cells, we want to match the previous
        Math.max(this.viewportHeight + this.snapCorrection.y - 0.1, 0),
        this.top
      )
    );
    if (!this.viewportHeight) {
      return;
    }
    if (this.top === -1) {
      this.top = this.boundaries.top;
    }
    if (this.bottom === -1) {
      this.bottom = this.boundaries.bottom;
    }
  }

  /** represents the part of the header on the topLeft that could be partially
   * hidden due to the scroll
   * */
  private get snapCorrection() {
    return {
      x: Math.abs(
        this.offsetX -
          this.getters.getColRowOffset("COL", this.boundaries.left, Math.max(0, this.left))
      ),
      y: Math.abs(
        this.offsetY -
          this.getters.getColRowOffset("ROW", this.boundaries.top, Math.max(0, this.top))
      ),
    };
  }
}
