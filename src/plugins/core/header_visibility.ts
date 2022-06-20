import { range } from "../../helpers";
import { Command, CommandResult, ExcelWorkbookData, WorkbookData } from "../../types";
import { ConsecutiveIndexes, Dimension, Position, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export class HeaderVisibilityPlugin extends CorePlugin {
  static getters = [
    "findFirstVisibleColRowIndex",
    "findLastVisibleColRowIndex",
    "findVisibleHeader",
    "getHiddenColsGroups",
    "getHiddenRowsGroups",
    "getNextVisibleCellPosition",
    "isRowHidden",
    "isColHidden",
    "isHeaderHidden",
  ] as const;

  private headerMap = this.newHeaderMap<boolean>();

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS": {
        if (!this.getters.tryGetSheet(cmd.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        const hiddenGroup =
          cmd.dimension === "COL"
            ? this.getHiddenColsGroups(cmd.sheetId)
            : this.getHiddenRowsGroups(cmd.sheetId);
        const elements =
          cmd.dimension === "COL"
            ? this.getters.getNumberCols(cmd.sheetId)
            : this.getters.getNumberRows(cmd.sheetId);
        return (hiddenGroup || []).flat().concat(cmd.elements).length < elements
          ? CommandResult.Success
          : CommandResult.TooManyHiddenElements;
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DUPLICATE_SHEET":
        this.headerMap.duplicateSheet(cmd.sheetId, cmd.sheetIdTo);
        break;
      case "DELETE_SHEET":
        this.headerMap.deleteSheet(cmd.sheetId);
        break;
      case "HIDE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.headerMap.set(cmd.sheetId, cmd.dimension, el, true);
        }
        break;
      case "UNHIDE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.headerMap.set(cmd.sheetId, cmd.dimension, el, false);
        }
        break;
    }
    return;
  }

  isRowHidden(sheetId: UID, index: number): boolean {
    return this.headerMap.get(sheetId, "ROW", index) || false;
  }

  isColHidden(sheetId: UID, index: number): boolean {
    return this.headerMap.get(sheetId, "COL", index) || false;
  }

  isHeaderHidden(sheetId: UID, dimension: Dimension, index: number) {
    return dimension === "COL"
      ? this.isColHidden(sheetId, index)
      : this.isRowHidden(sheetId, index);
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const consecutiveIndexes: ConsecutiveIndexes[] = [[]];
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const isColHidden = this.headerMap.get(sheetId, "COL", col);
      if (isColHidden) {
        consecutiveIndexes[consecutiveIndexes.length - 1].push(col);
      } else {
        if (consecutiveIndexes[consecutiveIndexes.length - 1].length !== 0) {
          consecutiveIndexes.push([]);
        }
      }
    }

    if (consecutiveIndexes[consecutiveIndexes.length - 1].length === 0) {
      consecutiveIndexes.pop();
    }
    return consecutiveIndexes;
  }

  getHiddenRowsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const consecutiveIndexes: ConsecutiveIndexes[] = [[]];
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const isRowHidden = this.headerMap.get(sheetId, "ROW", row);
      if (isRowHidden) {
        consecutiveIndexes[consecutiveIndexes.length - 1].push(row);
      } else {
        if (consecutiveIndexes[consecutiveIndexes.length - 1].length !== 0) {
          consecutiveIndexes.push([]);
        }
      }
    }

    if (consecutiveIndexes[consecutiveIndexes.length - 1].length === 0) {
      consecutiveIndexes.pop();
    }
    return consecutiveIndexes;
  }

  getNextVisibleCellPosition(sheetId: UID, col: number, row: number): Position {
    return {
      col: this.findVisibleHeader(sheetId, "COL", range(col, this.getters.getNumberCols(sheetId)))!,
      row: this.findVisibleHeader(sheetId, "ROW", range(row, this.getters.getNumberRows(sheetId)))!,
    };
  }

  findVisibleHeader(sheetId: UID, dimension: Dimension, indexes: number[]): number | undefined {
    return indexes.find(
      (index) =>
        this.getters.doesHeaderExist(sheetId, dimension, index) &&
        !this.isHeaderHidden(sheetId, dimension, index)
    );
  }

  findLastVisibleColRowIndex(sheetId: UID, dimension: Dimension): number {
    let lastIndex: number;
    for (
      lastIndex = this.getters.getNumberHeaders(sheetId, dimension) - 1;
      lastIndex >= 0;
      lastIndex--
    ) {
      if (!this.isHeaderHidden(sheetId, dimension, lastIndex)) {
        return lastIndex;
      }
    }
    return lastIndex;
  }

  findFirstVisibleColRowIndex(sheetId: UID, dimension: Dimension) {
    const numberOfHeaders = this.getters.getNumberHeaders(sheetId, dimension);

    for (let i = 0; i < numberOfHeaders - 1; i++) {
      if (dimension === "COL" && !this.isColHidden(sheetId, i)) {
        return i;
      }
      if (dimension === "ROW" && !this.isRowHidden(sheetId, i)) {
        return i;
      }
    }
    return undefined;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      for (let row = 0; row < sheet.rowNumber; row++) {
        if (sheet.rows[row]?.isHidden) {
          this.headerMap.set(sheet.id, "ROW", row, Boolean(sheet.rows[row]?.isHidden));
        }
      }
      for (let col = 0; col < sheet.colNumber; col++) {
        if (sheet.cols[col]?.isHidden) {
          this.headerMap.set(sheet.id, "COL", col, Boolean(sheet.cols[col]?.isHidden));
        }
      }
    }
    return;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.exportData(data, true);
  }

  export(data: WorkbookData) {
    this.exportData(data);
  }

  exportData(data: WorkbookData, exportDefaults = false) {
    for (let sheet of data.sheets) {
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (let row = 0; row < this.getters.getNumberRows(sheet.id); row++) {
        if (exportDefaults || this.headerMap.get(sheet.id, "ROW", row)) {
          if (sheet.rows[row] === undefined) {
            sheet.rows[row] = {};
          }
          sheet.rows[row].isHidden = this.headerMap.get(sheet.id, "ROW", row);
        }
      }

      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        if (exportDefaults || this.headerMap.get(sheet.id, "COL", col)) {
          if (sheet.cols[col] === undefined) {
            sheet.cols[col] = {};
          }
          sheet.cols[col].isHidden = this.headerMap.get(sheet.id, "COL", col);
        }
      }
    }
  }
}
