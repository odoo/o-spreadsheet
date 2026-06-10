import { RenderingGetters } from "../types/getters";
import { Dimension, HeaderIndex, Pixel, Position, UID, Zone } from "../types/misc";
import { DOMCoordinates, DOMDimension, Rect } from "../types/rendering";
import { intersection, isInside } from "./zones";

interface InternalViewportArgs {
  getters: RenderingGetters;
  sheetId: UID;
  boundaries: Zone;
  sizeInGrid: DOMDimension;
  canScrollVertically: boolean;
  canScrollHorizontally: boolean;
  offsets: DOMCoordinates;
  getFooterSize: () => number;
}

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

  private getters: RenderingGetters;
  private sheetId: UID;
  private boundaries: Zone;
  private getFooterSize: () => number;

  constructor(args: InternalViewportArgs) {
    if (args.sizeInGrid.width < 0 || args.sizeInGrid.height < 0) {
      throw new Error("Viewport size cannot be negative");
    }
    this.getters = args.getters;
    this.sheetId = args.sheetId;
    this.boundaries = args.boundaries;

    this.viewportWidth = args.sizeInGrid.height && args.sizeInGrid.width;
    this.viewportHeight = args.sizeInGrid.width && args.sizeInGrid.height;
    this.top = args.boundaries.top;
    this.bottom = args.boundaries.bottom;
    this.left = args.boundaries.left;
    this.right = args.boundaries.right;
    this.offsetX = args.offsets.x;
    this.offsetY = args.offsets.y;
    this.canScrollVertically = args.canScrollVertically;
    this.canScrollHorizontally = args.canScrollHorizontally;
    this.getFooterSize = args.getFooterSize;

    this.adjustViewportOffsetX();
    this.adjustViewportOffsetY();
  }

  // PUBLIC

  get boundaryTopY() {
    return this.getters.getRowDimensions(this.sheetId, this.boundaries.top).start;
  }

  get boundaryLeftX() {
    return this.getters.getColDimensions(this.sheetId, this.boundaries.left).start;
  }

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

    const { end: lastColEnd } = this.getters.getColDimensions(this.sheetId, lastCol);
    const { end: lastRowEnd } = this.getters.getRowDimensions(this.sheetId, lastRow);

    let width = lastColEnd - this.boundaryLeftX;
    if (this.canScrollHorizontally) {
      width = Math.max(width, this.viewportWidth); // if the viewport grid size is smaller than its client width, return client width
    }

    let height = lastRowEnd - this.boundaryTopY;
    if (this.canScrollVertically) {
      height = Math.max(height, this.viewportHeight); // if the viewport grid size is smaller than its client height, return client height

      if (lastRowEnd + this.getFooterSize() > height) {
        height += this.getFooterSize();
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
    return this.searchHeaderIndex("COL", x + this.snapCorrection.x, this.left);
  }

  /**
   * Return the index of a row given an offset y, based on the pane top
   * visible cell.
   * It returns -1 if no row is found.
   */
  getRowIndex(y: Pixel): HeaderIndex {
    return this.searchHeaderIndex("ROW", y + this.snapCorrection.y, this.top);
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the pane that is actually displayed on the client. We therefore adjust the offset of the pane
   * until it contains the cell completely.
   */
  repositionViewport(position: Position) {
    const sheetId = this.sheetId;
    const mainCellPosition = this.getters.getMainCellPosition({ sheetId, ...position });

    const { col, row } = this.getters.getNextVisibleCellPosition(mainCellPosition);
    if (isInside(col, this.boundaries.top, this.boundaries)) {
      this.repositionViewportX(col);
    }

    if (isInside(this.boundaries.left, row, this.boundaries)) {
      this.repositionViewportY(row);
    }
  }

  private repositionViewportX(targetCol: HeaderIndex) {
    const sheetId = this.sheetId;
    const { start, end } = this.getters.getColDimensions(sheetId, targetCol);

    if (this.offsetX + this.viewportWidth + this.boundaryLeftX < end) {
      this.offsetX = end - this.viewportWidth - this.boundaryLeftX;
    } else if (this.offsetX + this.boundaryLeftX > start) {
      this.offsetX = start - this.boundaryLeftX;
    }
    this.adjustViewportZoneX();
  }

  private repositionViewportY(targetRow: HeaderIndex) {
    const sheetId = this.sheetId;
    const { start, end } = this.getters.getRowDimensions(sheetId, targetRow);
    if (this.offsetY + this.viewportHeight + this.boundaryTopY < end) {
      this.offsetY = end - this.viewportHeight - this.boundaryTopY;
    } else if (this.offsetY + this.boundaryTopY > start) {
      this.offsetY = start - this.boundaryTopY;
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

  isZoneVisible(zone: Zone): boolean {
    return intersection(zone, this) !== undefined;
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
        this.getters.getColRowOffset("COL", this.left, targetZone.left, this.sheetId) -
        (this.left !== targetZone.left ? scrollDeltaX : 0);

      const y =
        this.getters.getColRowOffset("ROW", this.top, targetZone.top, this.sheetId) -
        (this.top !== targetZone.top ? scrollDeltaY : 0);

      const width = Math.min(
        this.getters.getColRowOffset("COL", targetZone.left, targetZone.right + 1, this.sheetId) -
          (this.left === targetZone.left ? scrollDeltaX : 0),
        this.viewportWidth
      );
      const height = Math.min(
        this.getters.getColRowOffset("ROW", targetZone.top, targetZone.bottom + 1, this.sheetId) -
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
    const targetZone = intersection(zone, this.boundaries);
    const scrollDeltaX = this.snapCorrection.x;
    const scrollDeltaY = this.snapCorrection.y;
    if (targetZone) {
      const x = this.getters.getColRowOffset("COL", this.left, zone.left, this.sheetId);
      const y = this.getters.getColRowOffset("ROW", this.top, zone.top, this.sheetId);
      const width = this.getters.getColRowOffset("COL", zone.left, zone.right + 1, this.sheetId);

      const height = this.getters.getColRowOffset("ROW", zone.top, zone.bottom + 1, this.sheetId);
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

  searchHeaderIndex(
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
      const offset = this.getters.getColRowOffset(dimension, startIndex, mid, this.sheetId);
      const size = this.getters.isHeaderHidden(sheetId, dimension, mid)
        ? 0
        : this.getters.getHeaderSize(sheetId, dimension, mid);
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
          this.getters.getColRowOffset(
            "COL",
            this.boundaries.left,
            Math.max(0, this.left),
            this.sheetId
          )
      ),
      y: Math.abs(
        this.offsetY -
          this.getters.getColRowOffset(
            "ROW",
            this.boundaries.top,
            Math.max(0, this.top),
            this.sheetId
          )
      ),
    };
  }
}
