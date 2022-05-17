import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, getAddHeaderStartIndex, getDefaultCellHeight, range } from "../../helpers";
import { Cell, Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, HeaderIndex, Pixel, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

type CellId = UID;

interface HeaderSize {
  manualSize: Pixel | undefined;
  computedSize: Pixel;
}

interface HeaderSizeState {
  sizes: Record<UID, Record<Dimension, Array<HeaderSize>>>;
  tallestCellInRows: Record<UID, Array<CellId | undefined>>;
}

export class HeaderSizePlugin extends CorePlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getRowSize", "getColSize"] as const;

  readonly sizes: Record<UID, Record<Dimension, Array<HeaderSize>>> = {};
  readonly tallestCellInRows: Record<UID, Array<CellId | undefined>> = {};

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
        this.history.update("tallestCellInRows", cmd.sheetId, []);
        break;
      }
      case "DUPLICATE_SHEET":
        this.history.update("sizes", cmd.sheetIdTo, deepCopy(this.sizes[cmd.sheetId]));
        this.history.update(
          "tallestCellInRows",
          cmd.sheetIdTo,
          deepCopy(this.tallestCellInRows[cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        const sizes = { ...this.sizes };
        delete sizes[cmd.sheetId];
        this.history.update("sizes", sizes);
        const tallestCellInRows = { ...this.tallestCellInRows };
        delete tallestCellInRows[cmd.sheetId];
        this.history.update("tallestCellInRows", tallestCellInRows);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        const tallestCellInRows = [...this.tallestCellInRows[cmd.sheetId]];
        for (let headerIndex of [...cmd.elements].sort().reverse()) {
          sizes.splice(headerIndex, 1);
          if (cmd.dimension === "ROW") {
            tallestCellInRows.splice(headerIndex, 1);
          }
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        if (cmd.dimension === "ROW") {
          this.history.update("tallestCellInRows", cmd.sheetId, tallestCellInRows);
        }
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const sizes = [...this.sizes[cmd.sheetId][cmd.dimension]];
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const tallestCellInRows = [...this.tallestCellInRows[cmd.sheetId]];
        const baseSize = sizes[cmd.base];
        for (let i = 0; i < cmd.quantity; i++) {
          sizes.splice(addIndex, 0, baseSize);
          if (cmd.dimension === "ROW") {
            tallestCellInRows.splice(i, 1, undefined);
          }
        }
        this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
        if (cmd.dimension === "ROW") {
          this.history.update("tallestCellInRows", cmd.sheetId, tallestCellInRows);
        }
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          if (cmd.dimension === "ROW") {
            const { cell: tallestCell, height } = this.getRowTallestCell(cmd.sheetId, el);
            const size = height;
            this.history.update("tallestCellInRows", cmd.sheetId, el, tallestCell?.id);
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, {
              manualSize: cmd.size || undefined,
              computedSize: size,
            });
          } else {
            this.history.update("sizes", cmd.sheetId, cmd.dimension, el, {
              manualSize: cmd.size || undefined,
              computedSize: cmd.size || DEFAULT_CELL_WIDTH,
            });
          }
        }
        break;
      case "UPDATE_CELL":
        if (!this.sizes[cmd.sheetId]?.["ROW"]?.[cmd.row]?.manualSize) {
          this.adjustRowSizeWithCellFont(cmd.sheetId, cmd.col, cmd.row);
        }
        break;
      case "ADD_MERGE":
      case "REMOVE_MERGE":
        for (let target of cmd.target) {
          for (let row of range(target.top, target.bottom + 1)) {
            const { height: rowHeight, cell: tallestCell } = this.getRowTallestCell(
              cmd.sheetId,
              row
            );
            this.history.update("tallestCellInRows", cmd.sheetId, row, tallestCell?.id);
            if (rowHeight !== this.getRowSize(cmd.sheetId, row)) {
              this.history.update("sizes", cmd.sheetId, "ROW", row, "computedSize", rowHeight);
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

  /**
   * Change the size of a row to match the cell with the biggest font size.
   */
  private adjustRowSizeWithCellFont(sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    const currentCell = this.getters.getCell(sheetId, col, row);
    const currentRowSize = this.getRowSize(sheetId, row);
    const newCellHeight = this.getCellHeight(sheetId, col, row);

    const tallestCell = this.tallestCellInRows[sheetId]?.[row];
    let shouldRowBeUpdated =
      !tallestCell ||
      !this.getters.getCellById(tallestCell) || // tallest cell was deleted
      (currentCell?.id === tallestCell && newCellHeight < currentRowSize); // tallest cell is smaller than before;

    let newRowHeight: Pixel | undefined = undefined;
    if (shouldRowBeUpdated) {
      const { height: maxHeight, cell: tallestCell } = this.getRowTallestCell(sheetId, row);
      newRowHeight = maxHeight;
      this.history.update("tallestCellInRows", sheetId, row, tallestCell?.id);
    } else if (newCellHeight > currentRowSize) {
      newRowHeight = newCellHeight;
      const tallestCell = this.getters.getCell(sheetId, col, row);
      this.history.update("tallestCellInRows", sheetId, row, tallestCell?.id);
    }

    if (newRowHeight !== undefined && newRowHeight !== currentRowSize) {
      this.history.update("sizes", sheetId, "ROW", row, "computedSize", newRowHeight);
    }
  }

  private getHeaderSize(sheetId: UID, dimension: Dimension, index: HeaderIndex): Pixel {
    return (
      this.sizes[sheetId]?.[dimension][index]?.manualSize ||
      this.sizes[sheetId]?.[dimension][index]?.computedSize ||
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
        const { cell: tallestCell, height } = this.getRowTallestCell(sheetId, row);
        rowSize = height;
        this.history.update("tallestCellInRows", sheetId, row, tallestCell?.id);
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
    return getDefaultCellHeight(cell);
  }

  /**
   * Get the tallest cell of a row and its size.
   *
   * The tallest cell of the row correspond to the cell with the biggest font size,
   * and that is not part of a multi-line merge.
   */
  private getRowTallestCell(sheetId: UID, row: HeaderIndex): { cell?: Cell; height: Pixel } {
    const cellIds = this.getters.getRowCells(sheetId, row);
    let maxHeight = 0;
    let tallestCell: Cell | undefined = undefined;
    for (let i = 0; i < cellIds.length; i++) {
      const cell = this.getters.getCellById(cellIds[i]);
      if (!cell) continue;
      const { col, row } = this.getters.getCellPosition(cell.id);
      const cellHeight = this.getCellHeight(sheetId, col, row);
      if (cellHeight > maxHeight && cellHeight > DEFAULT_CELL_HEIGHT) {
        maxHeight = cellHeight;
        tallestCell = cell;
      }
    }

    if (maxHeight <= DEFAULT_CELL_HEIGHT) {
      return { height: DEFAULT_CELL_HEIGHT };
    }
    return { cell: tallestCell, height: maxHeight };
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
          computedSize: size,
        })),
        ROW: computedSizes.ROW.map((size, i) => ({
          manualSize: manualSizes.ROW[i],
          computedSize: size,
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
