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
    this.viewportWidth = sizeInGrid.width;
    this.viewportHeight = sizeInGrid.height;
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
    }

    if (lastRowEnd + FOOTER_HEIGHT > height && !this.getters.isReadonly()) {
      height += FOOTER_HEIGHT;
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
    return this.searchHeaderIndex("COL", x - this.offsetCorrectionX, this.left);
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
    return this.searchHeaderIndex("ROW", y - this.offsetCorrectionY, this.top);
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
    const { end } = this.getters.getColDimensions(sheetId, targetCol);
    if (this.offsetX + this.offsetCorrectionX + this.viewportWidth < end) {
      const maxCol = this.getters.getNumberCols(sheetId);
      let finalTarget = targetCol;
      while (this.getters.isColHidden(sheetId, finalTarget) && finalTarget < maxCol) {
        finalTarget++;
      }
      const finalTargetEnd = this.getters.getColDimensions(sheetId, finalTarget).end;
      const startIndex = this.searchHeaderIndex(
        "COL",
        finalTargetEnd - this.viewportWidth - this.offsetCorrectionX,
        this.boundaries.left
      );
      this.offsetScrollbarX =
        this.getters.getColDimensions(sheetId, startIndex).end - this.offsetCorrectionX;
    } else if (this.left > targetCol) {
      let finalTarget = targetCol;
      while (this.getters.isColHidden(sheetId, finalTarget) && finalTarget > 0) {
        finalTarget--;
      }
      this.offsetScrollbarX =
        this.getters.getColDimensions(sheetId, finalTarget).start - this.offsetCorrectionX;
    }
    this.adjustViewportZoneX();
  }

  private adjustPositionY(targetRow: HeaderIndex) {
    const sheetId = this.sheetId;
    const { end } = this.getters.getRowDimensions(sheetId, targetRow);
    if (this.offsetY + this.viewportHeight + this.offsetCorrectionY < end) {
      const maxRow = this.getters.getNumberRows(sheetId);
      let finalTarget = targetRow;
      while (this.getters.isRowHidden(sheetId, finalTarget) && finalTarget < maxRow) {
        finalTarget++;
      }
      const finalTargetEnd = this.getters.getRowDimensions(sheetId, finalTarget).end;
      const startIndex = this.searchHeaderIndex(
        "ROW",
        finalTargetEnd - this.viewportHeight - this.offsetCorrectionY,
        this.boundaries.top
      );
      this.offsetScrollbarY =
        this.getters.getRowDimensions(sheetId, startIndex).end - this.offsetCorrectionY;
    } else if (this.top > targetRow) {
      let finalTarget = targetRow;
      while (this.getters.isRowHidden(sheetId, finalTarget) && finalTarget > 0) {
        finalTarget--;
      }
      this.offsetScrollbarY =
        this.getters.getRowDimensions(sheetId, finalTarget).start - this.offsetCorrectionY;
    }
    this.adjustViewportZoneY();
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
   * @param zone
   * @returns Computes the absolute coordinate of a given zone inside the viewport
   */
  getRect(zone: Zone): Rect | undefined {
    // change this to use offset correction not snapped
    // need to remove the diff
    // offsetScrollbarX > offsetX
    const scrollbardiff = this.offsetScrollbarY - this.offsetY; // > 0
    const targetZone = intersection(zone, this);
    if (targetZone) {
      const x = this.getters.getColRowOffset("COL", this.left, targetZone.left);

      const y =
        this.getters.getColRowOffset("ROW", this.top, targetZone.top) +
        this.offsetCorrectionY -
        (this.top !== targetZone.top ? scrollbardiff : 0);

      const width = Math.min(
        this.getters.getColRowOffset("COL", targetZone.left, targetZone.right + 1),
        this.viewportWidth
      );
      const height =
        Math.min(
          this.getters.getColRowOffset("ROW", targetZone.top, targetZone.bottom + 1),
          this.viewportHeight
        ) - (this.top === targetZone.top ? scrollbardiff : 0);
      return {
        x,
        y,
        width,
        height,
      };
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
    const sheetId = this.sheetId;
    const headers = this.getters.getNumberHeaders(sheetId, dimension);
    // using a binary search:
    let start = startIndex;
    let end = headers;
    while (start <= end && start !== headers && end !== -1) {
      const mid = Math.floor((start + end) / 2);
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
      if (this.viewportWidth + this.offsetScrollbarX > viewportWidth) {
        this.offsetScrollbarX = Math.max(0, viewportWidth - this.viewportWidth);
      }
    }
    this.adjustViewportZoneX();
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least on row is visible inside the viewport.
   */
  private adjustViewportOffsetY() {
    if (this.canScrollVertically) {
      const { height: paneHeight } = this.getMaxSize();
      if (this.viewportHeight + this.offsetScrollbarY > paneHeight) {
        this.offsetScrollbarY = Math.max(0, paneHeight - this.viewportHeight);
      }
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
      this.searchHeaderIndex("COL", this.viewportWidth, this.left)
    );
    if (this.left === -1) {
      this.left = this.boundaries.left;
    }
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
      this.searchHeaderIndex("ROW", this.viewportHeight, this.top)
    );
    if (this.top === -1) {
      this.top = this.boundaries.top;
    }
    if (this.bottom === -1) {
      this.bottom = this.getters.getNumberRows(sheetId) - 1;
    }
    this.offsetY =
      this.getters.getRowDimensions(sheetId, this.top).start -
      this.getters.getRowDimensions(sheetId, this.boundaries.top).start;
  }
}
