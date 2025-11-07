import { DEFAULT_CELL_HEIGHT } from "../../constants";
import {
  deepCopy,
  getAddHeaderStartIndex,
  insertItemsAtIndex,
  range,
  removeIndexesFromArray,
} from "../../helpers/misc";
import { getCanvas, getDefaultCellHeight } from "../../helpers/text_helper";
import { positions } from "../../helpers/zones";
import { Canvas2DContext } from "../../types/canvas";
import { Command } from "../../types/commands";
import { AnchorOffset } from "../../types/figure";
import {
  CellPosition,
  Dimension,
  HeaderIndex,
  Immutable,
  Pixel,
  UID,
  Zone,
} from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

interface HeaderSizeState {
  tallestCellInRow: Immutable<Record<UID, Array<CellWithSize | undefined>>>;
}

interface CellWithSize {
  cell: CellPosition;
  size: Pixel;
}

export class HeaderSizeUIPlugin extends CoreViewPlugin<HeaderSizeState> implements HeaderSizeState {
  static getters = ["getRowSize", "getHeaderSize", "getMaxAnchorOffset"] as const;

  readonly tallestCellInRow: Immutable<Record<UID, Array<CellWithSize | undefined>>> = {};
  ctx: Canvas2DContext = getCanvas();

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      // Ensure rows are updated before "UPDATE_CELL" is dispatched from cell plugin.
      // "UPDATE_CELL" uses the Sheet core plugin to access row data.
      // If "ADD_COLUMNS_ROWS" has not been processed yet by header_sizes_ui,
      // size updates may apply to incorrect (pre-insert) rows.
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          return;
        }
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        const newCells = Array(cmd.quantity).fill(undefined);
        const newTallestCells = insertItemsAtIndex(
          this.tallestCellInRow[cmd.sheetId],
          newCells,
          addIndex
        );
        this.history.update("tallestCellInRow", cmd.sheetId, newTallestCells);
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
      case "UPDATE_LOCALE":
        for (const sheetId of this.getters.getSheetIds()) {
          this.initializeSheet(sheetId);
        }
        break;
      case "CREATE_SHEET": {
        this.initializeSheet(cmd.sheetId);
        break;
      }
      case "DUPLICATE_SHEET": {
        const tallestCells = deepCopy(this.tallestCellInRow[cmd.sheetId]);
        this.history.update("tallestCellInRow", cmd.sheetIdTo, tallestCells);
        break;
      }
      case "DELETE_SHEET":
        const tallestCells = { ...this.tallestCellInRow };
        delete tallestCells[cmd.sheetId];
        this.history.update("tallestCellInRow", tallestCells);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        if (cmd.dimension === "COL") {
          return;
        }
        const tallestCells = removeIndexesFromArray(
          this.tallestCellInRow[cmd.sheetId],
          cmd.elements
        );
        this.history.update("tallestCellInRow", cmd.sheetId, tallestCells);
        break;
      }
      case "RESIZE_COLUMNS_ROWS":
        {
          const sheetId = cmd.sheetId;
          if (cmd.dimension === "ROW") {
            for (const row of cmd.elements) {
              const tallestCell = this.getRowTallestCell(sheetId, row);
              this.history.update("tallestCellInRow", sheetId, row, tallestCell);
            }
          } else {
            // Recompute row heights on col size change, they might have changed because of wrapped text
            for (const row of range(0, this.getters.getNumberRows(sheetId))) {
              for (const col of cmd.elements) {
                this.updateRowSizeForCellChange(sheetId, row, col);
              }
            }
          }
        }
        break;
      case "SET_FORMATTING":
        if (
          "style" in cmd &&
          (!cmd.style ||
            "fontSize" in cmd.style ||
            "wrapping" in cmd.style ||
            "rotation" in cmd.style)
        ) {
          for (const zone of cmd.target) {
            // TODO FLDA use rangeSet
            this.updateRowSizeForZoneChange(cmd.sheetId, zone);
          }
        }
        break;
      case "UPDATE_CELL":
        this.updateRowSizeForCellChange(cmd.sheetId, cmd.row, cmd.col);
        break;
      case "ADD_MERGE":
      case "REMOVE_MERGE":
        for (const target of cmd.target) {
          for (const position of positions(target)) {
            this.updateRowSizeForCellChange(cmd.sheetId, position.row, position.col);
          }
        }
    }
    return;
  }

  getRowSize(sheetId: UID, row: HeaderIndex): Pixel {
    return Math.round(
      this.getters.getUserRowSize(sheetId, row) ??
        this.tallestCellInRow[sheetId][row]?.size ??
        DEFAULT_CELL_HEIGHT
    );
  }

  getMaxAnchorOffset(sheetId: UID, height: Pixel, width: Pixel): AnchorOffset {
    let { numberOfRows: row, numberOfCols: col } = this.getters.getSheetSize(sheetId);
    let availableHeight = 0;
    for (; availableHeight < height && row > 0; row--) {
      availableHeight += this.getRowSize(sheetId, row - 1);
    }
    let availableWidth = 0;
    for (; availableWidth < width && col > 0; col--) {
      availableWidth += this.getters.getColSize(sheetId, col - 1);
    }
    return {
      col,
      row,
      offset: { x: availableWidth - width, y: availableHeight - height },
    };
  }

  getHeaderSize(sheetId: UID, dimension: Dimension, index: HeaderIndex): Pixel {
    if (this.getters.isHeaderHidden(sheetId, dimension, index)) {
      return 0;
    }
    return dimension === "ROW"
      ? this.getRowSize(sheetId, index)
      : this.getters.getColSize(sheetId, index);
  }

  private updateRowSizeForZoneChange(sheetId: UID, zone: Zone) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      const newTallestCell = this.getRowTallestCell(sheetId, row);
      this.history.update("tallestCellInRow", sheetId, row, newTallestCell);
    }
  }

  private updateRowSizeForCellChange(sheetId: UID, row: HeaderIndex, col: HeaderIndex) {
    const tallestCellInRow = this.tallestCellInRow[sheetId]?.[row];
    if (tallestCellInRow?.cell.col === col) {
      const newTallestCell = this.getRowTallestCell(sheetId, row);
      this.history.update("tallestCellInRow", sheetId, row, newTallestCell);
    }

    const updatedCellHeight = this.getCellHeight({ sheetId, col, row });
    if (updatedCellHeight <= DEFAULT_CELL_HEIGHT) {
      return;
    }

    if (
      (!tallestCellInRow && updatedCellHeight > DEFAULT_CELL_HEIGHT) ||
      (tallestCellInRow && updatedCellHeight > tallestCellInRow.size)
    ) {
      const newTallestCell = { cell: { sheetId, col, row }, size: updatedCellHeight };
      this.history.update("tallestCellInRow", sheetId, row, newTallestCell);
    }
  }

  private initializeSheet(sheetId: UID) {
    const tallestCells: Array<CellWithSize | undefined> = [];
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const tallestCell = this.getRowTallestCell(sheetId, row);
      tallestCells.push(tallestCell);
    }
    this.history.update("tallestCellInRow", sheetId, tallestCells);
  }

  /**
   * Return the height the cell should have in the sheet, which is either DEFAULT_CELL_HEIGHT if the cell is in a multi-row
   * merge, or the height of the cell computed based on its style/content.
   */
  private getCellHeight(position: CellPosition): Pixel {
    if (this.isInMultiRowMerge(position)) {
      return DEFAULT_CELL_HEIGHT;
    }

    const cell = this.getters.getCell(position);
    const style = this.getters.getCellStyle(position);
    const colSize = this.getters.getColSize(position.sheetId, position.col);
    return getDefaultCellHeight(this.ctx, cell, style, this.getters.getLocale(), colSize);
  }

  private isInMultiRowMerge(position: CellPosition): boolean {
    const merge = this.getters.getMerge(position);
    return !!merge && merge.bottom !== merge.top;
  }

  /**
   * Get the tallest cell of a row and its size.
   */
  private getRowTallestCell(sheetId: UID, row: HeaderIndex): CellWithSize | undefined {
    const userRowSize = this.getters.getUserRowSize(sheetId, row);
    if (userRowSize !== undefined) {
      return undefined;
    }

    const cellIds = this.getters.getRowCellIds(sheetId, row);
    let maxHeight = 0;
    let tallestCell: CellWithSize | undefined = undefined;
    for (let i = 0; i < cellIds.length; i++) {
      const cell = this.getters.getCellById(cellIds[i]);
      if (!cell) {
        continue;
      }
      const position = this.getters.getCellPosition(cell.id);
      const cellHeight = this.getCellHeight(position);

      if (cellHeight > maxHeight && cellHeight > DEFAULT_CELL_HEIGHT) {
        maxHeight = cellHeight;
        tallestCell = { cell: position, size: cellHeight };
      }
    }

    if (tallestCell && tallestCell.size > DEFAULT_CELL_HEIGHT) {
      return tallestCell;
    }

    return undefined;
  }
}
