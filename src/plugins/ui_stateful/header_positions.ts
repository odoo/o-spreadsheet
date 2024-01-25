import { deepCopy } from "../../helpers/index";
import { Command, UID } from "../../types";
import { invalidateEvaluationCommands } from "../../types/commands";
import { Dimension, HeaderDimensions, HeaderIndex, Pixel } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class HeaderPositionsUIPlugin extends UIPlugin {
  static getters = ["getColDimensions", "getRowDimensions", "getColRowOffset"] as const;

  private headerPositions: Record<UID, Record<Dimension, Record<HeaderIndex, Pixel>>> = {};
  private isDirty = true;

  handle(cmd: Command) {
    if (invalidateEvaluationCommands.has(cmd.type)) {
      this.headerPositions = {};
      this.isDirty = true;
    }

    switch (cmd.type) {
      case "START":
        for (const sheetId of this.getters.getSheetIds()) {
          this.headerPositions[sheetId] = this.computeHeaderPositionsOfSheet(sheetId);
        }
        break;
      case "UPDATE_CELL":
        if ("content" in cmd || "format" in cmd) {
          this.headerPositions = {};
          this.isDirty = true;
        } else {
          this.headerPositions[cmd.sheetId] = this.computeHeaderPositionsOfSheet(cmd.sheetId);
        }
        break;
      case "UPDATE_FILTER":
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
        this.headerPositions[cmd.sheetId] = this.computeHeaderPositionsOfSheet(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.headerPositions[cmd.sheetIdTo] = deepCopy(this.headerPositions[cmd.sheetId]);
        break;
    }
  }

  finalize() {
    if (this.isDirty) {
      for (const sheetId of this.getters.getSheetIds()) {
        this.headerPositions[sheetId] = this.computeHeaderPositionsOfSheet(sheetId);
      }
      this.isDirty = false;
    }
  }

  /**
   * Returns the size, start and end coordinates of a column on an unfolded sheet
   */
  getColDimensions(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    const start = this.headerPositions[sheetId]["COL"][col];
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
    const start = this.headerPositions[sheetId]["ROW"][row];
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
    const referencePosition = this.headerPositions[sheetId][dimension][referenceIndex];
    const position = this.headerPositions[sheetId][dimension][index];
    return position - referencePosition;
  }

  private computeHeaderPositionsOfSheet(sheetId: UID) {
    return {
      COL: this.computePositions(sheetId, "COL"),
      ROW: this.computePositions(sheetId, "ROW"),
    };
  }

  private computePositions(sheetId: UID, dimension: Dimension): Record<HeaderIndex, Pixel> {
    const positions: Record<HeaderIndex, Pixel> = {};
    let offset = 0;
    // loop on number of headers +1 so the position of (last header + 1) is the end of the sheet
    for (let i = 0; i < this.getters.getNumberHeaders(sheetId, dimension) + 1; i++) {
      positions[i] = offset;
      if (this.getters.isHeaderHidden(sheetId, dimension, i)) {
        continue;
      }
      offset += this.getters.getHeaderSize(sheetId, dimension, i);
    }
    return positions;
  }
}
