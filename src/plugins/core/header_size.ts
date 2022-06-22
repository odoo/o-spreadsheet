import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { getAddHeaderStartIndex, range } from "../../helpers";
import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface HeaderSize {
  manuallySetSize: number | undefined;
  computedSize: number;
}

interface HeaderSizeState {}

export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getRowSize", "getColSize"] as const;

  private headerMap = this.newHeaderMap<HeaderSize>();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DUPLICATE_SHEET":
        this.headerMap.duplicateSheet(cmd.sheetId, cmd.sheetIdTo);
        break;
      case "DELETE_SHEET":
        this.headerMap.deleteSheet(cmd.sheetId);
        break;
      case "ADD_COLUMNS_ROWS": {
        const baseSize =
          cmd.position === "after"
            ? this.headerMap.get(cmd.sheetId, cmd.dimension, cmd.base)?.manuallySetSize
            : this.headerMap.get(cmd.sheetId, cmd.dimension, cmd.base + cmd.quantity)
                ?.manuallySetSize;
        if (!baseSize) {
          return;
        }
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        for (let index = addIndex; index < addIndex + cmd.quantity; index++) {
          this.headerMap.set(cmd.sheetId, cmd.dimension, index, {
            computedSize: baseSize,
            manuallySetSize: baseSize,
          });
        }
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.headerMap.set(cmd.sheetId, cmd.dimension, el, {
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
    const sizes = this.headerMap.get(sheetId, dimension, index);
    return sizes?.manuallySetSize || sizes?.computedSize || this.getDefaultHeaderSize(dimension);
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
      manuallySetSizes.COL.map((size, i) =>
        this.headerMap.set(sheet.id, "COL", i, {
          manuallySetSize: size,
          computedSize: computedSizes.COL[i],
        })
      );
      manuallySetSizes.ROW.map((size, i) =>
        this.headerMap.set(sheet.id, "ROW", i, {
          manuallySetSize: size,
          computedSize: computedSizes.ROW[i],
        })
      );
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
        if (exportDefaults || this.headerMap.get(sheet.id, "ROW", row)?.manuallySetSize) {
          sheet.rows[row] = { ...sheet.rows[row], size: this.getRowSize(sheet.id, row) };
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col of range(0, this.getters.getNumberCols(sheet.id))) {
        if (exportDefaults || this.headerMap.get(sheet.id, "COL", col)?.manuallySetSize) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
