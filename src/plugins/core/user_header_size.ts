import { Command, ExcelWorkbookData, WorkbookData } from "../../types";
import { Dimension, SheetId } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export class UserHeaderSizePlugin extends CorePlugin {
  static getters = ["getUserDefinedHeaderSize"] as const;

  private headerSizes: Record<SheetId, Record<Dimension, Array<number | undefined>>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("headerSizes", cmd.sheetId, { COL: [], ROW: [] });
        break;
      case "DUPLICATE_SHEET":
        this.history.update("headerSizes", cmd.sheetIdTo, { COL: [], ROW: [] });
        break;
      case "DELETE_SHEET":
        this.history.update("headerSizes", cmd.sheetId, undefined);
        break;
      case "DELETE_SHEET":
        this.history.update("headerSizes", cmd.sheetId, undefined);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const newSizeArray = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        for (let el of [...cmd.elements].sort().reverse()) {
          newSizeArray.splice(el, 1);
        }
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, newSizeArray);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const newSizeArray = [...this.headerSizes[cmd.sheetId][cmd.dimension]];
        const addIndex = this.getAddHeaderStartIndex(cmd.position, cmd.base);
        const baseSize = newSizeArray[addIndex];
        for (let i = 0; i < cmd.quantity; i++) {
          newSizeArray.splice(addIndex, 0, baseSize);
        }
        this.history.update("headerSizes", cmd.sheetId, cmd.dimension, newSizeArray);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        for (let el of cmd.elements) {
          this.history.update("headerSizes", cmd.sheetId, cmd.dimension, el, cmd.size);
        }
        break;
    }
    return;
  }

  getUserDefinedHeaderSize(
    sheetId: SheetId,
    dimension: Dimension,
    index: number
  ): number | undefined {
    return this.headerSizes[sheetId][dimension][index];
  }

  /** Get index of first header added by an ADD_COLUMNS_ROWS command */
  private getAddHeaderStartIndex(position: "before" | "after", base: number): number {
    return position === "after" ? base + 1 : base;
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.headerSizes[sheet.id] = { COL: [], ROW: [] };
      for (let [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          this.headerSizes[sheet.id]["ROW"][rowIndex] = row.size;
        }
      }

      for (let [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          this.headerSizes[sheet.id]["COL"][colIndex] = col.size;
        }
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }

  export(data: WorkbookData) {
    for (let sheet of data.sheets) {
      // Export row sizes
      if (this.headerSizes[sheet.id]?.["ROW"]) {
        if (sheet.rows === undefined) {
          sheet.rows = {};
        }
        for (let [rowIndex, rowSize] of Object.entries(this.headerSizes[sheet.id]["ROW"])) {
          if (rowSize !== undefined) {
            if (sheet.rows[rowIndex] === undefined) {
              sheet.rows[rowIndex] = {};
            }
            sheet.rows[rowIndex].size = rowSize;
          }
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      if (this.headerSizes[sheet.id]?.["COL"]) {
        for (let [colIndex, colSize] of Object.entries(this.headerSizes[sheet.id]["COL"])) {
          if (colSize !== undefined) {
            if (sheet.cols[colIndex] === undefined && colSize !== undefined) {
              sheet.cols[colIndex] = {};
            }
            sheet.cols[colIndex].size = colSize;
          }
        }
      }
    }
  }
}
