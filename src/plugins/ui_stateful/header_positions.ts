import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy } from "../../helpers/index";
import { Command, Getters, UID } from "../../types";
import { invalidateEvaluationCommands } from "../../types/commands";
import { Dimension, HeaderDimensions, HeaderIndex, Pixel } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

class HeaderPosition {
  private getters: Getters;
  private sheetId: UID;
  private positions: Record<Dimension, Array<HeaderIndex>>;
  private lastComputedPosition: Record<Dimension, number>;

  constructor(getters: Getters, sheetId: UID) {
    this.sheetId = sheetId;
    this.getters = getters;
    this.positions = {
      COL: new Array(this.getters.getLastUsedCol(this.sheetId)),
      ROW: new Array(this.getters.getLastUsedRow(this.sheetId)),
    };
    this.positions["COL"][0] = 0;
    this.positions["ROW"][0] = 0;
    this.lastComputedPosition = {
      COL: 0,
      ROW: 0,
    };
  }

  get(dimension: Dimension, position: HeaderIndex): Pixel {
    const computeUntil = Math.min(position, this.positions[dimension].length);
    for (
      let i = this.lastComputedPosition[dimension],
        offset = this.positions[dimension][this.lastComputedPosition[dimension]];
      i <= computeUntil;
      i++
    ) {
      this.positions[dimension][i] = offset;
      if (this.getters.isHeaderHidden(this.sheetId, dimension, i)) continue;
      offset += this.getters.getHeaderSize(this.sheetId, dimension, i);
    }
    if (computeUntil > this.lastComputedPosition[dimension])
      this.lastComputedPosition[dimension] = computeUntil;

    if (position < this.positions[dimension].length) {
      return this.positions[dimension][position];
    } else {
      const lastPosition = this.positions[dimension].length - 1;
      const defaultSize = dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
      return this.positions[dimension][lastPosition] + (position - lastPosition - 1) * defaultSize;
    }
  }

  reset() {
    this.positions = {
      COL: new Array(this.getters.getLastUsedCol(this.sheetId)),
      ROW: new Array(this.getters.getLastUsedRow(this.sheetId)),
    };
    this.positions["COL"][0] = 0;
    this.positions["ROW"][0] = 0;
    this.lastComputedPosition = {
      COL: 0,
      ROW: 0,
    };
  }
}

export class HeaderPositionsUIPlugin extends UIPlugin {
  static getters = ["getColDimensions", "getRowDimensions", "getColRowOffset"] as const;

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
    const start = this.headerPositions[sheetId].get("COL", col);
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
    const start = this.headerPositions[sheetId].get("ROW", row);
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
    const referencePosition = this.headerPositions[sheetId].get(dimension, referenceIndex);
    const position = this.headerPositions[sheetId].get(dimension, index);
    return position - referencePosition;
  }

  private setOrResetHeaderPositionsOfSheet(sheetId: UID): HeaderPosition {
    if (this.headerPositions[sheetId]) {
      this.headerPositions[sheetId].reset();
      return this.headerPositions[sheetId];
    }
    return new HeaderPosition(this.getters, sheetId);
  }
}
