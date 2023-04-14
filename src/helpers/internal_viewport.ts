import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import {
  Dimension,
  DOMDimension,
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
    sizeInGrid: { width: Pixel; height: Pixel },
    options: { canScrollVertically: boolean; canScrollHorizontally: boolean },
    offsets: { x: Pixel; y: Pixel }
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

    return { width, height };
  }

  /**
   * Return the index of a column given an offset x, based on the pane left
   * visible cell.
   * It returns -1 if no column is found.
   */
  getColIndex(x: Pixel, absolute = false): HeaderIndex {
    if (x < this.offsetCorrectionX || x > this.offsetCorrectionX + this.viewportWidth) {
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
    if (y < this.offsetCorrectionY || y > this.offsetCorrectionY + this.viewportHeight) {
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
    const mainCellPosition = this.getters.getMainCellPosition({ sheetId, ...position });

    const { col, row } = this.getters.getNextVisibleCellPosition(mainCellPosition);
    if (isInside(col, this.boundaries.top, this.boundaries)) {
      this.adjustPositionX(col);
    }

    if (isInside(this.boundaries.left, row, this.boundaries)) {
      this.adjustPositionY(row);
    }
  }

  adjustPositionX(targetCol: HeaderIndex) {
    const sheetId = this.sheetId;
    const { end } = this.getters.getColDimensions(sheetId, targetCol);
    const maxCol = this.getters.getNumberCols(sheetId);

    if (this.offsetX + this.offsetCorrectionX + this.viewportWidth < end) {
      for (
        let col = this.left;
        this.offsetX + this.offsetCorrectionX + this.viewportWidth < end;
        col++
      ) {
        if (col > maxCol) {
          break;
        }
        if (this.getters.isColHidden(sheetId, col)) {
          continue;
        }

        this.offsetX = this.getters.getColDimensions(sheetId, col).end - this.offsetCorrectionX;
        this.offsetScrollbarX = this.offsetX;
        this.adjustViewportZoneX();
      }
    } else if (this.left > targetCol) {
      for (let col = this.left; col >= targetCol; col--) {
        if (col < 0) {
          break;
        }
        if (this.getters.isColHidden(sheetId, col)) {
          continue;
        }

        this.offsetX = this.getters.getColDimensions(sheetId, col).start - this.offsetCorrectionX;
        this.offsetScrollbarX = this.offsetX;
        this.adjustViewportZoneX();
      }
    }
  }

  adjustPositionY(targetRow: HeaderIndex) {
    const sheetId = this.sheetId;
    const { end } = this.getters.getRowDimensions(sheetId, targetRow);
    const maxRow = this.getters.getNumberRows(sheetId);

    if (this.offsetY + this.viewportHeight + this.offsetCorrectionY < end) {
      for (
        let row = this.top;
        this.offsetY + this.viewportHeight + this.offsetCorrectionY < end;
        row++
      ) {
        if (row > maxRow) {
          break;
        }
        if (this.getters.isRowHidden(sheetId, row)) {
          continue;
        }

        this.offsetY = this.getters.getRowDimensions(sheetId, row).end - this.offsetCorrectionY;
        this.offsetScrollbarY = this.offsetY;
        this.adjustViewportZoneY();
      }
    } else if (this.top > targetRow) {
      for (let row = this.top; row >= targetRow; row--) {
        if (row < 0) {
          break;
        }
        if (this.getters.isRowHidden(sheetId, row)) {
          continue;
        }

        this.offsetY = this.getters.getRowDimensions(sheetId, row).start - this.offsetCorrectionY;
        this.offsetScrollbarY = this.offsetY;
        this.adjustViewportZoneY();
      }
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

  /**
   *
   * @param zone
   * @returns Computes the absolute coordinate of a given zone inside the viewport
   */
  getRect(zone: Zone): Rect | undefined {
    const targetZone = intersection(zone, this.zone);
    if (targetZone) {
      const x =
        this.getters.getColRowOffset("COL", this.zone.left, targetZone.left) +
        this.offsetCorrectionX;

      const y =
        this.getters.getColRowOffset("ROW", this.zone.top, targetZone.top) + this.offsetCorrectionY;

      const width = Math.min(
        this.getters.getColRowOffset("COL", targetZone.left, targetZone.right + 1),
        this.viewportWidth
      );
      const height = Math.min(
        this.getters.getColRowOffset("ROW", targetZone.top, targetZone.bottom + 1),
        this.viewportHeight
      );
      return {
        x,
        y,
        width,
        height,
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

  private get zone() {
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
      if (this.viewportWidth + this.offsetScrollbarX > viewportWidth) {
        this.offsetScrollbarX = Math.max(0, viewportWidth - this.viewportWidth);
      }
    }
    this.left = this.getColIndex(this.offsetScrollbarX, true);
    this.right = this.getColIndex(this.offsetScrollbarX + this.viewportWidth, true);
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
      if (this.viewportHeight + this.offsetScrollbarY > paneHeight) {
        this.offsetScrollbarY = Math.max(0, paneHeight - this.viewportHeight);
      }
    }
    this.top = this.getRowIndex(this.offsetScrollbarY, true);
    this.bottom = this.getRowIndex(this.offsetScrollbarY + this.viewportWidth, true);
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
      this.searchHeaderIndex("COL", this.viewportWidth, this.left)
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
      this.searchHeaderIndex("ROW", this.viewportHeight, this.top)
    );
    if (this.bottom === -1) {
      this.bottom = this.getters.getNumberRows(sheetId) - 1;
    }
    this.offsetY =
      this.getters.getRowDimensions(sheetId, this.top).start -
      this.getters.getRowDimensions(sheetId, this.boundaries.top).start;
  }
}
