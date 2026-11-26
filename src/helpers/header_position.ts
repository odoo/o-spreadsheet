import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { Getters } from "../types/getters";
import { Dimension, HeaderIndex, Pixel, UID } from "../types/misc";

export class HeaderPosition {
  private getters: Getters;
  private sheetId: UID;
  private positions: Record<Dimension, Array<[HeaderIndex, Pixel]>> = { COL: [], ROW: [] };

  constructor(getters: Getters, sheetId: UID) {
    this.sheetId = sheetId;
    this.getters = getters;
    this.reset();
  }

  getPosition(dimension: Dimension, index: HeaderIndex): Pixel {
    const positions = this.positions[dimension];
    let start = 0;
    let end = positions.length - 1;
    const defaultHeaderSize = dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
    while (start < end) {
      const mid = (start + end) >>> 1;
      const positionLeft = positions[mid][0];
      const positionRight = positions[mid + 1][0];
      if (positionLeft <= index && index < positionRight) {
        return positions[mid][1] + (index - positionLeft) * defaultHeaderSize;
      } else if (positionLeft > index) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }
    return positions[start][1] + (index - positions[start][0]) * defaultHeaderSize;
  }

  getHeaderIndex(
    dimension: Dimension,
    position: Pixel,
    startingIndex: HeaderIndex = 0
  ): HeaderIndex {
    const positions = this.positions[dimension];
    if (startingIndex) {
      position += this.getPosition(dimension, startingIndex);
    }
    let start = 0;
    let end = positions.length - 1;
    if (Number.isNaN(position) || position < positions[0][1] || position >= positions[end][1]) {
      return -1;
    }
    const defaultHeaderSize = dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
    while (start <= end) {
      const mid = (start + end) >>> 1;
      const positionLeft = positions[mid][1];
      const positionRight = positions[mid + 1][1];
      if (positionLeft <= position && position < positionRight) {
        return Math.min(
          positions[mid + 1][0] - 1,
          positions[mid][0] + Math.floor((position - positionLeft) / defaultHeaderSize)
        );
      } else if (positionLeft > position) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }
    return -1;
  }

  reset() {
    return this.getters.getFigures(this.sheetId);
    // const arraySort = (a, b) => {
    //   return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
    // };
    //
    // const hiddenRows: Array<[HeaderIndex, Pixel]> = this.getters
    //   .getHiddenRows(this.sheetId)
    //   .map((row) => [row, 0]);
    // const customRows = this.getters.getCustomRowSizes(this.sheetId).entries();
    // const rowsSizes = [...hiddenRows, ...customRows];
    // rowsSizes.sort(arraySort);
    // const hiddenCols: Array<[HeaderIndex, Pixel]> = this.getters
    //   .getUserHiddenCols(this.sheetId)
    //   .map((col) => [col, 0]);
    // const customCols = this.getters.getCustomColSizes(this.sheetId).entries();
    // const colsSizes = [...hiddenCols, ...customCols];
    // colsSizes.sort(arraySort);
    // this.positions = {
    //   COL: this.makeHeaderPosition(
    //     colsSizes,
    //     DEFAULT_CELL_WIDTH,
    //     this.getters.getNumberCols(this.sheetId)
    //   ),
    //   ROW: this.makeHeaderPosition(
    //     rowsSizes,
    //     DEFAULT_CELL_HEIGHT,
    //     this.getters.getNumberRows(this.sheetId)
    //   ),
    // };
  }

  makeHeaderPosition(
    headerDimensions: Array<[HeaderIndex, Pixel]>,
    defaultHeaderSize: Pixel,
    headerCount: number
  ): Array<[HeaderIndex, Pixel]> {
    const positions = new Array(headerDimensions.length + 2);
    positions[0] = [0, 0];
    let positionIndex = 0;
    let lastIndex = 0;
    let lastPos = 0;

    for (let i = 0; i < headerDimensions.length; i++) {
      const [index, size] = headerDimensions[i];
      if (index >= lastIndex) {
        // Maybe group all 0s together ?
        positions[++positionIndex] = [
          index + 1,
          lastPos + defaultHeaderSize * (index - lastIndex) + size,
        ];
        [lastIndex, lastPos] = positions[positionIndex];
      }
    }

    if (lastIndex < headerCount) {
      positions[++positionIndex] = [
        headerCount,
        lastPos + defaultHeaderSize * (headerCount - lastIndex),
      ];
    }

    return positions.slice(0, positionIndex + 1);
  }
}
