import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy } from "../../helpers";
import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, SheetId } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export class HeaderSizePlugin extends CorePlugin {
  static getters = ["getRowSize", "getColSize"] as const;

  private readonly headerSizes: Record<SheetId, Record<Dimension, Array<number | undefined>>> = {};
  private readonly userHeaderSizes: Record<SheetId, Record<Dimension, Array<number | undefined>>> =
    {};

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
        break;
      case "DELETE_SHEET":
        this.history.update("headerSizes", cmd.sheetId, undefined);
        this.history.update("userHeaderSizes", cmd.sheetId, undefined);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const userHeaderSizes = [...this.userHeaderSizes[cmd.sheetId][cmd.dimension]];
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        for (let el of [...cmd.elements].sort().reverse()) {
          userHeaderSizes.splice(el, 1);
          headerSizes.splice(el, 1);
        }
        this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, userHeaderSizes);
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const userHeaderSizes = [...this.userHeaderSizes[cmd.sheetId][cmd.dimension]];
        const headerSizes = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        const addIndex = this.getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseUserSize = userHeaderSizes[cmd.base];
        const baseSize = headerSizes[cmd.base];
        for (let i = 0; i < cmd.quantity; i++) {
          userHeaderSizes.splice(addIndex, 0, baseUserSize);
          headerSizes.splice(addIndex, 0, baseSize);
        }
        this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, userHeaderSizes);
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, headerSizes);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("userHeaderSizes", cmd.sheetId, cmd.dimension, el, cmd.size);
          this.history.update("headerSizes", cmd.sheetId, cmd.dimension, el, cmd.size);
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
      sizes.ROW.push(this.getHeaderSize(sheetId, "ROW", i));
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
