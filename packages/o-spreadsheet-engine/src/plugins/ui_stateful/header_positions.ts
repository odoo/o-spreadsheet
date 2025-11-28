import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy } from "../../helpers/misc";
import { Command, invalidateEvaluationCommands } from "../../types/commands";
import { Getters } from "../../types/getters";
import { Dimension, HeaderDimensions, HeaderIndex, Pixel, UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

class HeaderPosition {
  private getters: Getters;
  private sheetId: UID;
  private positions: Record<Dimension, Array<[HeaderIndex, Pixel]>> = { COL: [], ROW: [] };

  constructor(getters: Getters, sheetId: UID) {
    this.sheetId = sheetId;
    this.getters = getters;
    this.reset();
  }

  getPosition(dimension: Dimension, position: HeaderIndex): Pixel {
    const positions = this.positions[dimension];
    let start = 0;
    let end = positions.length - 1;
    const defaultHeaderSize = dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      const positionLeft = positions[mid][0];
      const positionRight = positions[mid + 1][0];
      if (positionLeft <= position && position < positionRight) {
        return positions[mid][1] + (position - positionLeft) * defaultHeaderSize;
      } else if (positionLeft > position) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }
    return positions[start][1] + (position - positions[start][0]) * defaultHeaderSize;
  }

  getHeaderIndex(
    dimension: Dimension,
    position: Pixel,
    startingIndex: HeaderIndex = 0
  ): HeaderIndex {
    const positions = this.positions[dimension];
    if (startingIndex) position += this.getPosition(dimension, startingIndex);
    let start = 0;
    let end = positions.length - 1;
    if (Number.isNaN(position) || position < positions[0][1] || position >= positions[end][1]) {
      return -1;
    }
    const defaultHeaderSize = dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
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
    const arraySort = (a, b) => {
      return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
    };

    const hiddenRows: Array<[HeaderIndex, Pixel]> = this.getters
      .getHiddenRows(this.sheetId)
      .map((row) => [row, 0]);
    const customRows = this.getters.getCustomRowSizes(this.sheetId).entries();
    const rowsSizes = [...hiddenRows, ...customRows];
    rowsSizes.sort(arraySort);

    const hiddenCols: Array<[HeaderIndex, Pixel]> = this.getters
      .getUserHiddenCols(this.sheetId)
      .map((col) => [col, 0]);
    const customCols = this.getters.getCustomColSizes(this.sheetId).entries();
    const colsSizes = [...hiddenCols, ...customCols];
    colsSizes.sort(arraySort);

    this.positions = {
      COL: this.makeHeaderPosition(
        colsSizes,
        DEFAULT_CELL_WIDTH,
        this.getters.getNumberCols(this.sheetId)
      ),
      ROW: this.makeHeaderPosition(
        rowsSizes,
        DEFAULT_CELL_HEIGHT,
        this.getters.getNumberRows(this.sheetId)
      ),
    };
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
export class HeaderPositionsUIPlugin extends UIPlugin {
  static getters = [
    "getColDimensions",
    "getRowDimensions",
    "getColRowOffset",
    "getColRowIndex",
  ] as const;

  private headerPositions: Record<UID, HeaderPosition> = {};
  private isDirty = true;

  handle(cmd: Command) {
    if (invalidateEvaluationCommands.has(cmd.type)) {
      this.headerPositions = {};
      this.isDirty = true;
    }

    switch (cmd.type) {
      case "START":
        for (const sheetId of this.getters.getSheetIds()) {
          this.headerPositions[sheetId] = this.setOrResetHeaderPositionsOfSheet(sheetId);
        }
        break;
      case "UPDATE_CELL":
      case "SET_FORMATTING":
      case "CLEAR_FORMATTING":
        this.headerPositions = {};
        this.isDirty = true;
        break;
      case "UPDATE_FILTER":
      case "UPDATE_TABLE":
      case "REMOVE_TABLE":
        this.headerPositions = {};
        this.isDirty = true;
        break;
      case "REMOVE_COLUMNS_ROWS":
      case "RESIZE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "FOLD_HEADER_GROUP":
      case "UNFOLD_HEADER_GROUP":
      case "FOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_ALL_HEADER_GROUPS":
      case "FOLD_ALL_HEADER_GROUPS":
      case "UNGROUP_HEADERS":
      case "GROUP_HEADERS":
      case "CREATE_SHEET":
        if (this.getters.tryGetSheet(cmd.sheetId)) {
          this.headerPositions[cmd.sheetId] = this.setOrResetHeaderPositionsOfSheet(cmd.sheetId);
        }
        break;
      case "DUPLICATE_SHEET":
        this.headerPositions[cmd.sheetIdTo] = deepCopy(this.headerPositions[cmd.sheetId]);
        break;
    }
  }

  finalize() {
    for (const sheetId of this.getters.getSheetIds()) {
      // sheets can be created without this plugin being aware of it
      // in concurrent situations.
      if (this.isDirty || !this.headerPositions[sheetId]) {
        this.headerPositions[sheetId] = this.setOrResetHeaderPositionsOfSheet(sheetId);
      }
    }
    this.isDirty = false;
  }

  /**
   * Returns the size, start and end coordinates of a column on an unfolded sheet
   */
  getColDimensions(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    const start = this.headerPositions[sheetId].getPosition("COL", col);
    const size = this.getters.getColSize(sheetId, col);
    const isColHidden = this.getters.isColHidden(sheetId, col);
    return {
      start,
      size,
      end: start + (isColHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row an unfolded sheet
   */
  getRowDimensions(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    const start = this.headerPositions[sheetId].getPosition("ROW", row);
    const size = this.getters.getRowSize(sheetId, row);
    const isRowHidden = this.getters.isRowHidden(sheetId, row);
    return {
      start,
      size: size,
      end: start + (isRowHidden ? 0 : size),
    };
  }

  /**
   * Returns the offset of a header (determined by the dimension) at the given index
   * based on the referenceIndex given. If start === 0, this method will return
   * the start attribute of the header.
   *
   * i.e. The size from A to B is the distance between A.start and B.end
   */
  getColRowOffset(
    dimension: Dimension,
    referenceIndex: HeaderIndex,
    index: HeaderIndex,
    sheetId: UID = this.getters.getActiveSheetId()
  ): Pixel {
    const referencePosition = this.headerPositions[sheetId].getPosition(dimension, referenceIndex);
    const position = this.headerPositions[sheetId].getPosition(dimension, index);
    return position - referencePosition;
  }

  getColRowIndex(
    dimension: Dimension,
    position: Pixel,
    startIndex: HeaderIndex,
    sheetId: UID = this.getters.getActiveSheetId()
  ): Pixel {
    return this.headerPositions[sheetId].getHeaderIndex(dimension, position, startIndex);
  }

  private setOrResetHeaderPositionsOfSheet(sheetId: UID): HeaderPosition {
    if (this.headerPositions[sheetId]) {
      this.headerPositions[sheetId].reset();
      return this.headerPositions[sheetId];
    }
    return new HeaderPosition(this.getters, sheetId);
  }
}
