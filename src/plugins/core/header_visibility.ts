import { deepCopy, getAddHeaderStartIndex, range } from "../../helpers";
import { Command, CommandResult, ExcelWorkbookData, WorkbookData } from "../../types";
import { ConsecutiveIndexes, Dimension, HeaderIndex, Position, UID } from "../../types/misc";
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

  private readonly hiddenHeaders: Record<UID, Record<Dimension, Array<boolean>>> = {};

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS": {
        if (!this.hiddenHeaders[cmd.sheetId]) {
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
      case "CREATE_SHEET":
        const hiddenHeaders = {
          COL: Array(this.getters.getNumberCols(cmd.sheetId)).fill(false),
          ROW: Array(this.getters.getNumberRows(cmd.sheetId)).fill(false),
        };
        this.history.update("hiddenHeaders", cmd.sheetId, hiddenHeaders);
        break;
      case "DUPLICATE_SHEET":
        this.history.update(
          "hiddenHeaders",
          cmd.sheetIdTo,
          deepCopy(this.hiddenHeaders[cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        this.history.update("hiddenHeaders", cmd.sheetId, undefined);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const hiddenHeaders = [...this.hiddenHeaders[cmd.sheetId][cmd.dimension]];
        for (let el of [...cmd.elements].sort((a, b) => b - a)) {
          hiddenHeaders.splice(el, 1);
        }
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hiddenHeaders);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const hiddenHeaders = [...this.hiddenHeaders[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        hiddenHeaders.splice(addIndex, 0, ...Array(cmd.quantity).fill(false));
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hiddenHeaders);
        break;
      }
      case "HIDE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, el, true);
        }
        break;
      case "UNHIDE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, el, false);
        }
        break;
    }
    return;
  }

  isRowHidden(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].ROW[index];
  }

  isColHidden(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].COL[index];
  }

  isHeaderHidden(sheetId: UID, dimension: Dimension, index: HeaderIndex) {
    return dimension === "COL"
      ? this.isColHidden(sheetId, index)
      : this.isRowHidden(sheetId, index);
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const consecutiveIndexes: ConsecutiveIndexes[] = [[]];
    const hiddenCols = this.hiddenHeaders[sheetId].COL;
    for (let col = 0; col < hiddenCols.length; col++) {
      const isColHidden = hiddenCols[col];
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
    const hiddenCols = this.hiddenHeaders[sheetId].ROW;
    for (let row = 0; row < hiddenCols.length; row++) {
      const isRowHidden = hiddenCols[row];
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

  getNextVisibleCellPosition(sheetId: UID, col: HeaderIndex, row: HeaderIndex): Position {
    return {
      col: this.findVisibleHeader(sheetId, "COL", range(col, this.getters.getNumberCols(sheetId)))!,
      row: this.findVisibleHeader(sheetId, "ROW", range(row, this.getters.getNumberRows(sheetId)))!,
    };
  }

  findVisibleHeader(
    sheetId: UID,
    dimension: Dimension,
    indexes: HeaderIndex[]
  ): HeaderIndex | undefined {
    return indexes.find(
      (index) =>
        this.getters.doesHeaderExist(sheetId, dimension, index) &&
        !this.isHeaderHidden(sheetId, dimension, index)
    );
  }

  findLastVisibleColRowIndex(
    sheetId: UID,
    dimension: Dimension,
    indexes: { first: number; last: number }
  ): HeaderIndex {
    let lastIndex: HeaderIndex;
    for (lastIndex = indexes.last; lastIndex >= indexes.first; lastIndex--) {
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
      this.hiddenHeaders[sheet.id] = { COL: [], ROW: [] };
      for (let row = 0; row < sheet.rowNumber; row++) {
        this.hiddenHeaders[sheet.id].ROW[row] = Boolean(sheet.rows[row]?.isHidden);
      }
      for (let col = 0; col < sheet.colNumber; col++) {
        this.hiddenHeaders[sheet.id].COL[col] = Boolean(sheet.cols[col]?.isHidden);
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
        if (exportDefaults || this.hiddenHeaders[sheet.id]["ROW"][row]) {
          if (sheet.rows[row] === undefined) {
            sheet.rows[row] = {};
          }
          sheet.rows[row].isHidden = this.hiddenHeaders[sheet.id]["ROW"][row];
        }
      }

      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        if (exportDefaults || this.hiddenHeaders[sheet.id]["COL"][col]) {
          if (sheet.cols[col] === undefined) {
            sheet.cols[col] = {};
          }
          sheet.cols[col].isHidden = this.hiddenHeaders[sheet.id]["COL"][col];
        }
      }
    }
  }
}
