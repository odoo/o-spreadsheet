import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import {
  deepCopy,
  getAddHeaderStartIndex,
  getDefaultCellHeight,
  largeMin,
  lazy,
  range,
} from "../../helpers";
import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, HeaderIndex, Lazy, Pixel, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface HeaderSize {
  manualSize: Pixel | undefined;
  computedSize: Lazy<Pixel>;
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
            computedSize: lazy(size),
          })),
          ROW: computedSizes.ROW.map((size) => ({
            manualSize: undefined,
            computedSize: lazy(size),
          })),
        };
        this.history.update("sizes", cmd.sheetId, sizes);
        break;
      }
      case "DUPLICATE_SHEET":
        // make sure the values are computed in case the original sheet is deleted
        for (const row of this.sizes[cmd.sheetId].ROW) {
          row.computedSize();
        }
        for (const col of this.sizes[cmd.sheetId].COL) {
          col.computedSize();
        }
        this.history.update("sizes", cmd.sheetIdTo, deepCopy(this.sizes[cmd.sheetId]));
        break;
      case "DELETE_SHEET":
        const sizes = { ...this.sizes };
        delete sizes[cmd.sheetId];
        this.history.update("sizes", sizes);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        let sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        for (let headerIndex of [...cmd.elements].sort((a, b) => b - a)) {
          sizes.splice(headerIndex, 1);
        }
        const min = largeMin(cmd.elements);
        sizes = sizes.map((size, row) => {
          if (cmd.dimension === "ROW" && row >= min) {
            // invalidate sizes
            return {
              manualSize: size.manualSize,
              computedSize: lazy(() => this.getRowTallestCellSize(cmd.sheetId, row)),
            };
          }
          return size;
        });
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        let sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseSize = sizes[cmd.base];
        const sizesToInsert = range(0, cmd.quantity).map(() => ({
          manualSize: baseSize.manualSize,
          computedSize: lazy(baseSize.computedSize()),
        }));
        sizes.splice(addIndex, 0, ...sizesToInsert);
        sizes = sizes.map((size, row) => {
          if (cmd.dimension === "ROW" && row > cmd.base + cmd.quantity) {
            // invalidate sizes
            return {
              manualSize: size.manualSize,
              computedSize: lazy(() => this.getRowTallestCellSize(cmd.sheetId, row)),
            };
          }
          return size;
        });
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          if (cmd.dimension === "ROW") {
            const height = this.getRowTallestCellSize(cmd.sheetId, el);
            const size = height;
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, {
              manualSize: cmd.size || undefined,
              computedSize: lazy(size),
            });
          } else {
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, {
              manualSize: cmd.size || undefined,
              computedSize: lazy(cmd.size || DEFAULT_CELL_WIDTH),
            });
          }
        }
        break;
      case "UPDATE_CELL":
        const row = this.sizes[cmd.sheetId]?.["ROW"]?.[cmd.row];
        if (row && !row.manualSize) {
          const { sheetId, row } = cmd;
          this.history.update(
            "sizes",
            sheetId,
            "ROW",
            row,
            "computedSize",
            lazy(() => this.getRowTallestCellSize(sheetId, row))
          );
        }
        break;
      case "ADD_MERGE":
      case "REMOVE_MERGE":
        for (let target of cmd.target) {
          for (let row of range(target.top, target.bottom + 1)) {
            const rowHeight = this.getRowTallestCellSize(cmd.sheetId, row);
            if (rowHeight !== this.getRowSize(cmd.sheetId, row)) {
              this.history.update(
                "sizes",
                cmd.sheetId,
                "ROW",
                row,
                "computedSize",
                lazy(rowHeight)
              );
            }
          }
        }
        break;
    }
    return;
  }

  getColSize(sheetId: UID, index: HeaderIndex): Pixel {
    return this.getHeaderSize(sheetId, "COL", index);
  }

  getRowSize(sheetId: UID, index: HeaderIndex): Pixel {
    return this.getHeaderSize(sheetId, "ROW", index);
  }

  private getHeaderSize(sheetId: UID, dimension: Dimension, index: HeaderIndex): Pixel {
    return Math.round(
      this.sizes[sheetId]?.[dimension][index]?.manualSize ||
        this.sizes[sheetId]?.[dimension][index]?.computedSize() ||
        this.getDefaultHeaderSize(dimension)
    );
  }

  private computeSheetSizes(sheetId: UID): Record<Dimension, Array<Pixel>> {
    const sizes: Record<Dimension, Array<Pixel>> = { COL: [], ROW: [] };
    for (let col of range(0, this.getters.getNumberCols(sheetId))) {
      sizes.COL.push(this.getHeaderSize(sheetId, "COL", col));
    }
    for (let row of range(0, this.getters.getNumberRows(sheetId))) {
      let rowSize = this.sizes[sheetId]?.["ROW"]?.[row].manualSize;
      if (!rowSize) {
        const height = this.getRowTallestCellSize(sheetId, row);
        rowSize = height;
      }
      sizes.ROW.push(rowSize);
    }
    return sizes;
  }

  private getDefaultHeaderSize(dimension: Dimension): Pixel {
    return dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
  }

  /**
   * Return the height the cell should have in the sheet, which is either DEFAULT_CELL_HEIGHT if the cell is in a multi-row
   * merge, or the height of the cell computed based on its font size.
   */
  private getCellHeight(sheetId: UID, col: HeaderIndex, row: HeaderIndex): Pixel {
    const merge = this.getters.getMerge(sheetId, col, row);
    if (merge && merge.bottom !== merge.top) {
      return DEFAULT_CELL_HEIGHT;
    }
    const cell = this.getters.getCell(sheetId, col, row);
    // TO DO: take multiline cells into account to compute the cell height
    return getDefaultCellHeight(cell?.style);
  }

  /**
   * Get the tallest cell of a row and its size.
   *
   * The tallest cell of the row correspond to the cell with the biggest font size,
   * and that is not part of a multi-line merge.
   */
  private getRowTallestCellSize(sheetId: UID, row: HeaderIndex): Pixel {
    const cellIds = this.getters.getRowCells(sheetId, row);
    let maxHeight = 0;
    for (let i = 0; i < cellIds.length; i++) {
      const cell = this.getters.getCellById(cellIds[i]);
      if (!cell) continue;
      const { col, row } = this.getters.getCellPosition(cell.id);
      const cellHeight = this.getCellHeight(sheetId, col, row);
      if (cellHeight > maxHeight && cellHeight > DEFAULT_CELL_HEIGHT) {
        maxHeight = cellHeight;
      }
    }

    if (maxHeight <= DEFAULT_CELL_HEIGHT) {
      return DEFAULT_CELL_HEIGHT;
    }
    return maxHeight;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const manualSizes: Record<Dimension, Array<HeaderIndex>> = { COL: [], ROW: [] };
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
        COL: computedSizes.COL.map((size, i) => ({
          manualSize: manualSizes.COL[i],
          computedSize: lazy(size),
        })),
        ROW: computedSizes.ROW.map((size, i) => ({
          manualSize: manualSizes.ROW[i],
          computedSize: lazy(size),
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
