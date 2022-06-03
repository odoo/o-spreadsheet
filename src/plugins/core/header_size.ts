import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, getAddHeaderStartIndex } from "../../helpers";
import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface HeaderSize {
  manuallySetSize: number | undefined;
  computedSize: number;
}

interface HeaderSizeState {
  headerSizes: Record<UID, Record<Dimension, Array<HeaderSize>>>;
}

export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getRowSize", "getColSize"] as const;

  readonly headerSizes: Record<UID, Record<Dimension, Array<HeaderSize>>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET": {
        const computedSizes = this.computeSheetSizes(cmd.sheetId);
        const headerSizes = {
          COL: computedSizes.COL.map((size) => ({
            manuallySetSize: undefined,
            computedSize: size,
          })),
          ROW: computedSizes.ROW.map((size) => ({
            manuallySetSize: undefined,
            computedSize: size,
          })),
        };
        this.history.update("headerSizes", cmd.sheetId, headerSizes);
        break;
      }
      case "DUPLICATE_SHEET":
        this.history.update("headerSizes", cmd.sheetIdTo, deepCopy(this.headerSizes[cmd.sheetId]));
        break;
      case "DELETE_SHEET":
        const headerSizes = { ...this.headerSizes };
        delete headerSizes[cmd.sheetId];
        this.history.update("headerSizes", headerSizes);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        for (let el of [...cmd.elements].sort().reverse()) {
          headerSizes.splice(el, 1);
        }
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseSize = headerSizes[cmd.base];
        for (let i = 0; i < cmd.quantity; i++) {
          headerSizes.splice(addIndex, 0, baseSize);
        }
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("headerSizes", cmd.sheetId, cmd.dimension, el, {
            computedSize: cmd.size,
            manuallySetSize: cmd.size,
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
      this.headerSizes[sheetId]?.[dimension][index]?.manuallySetSize ||
      this.headerSizes[sheetId]?.[dimension][index]?.computedSize ||
      this.getDefaultHeaderSize(dimension)
    );
  }

  private computeSheetSizes(sheetId: UID): Record<Dimension, Array<number>> {
    const sizes: Record<Dimension, Array<number>> = { COL: [], ROW: [] };
    for (let i = 0; i < this.getters.getNumberCols(sheetId); i++) {
      sizes.COL.push(this.getHeaderSize(sheetId, "COL", i));
    }
    for (let i = 0; i < this.getters.getNumberRows(sheetId); i++) {
      sizes.ROW.push(this.getHeaderSize(sheetId, "ROW", i));
    }
    return sizes;
  }

  private getDefaultHeaderSize(dimension: Dimension): number {
    return dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const manuallySetSizes: Record<Dimension, Array<number>> = { COL: [], ROW: [] };
      for (let [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          manuallySetSizes["ROW"][rowIndex] = row.size;
        }
      }

      for (let [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          manuallySetSizes["COL"][colIndex] = col.size;
        }
      }
      const computedSizes = this.computeSheetSizes(sheet.id);
      this.headerSizes[sheet.id] = {
        COL: manuallySetSizes.COL.map((size, i) => ({
          manuallySetSize: size,
          computedSize: computedSizes.COL[i],
        })),
        ROW: manuallySetSizes.ROW.map((size, i) => ({
          manuallySetSize: size,
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
      for (let row = 0; row < this.getters.getNumberRows(sheet.id); row++) {
        if (exportDefaults || this.headerSizes[sheet.id]["ROW"][row]?.manuallySetSize) {
          sheet.rows[row] = { ...sheet.rows[row], size: this.getRowSize(sheet.id, row) };
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        if (exportDefaults || this.headerSizes[sheet.id]["COL"][col]?.manuallySetSize) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
