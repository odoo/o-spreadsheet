import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { Mode } from "../../model";
import {
  Command,
  Dimension,
  ExcelWorkbookData,
  HeaderDisplayInfo,
  RemoveColumnsRowsCommand,
  SheetId,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { AddColumnsRowsCommand, ResizeColumnsRowsCommand } from "./../../types/commands";

export class HeaderSizePlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  static getters = [
    "getRowSize",
    "getColSize",
    "getColInfo",
    "getRowInfo",
    "getColsInfo",
    "getRowsInfo",
  ] as const;

  private readonly headerSizes: Record<SheetId, Record<Dimension, Array<HeaderDisplayInfo>>> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
      case "UNDO":
      case "REDO":
        for (let sheetId of this.getters.getSheetIds()) {
          delete this.headerSizes[sheetId];
          this.initSheet(sheetId);
        }
        break;
      case "CREATE_SHEET":
        this.initSheet(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.initSheet(cmd.sheetIdTo);
        break;
      case "DELETE_SHEET":
        delete this.headerSizes[cmd.sheetId];
        break;
      case "RESIZE_COLUMNS_ROWS":
        this.updateHeadersOnResize(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.updateHeadersOnDeletion(cmd);
        break;
      case "ADD_COLUMNS_ROWS":
        this.updateHeadersOnAddition(cmd);
        break;
      case "UNHIDE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS": {
        const headers = this.computeStartEnd(cmd.sheetId, cmd.dimension);
        this.headerSizes[cmd.sheetId][cmd.dimension] = headers;
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getColSize(sheetId: SheetId, index: number): number {
    return this.headerSizes[sheetId]["COL"][index].size;
  }

  getRowSize(sheetId: SheetId, index: number): number {
    return this.headerSizes[sheetId]["ROW"][index].size;
  }

  getColInfo(sheetId: SheetId, index: number): HeaderDisplayInfo {
    if (!this.headerSizes[sheetId]["COL"][index]) debugger;
    return this.headerSizes[sheetId]["COL"][index];
  }

  getRowInfo(sheetId: SheetId, index: number): HeaderDisplayInfo {
    if (!this.headerSizes[sheetId]["ROW"][index]) debugger;
    return this.headerSizes[sheetId]["ROW"][index];
  }

  getColsInfo(sheetId: SheetId): HeaderDisplayInfo[] {
    if (!this.headerSizes[sheetId]) debugger;
    return this.headerSizes[sheetId]["COL"];
  }

  getRowsInfo(sheetId: SheetId): HeaderDisplayInfo[] {
    return this.headerSizes[sheetId]["ROW"];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getHeaderSize(sheetId: SheetId, dimension: Dimension, index: number): number {
    return (
      this.getters.getUserDefinedHeaderSize(sheetId, dimension, index) ||
      this.headerSizes[sheetId]?.[dimension]?.[index]?.size ||
      this.getDefaultHeaderSize(dimension)
    );
  }

  private initSheet(sheetId: SheetId) {
    const sizes: Record<Dimension, Array<HeaderDisplayInfo>> = { COL: [], ROW: [] };
    for (let i = 0; i < this.getters.getNumberCols(sheetId); i++) {
      sizes.COL.push({
        size: this.getHeaderSize(sheetId, "COL", i),
        start: 0,
        end: 0,
      });
    }
    sizes.COL = this.computeStartEnd(sheetId, "COL", sizes.COL);

    for (let i = 0; i < this.getters.getNumberRows(sheetId); i++) {
      sizes.ROW.push({
        size: this.getHeaderSize(sheetId, "ROW", i),
        start: 0,
        end: 0,
      });
    }
    sizes.ROW = this.computeStartEnd(sheetId, "ROW", sizes.ROW);
    this.headerSizes[sheetId] = sizes;
  }

  private getDefaultHeaderSize(dimension: Dimension): number {
    return dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
  }

  private updateHeadersOnResize({
    sheetId,
    elements: resizedHeaders,
    dimension,
    size,
  }: ResizeColumnsRowsCommand) {
    let newHeaders = [...this.headerSizes[sheetId][dimension]];
    for (let headerIndex of resizedHeaders) {
      if (!newHeaders[headerIndex]) {
        newHeaders[headerIndex] = { size, end: 0, start: 0 };
      } else {
        newHeaders[headerIndex].size = size;
      }
    }
    newHeaders = this.computeStartEnd(sheetId, dimension, newHeaders);
    this.headerSizes[sheetId][dimension] = newHeaders;
  }

  /** On header deletion command, remove deleted headers and update start-end of the others  */
  private updateHeadersOnDeletion({
    sheetId,
    elements: deletedHeaders,
    dimension,
  }: RemoveColumnsRowsCommand) {
    let headers: HeaderDisplayInfo[] = [];
    for (let [index, header] of this.headerSizes[sheetId][dimension].entries()) {
      if (deletedHeaders.includes(index)) {
        continue;
      }
      headers.push(header);
    }

    headers = this.computeStartEnd(sheetId, dimension, headers);

    this.headerSizes[sheetId][dimension] = headers;
  }

  /** On header addition command, add new headers and update start-end of all the headers  */
  private updateHeadersOnAddition({
    sheetId,
    dimension,
    base,
    quantity,
    position,
  }: AddColumnsRowsCommand) {
    // Add headers in the list
    let headers = [...this.headerSizes[sheetId][dimension]];
    const startIndex = this.getAddHeaderStartIndex(position, base);
    const size = this.getHeaderSize(sheetId, dimension, base);
    for (let i = 0; i < quantity; i++) {
      headers.splice(startIndex, 0, { size, start: 0, end: 0 });
    }

    headers = this.computeStartEnd(sheetId, dimension, headers);

    this.headerSizes[sheetId][dimension] = headers;
  }

  /** Update the start-end of the given list of headers using the current sheet state  */
  private computeStartEnd(
    sheetId: SheetId,
    dimension: Dimension,
    headers: HeaderDisplayInfo[] = [...this.headerSizes[sheetId][dimension]]
  ): HeaderDisplayInfo[] {
    const newHeaders: HeaderDisplayInfo[] = [];
    let start = 0;
    for (let [index, header] of headers.entries()) {
      const isHidden =
        dimension === "COL"
          ? this.getters.tryGetCol(sheetId, index)?.isHidden
          : this.getters.tryGetRow(sheetId, index)?.isHidden;
      const size = headers[index].size;
      const end = isHidden ? start : start + size;
      newHeaders.push({ ...header, start, end });
      start = end;
    }

    return newHeaders;
  }

  /** Get index of first header added by an ADD_COLUMNS_ROWS command */
  private getAddHeaderStartIndex(position: "before" | "after", base: number): number {
    return position === "after" ? base + 1 : base;
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      // Export row sizes
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (let [rowIndex, rowInfo] of Object.entries(this.headerSizes[sheet.id]["ROW"])) {
        if (sheet.rows[rowIndex] === undefined) {
          sheet.rows[rowIndex] = {};
        }

        if (sheet.rows[rowIndex].size !== undefined) {
          continue;
        } else if (rowInfo !== undefined) {
          sheet.rows[rowIndex].size = rowInfo.size;
        } else {
          sheet.rows[rowIndex].size = DEFAULT_CELL_HEIGHT;
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let [colIndex, colInfo] of Object.entries(this.headerSizes[sheet.id]["COL"])) {
        if (sheet.cols[colIndex] === undefined) {
          sheet.cols[colIndex] = {};
        }

        if (sheet.cols[colIndex].size !== undefined) {
          continue;
        } else if (colInfo !== undefined) {
          sheet.cols[colIndex].size = colInfo.size;
        } else {
          sheet.cols[colIndex].size = DEFAULT_CELL_WIDTH;
        }
      }
    }
  }
}
