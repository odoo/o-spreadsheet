import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, getAddHeaderStartIndex, range } from "../../helpers";
import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface HeaderSize {
  manualSize: number | undefined;
  computedSize: number;
}

interface HeaderSizeState {
  sizes: Record<UID, Record<Dimension, Array<HeaderSize>>>;
}

export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getRowSize", "getColSize"] as const;

  readonly sizes: Record<UID, Record<Dimension, Array<HeaderSize>>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET": {
        const computedSizes = this.computeSheetSizes(cmd.sheetId);
        const sizes = {
          COL: computedSizes.COL.map((size) => ({
            manualSize: undefined,
            computedSize: size,
          })),
          ROW: computedSizes.ROW.map((size) => ({
            manualSize: undefined,
            computedSize: size,
          })),
        };
        this.history.update("sizes", cmd.sheetId, sizes);
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
        const sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        for (let headerIndex of [...cmd.elements].sort().reverse()) {
          sizes.splice(headerIndex, 1);
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseSize = sizes[cmd.base];
        for (let i = 0; i < cmd.quantity; i++) {
          sizes.splice(addIndex, 0, baseSize);
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("sizes", cmd.sheetId, cmd.dimension, el, {
            computedSize: cmd.size,
            manualSize: cmd.size,
          });
        }
        break;
    }
    return;
  }

  getColSize(sheetId: UID, index: number): number {
    return this.getHeaderSize(sheetId, "COL", index);
  }

  getRowSize(sheetId: UID, index: number): number {
    return this.getHeaderSize(sheetId, "ROW", index);
  }

  private getHeaderSize(sheetId: UID, dimension: Dimension, index: number): number {
    return (
      this.sizes[sheetId]?.[dimension][index]?.manualSize ||
      this.sizes[sheetId]?.[dimension][index]?.computedSize ||
      this.getDefaultHeaderSize(dimension)
    );
  }

  private computeSheetSizes(sheetId: UID): Record<Dimension, Array<number>> {
    const sizes: Record<Dimension, Array<number>> = { COL: [], ROW: [] };
    for (const col of range(0, this.getters.getNumberCols(sheetId))) {
      sizes.COL.push(this.getHeaderSize(sheetId, "COL", col));
    }
    for (const row of range(0, this.getters.getNumberRows(sheetId))) {
      sizes.ROW.push(this.getHeaderSize(sheetId, "ROW", row));
    }
    return sizes;
  }

  private getDefaultHeaderSize(dimension: Dimension): number {
    return dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const manualSizes: Record<Dimension, Array<number>> = { COL: [], ROW: [] };
      for (let [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          manualSizes["ROW"][rowIndex] = row.size;
        }
      }

      for (let [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          manualSizes["COL"][colIndex] = col.size;
        }
      }
      const computedSizes = this.computeSheetSizes(sheet.id);
      this.sizes[sheet.id] = {
        COL: manualSizes.COL.map((size, i) => ({
          manualSize: size,
          computedSize: computedSizes.COL[i],
        })),
        ROW: manualSizes.ROW.map((size, i) => ({
          manualSize: size,
          computedSize: computedSizes.ROW[i],
        })),
      };
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
      for (let row of range(0, this.getters.getNumberRows(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["ROW"][row]?.manualSize) {
          sheet.rows[row] = { ...sheet.rows[row], size: this.getRowSize(sheet.id, row) };
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col of range(0, this.getters.getNumberCols(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["COL"][col]?.manualSize) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
