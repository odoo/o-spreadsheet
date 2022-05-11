import { DEFAULT_CELL_WIDTH } from "../../constants";
import { getDefaultCellHeight } from "../../helpers";
import { Mode } from "../../model";
import {
  Cell,
  Command,
  Dimension,
  ExcelWorkbookData,
  HeaderDisplayInfo,
  RemoveColumnsRowsCommand,
  Sheet,
  SheetId,
  UID,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { DEFAULT_CELL_HEIGHT } from "./../../constants";
import { AddColumnsRowsCommand, ResizeColumnsRowsCommand } from "./../../types/commands";

/**
 * Notes :
 * - undo/redo : j'aimerais avoir l'history, sinon c'est plus lent. Exemple : ctrl+a, delete. Undo, je dois
 *    recalculer la taille de toutes les rows.
 * - evaluation : vu que je sais pas quelles cellules ont été modifiées, dans le doute dès que j'ai eu un seul update cell,
 *    je dois recalcuelr la taille d'absolument tout.
 *
 * Si je sais quelles cellules ont été updates, j'ai pas besoind e savoir la oldHeight je pense. Je peux :
 *  - quand je calcule la taille d'une row, je mémorize la tallestCellInRow dans une array.
 *  - quand on a une update cell, je mémorize quelles cellules ont été updates
 *  - dans le finalize, j'ai juste à calucler la nouvelle taille de toutes les cellules qui ont été updates
 *      - si la taille est > tallestInRow j'upadate la taille
 *      - si la taille de tallestInRow est changée, c'est le seul cas où je dois calculer sur totue la row la nouvelle taille
 *          - je pourrais maintenir un tableau avec la taille de toutes les cellules, ou bien mettre l'info dans les cellules direct maybe
 *
 *
 */
export class HeaderSizePlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  static getters = [
    "getRowSize",
    "getColSize",
    "getColInfo",
    "getRowInfo",
    "getColsInfo",
    "getRowsInfo",
    "getRowMaxHeight",
  ] as const;

  private readonly headerSizes: Record<SheetId, Record<Dimension, Array<HeaderDisplayInfo>>> = {};
  private dirtyRows: Record<SheetId, Set<number>> = {};
  private tallestCellInRow: Record<SheetId, Array<UID | undefined>> = {};

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
        delete this.tallestCellInRow[cmd.sheetId];
        break;
      case "RESIZE_COLUMNS_ROWS":
        this.updateHeadersOnResize(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "ROW") {
          for (let el of [...cmd.elements].sort().reverse()) {
            delete this.tallestCellInRow[cmd.sheetId][el];
          }
        }
        // Check if tallest cells in rows were removed
        if (cmd.dimension === "COL") {
          for (let row = 0; row < this.tallestCellInRow[cmd.sheetId].length; row++) {
            const tallestCellId = this.tallestCellInRow[cmd.sheetId][row];
            if (tallestCellId) {
              const cell = this.getters.tryGetCellPosition(tallestCellId);
              if (!cell) {
                this.dirtyRows[cmd.sheetId].add(row);
              }
            }
          }
        }

        this.updateHeadersOnDeletion(cmd);
        break;
      case "ADD_COLUMNS_ROWS":
        for (let i = cmd.base; i < cmd.quantity; i++) {
          this.tallestCellInRow[cmd.sheetId].splice(i, 0, undefined);
        }
        this.updateHeadersOnAddition(cmd);
        break;
      case "UNHIDE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS": {
        const headers = this.computeStartEnd(cmd.sheetId, cmd.dimension);
        this.headerSizes[cmd.sheetId][cmd.dimension] = headers;
        break;
      }
      case "UPDATE_CELL":
        if (!cmd.content || cmd.style?.fontSize) {
          if (!this.dirtyRows[cmd.sheetId]) {
            this.dirtyRows[cmd.sheetId] = new Set();
          }
          const cellId = this.getters.getCell(cmd.sheetId, cmd.col, cmd.row)?.id;
          if (
            cellId &&
            cmd.content === "" &&
            cellId === this.tallestCellInRow[cmd.sheetId][cmd.row]
          ) {
            this.dirtyRows[cmd.sheetId].add(cmd.row);
          } else if (cmd.content || cmd.style?.fontSize) {
            this.dirtyRows[cmd.sheetId].add(cmd.row);
          }
        }
        break;
      case "DELETE_CONTENT":
        if (!this.dirtyRows[cmd.sheetId]) {
          this.dirtyRows[cmd.sheetId] = new Set();
        }

        for (let target of cmd.target) {
          for (let row = target.top; row <= target.bottom; row++) {
            const tallestCellInRow = this.tallestCellInRow[cmd.sheetId][row];
            if (tallestCellInRow) {
              const tallestCellPosition = this.getters.getCellPosition(tallestCellInRow);
              if (
                tallestCellPosition.col >= target.left &&
                tallestCellPosition.col < target.right
              ) {
                this.dirtyRows[cmd.sheetId].add(row);
              }
            } else {
              this.dirtyRows[cmd.sheetId].add(row);
            }
          }
        }
        break;
      case "ADD_MERGE":
      case "REMOVE_MERGE":
        if (!this.dirtyRows[cmd.sheetId]) {
          this.dirtyRows[cmd.sheetId] = new Set();
        }
        for (let target of cmd.target) {
          for (let row = target.top; row <= target.bottom; row++) {
            this.dirtyRows[cmd.sheetId].add(row);
          }
        }
        break;
    }
  }

  finalize() {
    for (let sheetId of this.getters.getSheetIds()) {
      const modifiedRows: Set<number> = new Set(this.dirtyRows[sheetId]);
      const modifiedCells = new Set([...this.getters.getModifiedCells(sheetId).values()]);
      for (let id of modifiedCells) {
        const { row } = this.getters.getCellPosition(id);
        modifiedRows.add(row);
      }

      const newRowsDims = [...this.headerSizes[sheetId]["ROW"]];
      for (let row of modifiedRows) {
        if (!newRowsDims[row]) {
          newRowsDims[row] = { size: 0, start: 0, end: 0 };
        }
        newRowsDims[row].size =
          this.getters.getUserDefinedHeaderSize(sheetId, "ROW", row) ||
          this.getRowMaxHeight(row, sheetId);
      }
      this.headerSizes[sheetId]["ROW"] = this.computeStartEnd(sheetId, "ROW", newRowsDims);

      this.dirtyRows[sheetId] = new Set();
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

  /**
   * Get the max height of a row based on its cells.
   *
   * The max height of the row correspond to the cell with the biggest font size that has a content,
   * and that is not part of a multi-line merge.
   */
  getRowMaxHeight(row: number, sheetId: SheetId) {
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

    const rowMaxHeight = maxHeight > DEFAULT_CELL_HEIGHT ? maxHeight : DEFAULT_CELL_HEIGHT;
    if (!this.tallestCellInRow[sheetId]) {
      this.tallestCellInRow[sheetId] = [];
    }
    this.tallestCellInRow[sheetId][row] = tallestCell?.id;

    return rowMaxHeight;
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

    const rowHeights: number[] = [];
    for (let i = 0; i < this.getters.getNumberRows(sheetId); i++) {
      rowHeights[i] = this.getRowMaxHeight(i, sheetId);
    }

    for (let i = 0; i < this.getters.getNumberRows(sheetId); i++) {
      sizes.ROW.push({
        size:
          this.getters.getUserDefinedHeaderSize(sheetId, "ROW", i) ||
          rowHeights[i] ||
          // this.getRowMaxHeight(i, sheetId) ||
          DEFAULT_CELL_HEIGHT,
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

  /**
   * Change the size of a row to match the non-empty cell with the biggest font size.
   *
   * First compare the old cell height with the row size, to avoid fetching all the cells in the row, and then recompute
   * the row height if it's needed.
   *
   * @param oldCellHeight cell height before the changes that caused adjustRowSizeWithCellFont to be called.
   */
  //@ts-ignore
  private adjustRowSizeWithCellFont(
    sheet: Sheet,
    col: number,
    row: number,
    oldCellHeight: number = -1
  ) {
    const currentRowSize = this.getRowInfo(sheet.id, row).size;
    const newCellHeight = this.getCellHeight(sheet.id, col, row);
    if (newCellHeight === oldCellHeight) return;

    // const wasTallestInRow = oldCellHeight > DEFAULT_CELL_HEIGHT && oldCellHeight === currentRowSize;
    const wasTallestInRow = true;

    let newRowHeight: number | undefined = undefined;
    // The updated cell was the tallest in the row. Recompute the tallest cell in the row.
    if (wasTallestInRow) {
      newRowHeight = this.getRowMaxHeight(row, sheet.id);
    }
    // The updated cell wasn't the tallest in the row. Check if its new size is taller than the current row size.
    else if (newCellHeight > currentRowSize) {
      newRowHeight = newCellHeight;
    }

    if (newRowHeight !== undefined && newRowHeight !== currentRowSize) {
      this.headerSizes[sheet.id]["ROW"][row].size = newRowHeight;
      this.headerSizes[sheet.id]["ROW"] = this.computeStartEnd(
        sheet.id,
        "ROW",
        this.headerSizes[sheet.id]["ROW"]
      );
    }
  }

  /**
   * Return the height the cell should have in the sheet, which is either DEFAULT_CELL_HEIGHT if the cell is in a multi-row
   * merge, or the height of the cell computed based on its content and font size.
   */
  private getCellHeight(sheetId: SheetId, col: number, row: number) {
    const merge = this.getters.getMerge(sheetId, col, row);
    if (merge && merge.bottom !== merge.top) {
      return DEFAULT_CELL_HEIGHT;
    }
    const cell = this.getters.getCell(sheetId, col, row);
    return getDefaultCellHeight(cell);
  }

  // ---------------------------------------------------------------------------
  // Excel export
  // ---------------------------------------------------------------------------

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
