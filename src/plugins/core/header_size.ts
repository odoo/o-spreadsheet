import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, getDefaultCellHeight } from "../../helpers";
import { Cell, Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, SheetId, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export class HeaderSizePlugin extends CorePlugin {
  static getters = ["getRowSize", "getColSize"] as const;

  private readonly headerSizes: Record<SheetId, Record<Dimension, Array<number | undefined>>> = {};
  private readonly userHeaderSizes: Record<SheetId, Record<Dimension, Array<number | undefined>>> =
    {};
  private readonly tallestCellInRows: Record<SheetId, Array<UID | undefined>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("userHeaderSizes", cmd.sheetId, { COL: [], ROW: [] });
        this.initSheet(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.history.update(
          "userHeaderSizes",
          cmd.sheetIdTo,
          deepCopy(this.userHeaderSizes[cmd.sheetId])
        );
        this.history.update("headerSizes", cmd.sheetIdTo, deepCopy(this.headerSizes[cmd.sheetId]));
        this.history.update(
          "tallestCellInRows",
          cmd.sheetIdTo,
          deepCopy(this.tallestCellInRows[cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        this.history.update("headerSizes", cmd.sheetId, undefined);
        this.history.update("userHeaderSizes", cmd.sheetId, undefined);
        this.history.update("tallestCellInRows", cmd.sheetId, undefined);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const userHeaderSizes = [...this.userHeaderSizes[cmd.sheetId][cmd.dimension]];
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        const tallestCellInRows = [...this.tallestCellInRows[cmd.sheetId]];
        for (let el of [...cmd.elements].sort().reverse()) {
          userHeaderSizes.splice(el, 1);
          headerSizes.splice(el, 1);
          if (cmd.dimension === "ROW") {
            tallestCellInRows.splice(el, 1);
          }
        }
        this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, userHeaderSizes);
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        if (cmd.dimension === "ROW") {
          this.history.update("tallestCellInRows", cmd.sheetId, tallestCellInRows);
        }

        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const userHeaderSizes = [...this.userHeaderSizes[cmd.sheetId][cmd.dimension]];
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        const tallestCellInRows = [...this.tallestCellInRows[cmd.sheetId]];
        const addIndex = this.getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseUserSize = userHeaderSizes[cmd.base];
        const baseSize = headerSizes[cmd.base];
        for (let i = 0; i < cmd.quantity; i++) {
          userHeaderSizes.splice(addIndex, 0, baseUserSize);
          headerSizes.splice(addIndex, 0, baseSize);
          if (cmd.dimension === "ROW") {
            tallestCellInRows.splice(i, 1, undefined);
          }
        }
        this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, userHeaderSizes);
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        if (cmd.dimension === "ROW") {
          this.history.update("tallestCellInRows", cmd.sheetId, tallestCellInRows);
        }
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, el, cmd.size);
          if (cmd.dimension === "ROW") {
            const { cell: tallestCell, height } = this.getRowMaxHeight(cmd.sheetId, el);
            const size = height;
            this.history.update("tallestCellInRows", cmd.sheetId, el, tallestCell?.id);
            this.history.update("headerSizes", cmd.sheetId, cmd.dimension, el, size);
          } else {
            this.history.update("headerSizes", cmd.sheetId, cmd.dimension, el, cmd.size);
          }
        }
        break;
      case "UPDATE_CELL":
        if (
          this.headerSizes[cmd.sheetId]?.["ROW"]?.[cmd.row] &&
          !this.userHeaderSizes[cmd.sheetId]?.["ROW"]?.[cmd.row]
        ) {
          this.adjustRowSizeWithCellFont(cmd.sheetId, cmd.col, cmd.row);
        }
        break;
      case "ADD_MERGE":
      case "REMOVE_MERGE":
        for (let target of cmd.target) {
          for (let row = target.top; row <= target.bottom; row++) {
            const { height: rowHeight, cell: tallestCell } = this.getRowMaxHeight(cmd.sheetId, row);
            this.history.update("tallestCellInRows", cmd.sheetId, row, tallestCell?.id);
            if (rowHeight !== this.getRowSize(cmd.sheetId, row)) {
              let newRows = deepCopy(this.headerSizes[cmd.sheetId]["ROW"]);
              newRows[row] = rowHeight;
              this.history.update("headerSizes", cmd.sheetId, "ROW", newRows);
            }
          }
        }
        break;
    }
    return;
  }

  getColSize(sheetId: SheetId, index: number): number {
    return this.getHeaderSize(sheetId, "COL", index);
  }

  getRowSize(sheetId: SheetId, index: number): number {
    return this.getHeaderSize(sheetId, "ROW", index);
  }

  /**
   * Change the size of a row to match the cell with the biggest font size.
   */
  private adjustRowSizeWithCellFont(sheetId: UID, col: number, row: number) {
    const currentCell = this.getters.getCell(sheetId, col, row);
    const currentRowSize = this.getRowSize(sheetId, row);
    const newCellHeight = this.getCellHeight(sheetId, col, row);

    const tallestCell = this.tallestCellInRows[sheetId]?.[row];
    let shouldRowBeUpdated =
      !tallestCell ||
      !this.getters.tryGetCellById(tallestCell) || // tallest cell was deleted
      (currentCell?.id === tallestCell && newCellHeight < currentRowSize); // tallest cell is smaller than before;

    let newRowHeight: number | undefined = undefined;
    if (shouldRowBeUpdated) {
      const { height: maxHeight, cell: tallestCell } = this.getRowMaxHeight(sheetId, row);
      newRowHeight = maxHeight;
      this.history.update("tallestCellInRows", sheetId, row, tallestCell?.id);
    } else if (newCellHeight > currentRowSize) {
      newRowHeight = newCellHeight;
      const tallestCell = this.getters.getCell(sheetId, col, row);
      this.history.update("tallestCellInRows", sheetId, row, tallestCell?.id);
    }

    if (newRowHeight !== undefined && newRowHeight !== currentRowSize) {
      let newHeaders = deepCopy(this.headerSizes[sheetId]["ROW"]);
      newHeaders[row] = newRowHeight;
      this.history.update("headerSizes", sheetId, "ROW", newHeaders);
    }
  }

  private getHeaderSize(sheetId: SheetId, dimension: Dimension, index: number): number {
    return (
      this.userHeaderSizes[sheetId]?.[dimension]?.[index] ||
      this.headerSizes[sheetId]?.[dimension]?.[index] ||
      this.getDefaultHeaderSize(dimension)
    );
  }

  private initSheet(sheetId: SheetId) {
    const sizes: Record<Dimension, Array<number>> = { COL: [], ROW: [] };
    for (let i = 0; i < this.getters.getNumberCols(sheetId); i++) {
      sizes.COL.push(this.getHeaderSize(sheetId, "COL", i));
    }
    for (let i = 0; i < this.getters.getNumberRows(sheetId); i++) {
      let rowSize = this.userHeaderSizes[sheetId]["ROW"][i];
      if (!rowSize) {
        const { cell: tallestCell, height } = this.getRowMaxHeight(sheetId, i);
        rowSize = height;
        this.history.update("tallestCellInRows", sheetId, i, tallestCell?.id);
      }
      sizes.ROW.push(rowSize);
    }
    this.history.update("headerSizes", sheetId, sizes);
  }

  private getDefaultHeaderSize(dimension: Dimension): number {
    return dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
  }

  /** Get index of first header added by an ADD_COLUMNS_ROWS command */
  private getAddHeaderStartIndex(position: "before" | "after", base: number): number {
    return position === "after" ? base + 1 : base;
  }

  /**
   * Return the height the cell should have in the sheet, which is either DEFAULT_CELL_HEIGHT if the cell is in a multi-row
   * merge, or the height of the cell computed based on its font size.
   */
  private getCellHeight(sheetId: SheetId, col: number, row: number) {
    const merge = this.getters.getMerge(sheetId, col, row);
    if (merge && merge.bottom !== merge.top) {
      return DEFAULT_CELL_HEIGHT;
    }
    const cell = this.getters.getCell(sheetId, col, row);
    return getDefaultCellHeight(cell);
  }

  /**
   * Get the max height of a row based on its cells.
   *
   * The max height of the row correspond to the cell with the biggest font size that has a content,
   * and that is not part of a multi-line merge.
   */
  private getRowMaxHeight(sheetId: SheetId, row: number): { cell?: Cell; height: number } {
    const cells = this.getters.getRowCells(sheetId, row);
    let maxHeight = 0,
      tallestCell: Cell | undefined = undefined;
    for (let i = 0; i < cells.length; i++) {
      const { col, row } = this.getters.getCellPosition(cells[i].id);
      const cellHeight = this.getCellHeight(sheetId, col, row);
      if (cellHeight > maxHeight && cellHeight > DEFAULT_CELL_HEIGHT) {
        maxHeight = cellHeight;
        tallestCell = cells[i];
      }
    }

    if (maxHeight <= DEFAULT_CELL_HEIGHT) {
      return { height: DEFAULT_CELL_HEIGHT };
    }
    return { cell: tallestCell, height: maxHeight };
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.userHeaderSizes[sheet.id] = { COL: [], ROW: [] };
      for (let [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          this.userHeaderSizes[sheet.id]["ROW"][rowIndex] = row.size;
        }
      }

      for (let [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          this.userHeaderSizes[sheet.id]["COL"][colIndex] = col.size;
        }
      }
      this.initSheet(sheet.id);
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
      // Export row sizes
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (let row = 0; row < this.getters.getNumberRows(sheet.id); row++) {
        if (exportDefaults || this.userHeaderSizes[sheet.id]["ROW"][row]) {
          if (sheet.rows[row] === undefined) {
            sheet.rows[row] = {};
          }
          sheet.rows[row].size = this.getRowSize(sheet.id, row);
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        if (exportDefaults || this.userHeaderSizes[sheet.id]["COL"][col]) {
          if (sheet.cols[col] === undefined) {
            sheet.cols[col] = {};
          }
          sheet.cols[col].size = this.getColSize(sheet.id, col);
        }
      }
    }
  }
}
