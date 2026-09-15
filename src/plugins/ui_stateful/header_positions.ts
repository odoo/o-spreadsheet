import { deepCopy } from "../../helpers/misc";
import { Command, invalidateEvaluationCommands } from "../../types/commands";
import { Dimension, HeaderDimensions, HeaderIndex, Pixel, UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class HeaderPositionsUIPlugin extends UIPlugin {
  static getters = [
    "getColDimensions",
    "getRowDimensions",
    "getHeaderDimensions",
    "getColRowOffset",
  ] as const;

  private headerPositions: Record<UID, Record<Dimension, Record<HeaderIndex, Pixel>>> = {};
  private isDirty = true;

  handlers = {
    // Either the content, format or style can impact the header sizes of a sheet
    UPDATE_CELL: this.invalidateHeaderPositions,
    REMOVE_TABLE: this.invalidateHeaderPositions,
    UPDATE_TABLE: this.invalidateHeaderPositions,
    UPDATE_FILTER: this.invalidateHeaderPositions,
    HIDE_COLUMNS_ROWS: this.computeSheetHeaderPositions,
    UNHIDE_COLUMNS_ROWS: this.computeSheetHeaderPositions,
    GROUP_HEADERS: this.computeSheetHeaderPositions,
    UNGROUP_HEADERS: this.computeSheetHeaderPositions,
    FOLD_HEADER_GROUP: this.computeSheetHeaderPositions,
    UNFOLD_HEADER_GROUP: this.computeSheetHeaderPositions,
    FOLD_ALL_HEADER_GROUPS: this.computeSheetHeaderPositions,
    UNFOLD_ALL_HEADER_GROUPS: this.computeSheetHeaderPositions,
    FOLD_HEADER_GROUPS_IN_ZONE: this.computeSheetHeaderPositions,
    UNFOLD_HEADER_GROUPS_IN_ZONE: this.computeSheetHeaderPositions,
    RESIZE_COLUMNS_ROWS: this.computeSheetHeaderPositions,
    UPDATE_LOCALE: this.invalidateHeaderPositions,
    CREATE_NAMED_RANGE: this.invalidateHeaderPositions,
    UPDATE_NAMED_RANGE: this.invalidateHeaderPositions,
    DELETE_NAMED_RANGE: this.invalidateHeaderPositions,
    RENAME_PIVOT: this.invalidateHeaderPositions,
    REMOVE_PIVOT: this.invalidateHeaderPositions,
    INSERT_PIVOT: this.invalidateHeaderPositions,
    ADD_PIVOT: this.invalidateHeaderPositions,
    DUPLICATE_PIVOT: this.invalidateHeaderPositions,
    UPDATE_PIVOT: this.invalidateHeaderPositions,
    ADD_MERGE: this.invalidateHeaderPositions,
    REMOVE_MERGE: this.invalidateHeaderPositions,
    RENAME_SHEET: this.invalidateHeaderPositions,
    CREATE_SHEET: this.invalidateAndComputeSheetPositions,
    DUPLICATE_SHEET: this.duplicateSheetPositions,
    DELETE_SHEET: this.invalidateHeaderPositions,
    ADD_COLUMNS_ROWS: this.invalidateAndComputeSheetPositions,
    REMOVE_COLUMNS_ROWS: this.invalidateAndComputeSheetPositions,
    UNDO: this.invalidateHeaderPositions,
    REDO: this.invalidateHeaderPositions,
  };

  private duplicateSheetPositions(cmd: { sheetId: UID; sheetIdTo: UID }) {
    this.invalidateHeaderPositions();
    this.headerPositions[cmd.sheetIdTo] = deepCopy(this.headerPositions[cmd.sheetId]);
  }

  private invalidateAndComputeSheetPositions(cmd: { sheetId: UID }) {
    this.invalidateHeaderPositions();
    this.computeSheetHeaderPositions(cmd);
  }

  private computeSheetHeaderPositions(cmd: { sheetId: UID }) {
    if (this.getters.tryGetSheet(cmd.sheetId)) {
      this.headerPositions[cmd.sheetId] = this.computeHeaderPositionsOfSheet(cmd.sheetId);
    }
  }

  private invalidateHeaderPositions() {
    this.headerPositions = {};
    this.isDirty = true;
  }

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
    }
  }

  finalize() {
    for (const sheetId of this.getters.getSheetIds()) {
      // sheets can be created without this plugin being aware of it
      // in concurrent situations.
      if (this.isDirty || !this.headerPositions[sheetId]) {
        this.headerPositions[sheetId] = this.computeHeaderPositionsOfSheet(sheetId);
      }
    }
    this.isDirty = false;
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

  getHeaderDimensions(sheetId: UID, dimension: "COL" | "ROW", index: number) {
    return dimension === "COL"
      ? this.getters.getColDimensions(sheetId, index)
      : this.getters.getRowDimensions(sheetId, index);
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
    sheetId: UID
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
