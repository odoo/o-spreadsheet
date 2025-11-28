import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, groupConsecutive, mapShift, range } from "../../helpers/misc";
import { Command } from "../../types/commands";
import { Dimension, HeaderIndex, Pixel, UID } from "../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface HeaderSizeState {
  sizes: Record<UID, Record<Dimension, Map<HeaderIndex, Pixel>>>;
}
export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = [
    "getUserRowSize",
    "getColSize",
    "getCustomColSizes",
    "getUserCustomRowSizes",
  ] as const;

  readonly sizes: Record<UID, Record<Dimension, Map<HeaderIndex, Pixel>>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET": {
        this.history.update("sizes", cmd.sheetId, {
          COL: new Map<HeaderIndex, Pixel>(),
          ROW: new Map<HeaderIndex, Pixel>(),
        });
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
        const elements = cmd.elements.sort((a, b) => b - a);
        const sizes = deepCopy(this.sizes[cmd.sheetId][cmd.dimension]);
        for (const els of groupConsecutive(elements)) {
          for (let i = 0; i < els.length; i++) {
            sizes.delete(els[i]);
          }
          mapShift(sizes, els[0], -els.length);
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const sizes = deepCopy(this.sizes[cmd.sheetId][cmd.dimension]);
        const size = sizes.get(cmd.base);
        const newColRowStart = cmd.position === "before" ? cmd.base : cmd.base + 1;
        mapShift(sizes, newColRowStart, cmd.quantity);
        if (size) {
          for (let i = 0; i < cmd.quantity; i++) {
            sizes.set(newColRowStart + i, size);
          }
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS": {
        const sizes = deepCopy(this.sizes[cmd.sheetId][cmd.dimension]);
        if (cmd.size) {
          const size = Math.round(cmd.size);
          for (const el of cmd.elements) {
            sizes.set(el, size);
          }
        } else {
          for (const el of cmd.elements) {
            sizes.delete(el);
          }
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
    }
    return;
  }

  getColSize(sheetId: UID, index: HeaderIndex): Pixel {
    return this.sizes[sheetId]?.["COL"].get(index) || DEFAULT_CELL_WIDTH;
  }

  getCustomColSizes(sheetId: UID): Map<HeaderIndex, Pixel> {
    return this.sizes[sheetId]?.COL;
  }

  getUserCustomRowSizes(sheetId: UID): Map<HeaderIndex, Pixel> {
    return this.sizes[sheetId]?.ROW;
  }

  getUserRowSize(sheetId: UID, index: HeaderIndex): Pixel | undefined {
    const rowSize = this.sizes[sheetId]?.["ROW"].get(index);
    return rowSize ? rowSize : undefined;
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const sizes: Record<Dimension, Map<HeaderIndex, Pixel>> = {
        COL: new Map<HeaderIndex, Pixel>(),
        ROW: new Map<HeaderIndex, Pixel>(),
      };
      for (const [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          sizes["ROW"].set(parseInt(rowIndex), row.size);
        }
      }

      for (const [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          sizes["COL"].set(parseInt(colIndex), col.size);
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
    for (const sheet of data.sheets) {
      // Export row sizes
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (const row of range(0, this.getters.getNumberRows(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["ROW"].get(row)) {
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
      for (const col of range(0, this.getters.getNumberCols(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["COL"].get(col)) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
