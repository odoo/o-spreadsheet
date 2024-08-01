import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, getAddHeaderStartIndex, range, removeIndexesFromArray } from "../../helpers";
import type { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import type { Dimension, HeaderIndex, Pixel, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface HeaderSizeState {
  sizes: Record<UID, Record<Dimension, Array<Pixel | undefined>>>;
}
export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getUserRowSize", "getColSize"] as const;

  readonly sizes: Record<UID, Record<Dimension, Array<Pixel | undefined>>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET": {
        this.history.update("sizes", cmd.sheetId, { COL: [], ROW: [] });
        break;
      }
      case "DUPLICATE_SHEET":
        this.history.update("sizes", cmd.sheetIdTo, deepCopy(this.sizes[cmd.sheetId]));
        break;
      case "DELETE_SHEET":
        const sizes = { ...this.sizes };
        delete sizes[cmd.sheetId];
        this.history.update("sizes", sizes);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const arr = this.sizes[cmd.sheetId][cmd.dimension];
        const sizes = removeIndexesFromArray(arr, cmd.elements);
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        let sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseSize = sizes[cmd.base];
        sizes.splice(addIndex, 0, ...Array(cmd.quantity).fill(baseSize));
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        if (cmd.dimension === "ROW") {
          for (const el of cmd.elements) {
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, cmd.size || undefined);
          }
        } else {
          for (const el of cmd.elements) {
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, cmd.size || undefined);
          }
        }

        break;
    }
    return;
  }

  getColSize(sheetId: UID, index: HeaderIndex): Pixel {
    return Math.round(this.sizes[sheetId]?.["COL"][index] || DEFAULT_CELL_WIDTH);
  }

  getUserRowSize(sheetId: UID, index: HeaderIndex): Pixel | undefined {
    const rowSize = this.sizes[sheetId]?.["ROW"][index];
    return rowSize ? Math.round(rowSize) : undefined;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const sizes: Record<Dimension, Array<Pixel | undefined>> = {
        COL: Array(sheet.colNumber).fill(undefined),
        ROW: Array(sheet.rowNumber).fill(undefined),
      };
      for (let [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          sizes["ROW"][rowIndex] = row.size;
        }
      }

      for (let [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          sizes["COL"][colIndex] = col.size;
        }
      }

      this.sizes[sheet.id] = sizes;
    }
    return;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.exportData(data, true);
  }

  export(data: WorkbookData) {
    this.exportData(data);
  }

  /**
   * Export the header sizes
   *
   * @param exportDefaults : if true, export column/row sizes even if they have the default size
   */
  exportData(data: WorkbookData, exportDefaults = false) {
    for (let sheet of data.sheets) {
      // Export row sizes
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (const row of range(0, this.getters.getNumberRows(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["ROW"][row]) {
          sheet.rows[row] = {
            ...sheet.rows[row],
            size: this.getUserRowSize(sheet.id, row) ?? DEFAULT_CELL_HEIGHT,
          };
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col of range(0, this.getters.getNumberCols(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["COL"][col]) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
