import { CorePlugin } from "../core_plugin";

/** This Plugin handle the resizing of the rows when the font size of its elements is changed */
export class RowResizerPlugin extends CorePlugin {
  // static getters = ["getRowMaxHeight"] as const;
  // beforeHandle(cmd: Command): number[] | undefined {
  //   switch (cmd.type) {
  //     case "UPDATE_CELL":
  //       return [this.getCellHeight(cmd.sheetId, cmd.col, cmd.row)];
  //     case "REMOVE_MERGE":
  //     case "ADD_MERGE":
  //       const oldHeights: number[] = [];
  //       for (const zone of cmd.target) {
  //         oldHeights.push(this.getCellHeight(cmd.sheetId, zone.left, zone.top));
  //       }
  //       return oldHeights;
  //   }
  //   return;
  // }
  // handle(cmd: Command, oldHeights?: number[]) {
  //   switch (cmd.type) {
  //     case "START":
  //       this.adjustAllRowHeights();
  //       break;
  //     case "UPDATE_CELL": {
  //       if (!oldHeights) break;
  //       const sheet = this.getters.getSheet(cmd.sheetId);
  //       if (!sheet.rows[cmd.row].isManuallySized) {
  //         this.adjustRowSizeWithCellFont(sheet, cmd.col, cmd.row, oldHeights[0]);
  //       }
  //       break;
  //     }
  //     case "ADD_MERGE":
  //     case "REMOVE_MERGE": {
  //       if (!oldHeights) break;
  //       const sheet = this.getters.getSheet(cmd.sheetId);
  //       for (let i = 0; i < cmd.target.length; i++) {
  //         const zone = cmd.target[i];
  //         const oldHeight = oldHeights[i];
  //         if (!sheet.rows[zone.top].isManuallySized) {
  //           this.adjustRowSizeWithCellFont(sheet, zone.left, zone.top, oldHeight);
  //         }
  //       }
  //       break;
  //     }
  //   }
  // }
  // /**
  //  * Change the size of a row to match the non-empty cell with the biggest font size.
  //  *
  //  * First compare the old cell height with the row size, to avoid fetching all the cells in the row, and then recompute
  //  * the row height if it's needed.
  //  *
  //  * @param oldCellHeight cell height before the changes that caused adjustRowSizeWithCellFont to be called.
  //  */
  // private adjustRowSizeWithCellFont(sheet: Sheet, col: number, row: number, oldCellHeight: number) {
  //   const newCellHeight = this.getCellHeight(sheet.id, col, row);
  //   if (newCellHeight === oldCellHeight) return;
  //   const wasTallestInRow =
  //     oldCellHeight > DEFAULT_CELL_HEIGHT && oldCellHeight === sheet.rows[row].size;
  //   let newRowHeight: number | undefined = undefined;
  //   // The updated cell was the tallest in the row. Recompute the tallest cell in the row.
  //   if (wasTallestInRow) {
  //     newRowHeight = this.getRowMaxHeight(row, sheet.id);
  //   }
  //   // The updated cell wasn't the tallest in the row. Check if its new size is taller than the current row size.
  //   else if (newCellHeight > sheet.rows[row].size) {
  //     newRowHeight = newCellHeight;
  //   }
  //   if (newRowHeight !== undefined && newRowHeight !== sheet.rows[row].size) {
  //     this.dispatch("RESIZE_COLUMNS_ROWS", {
  //       elements: [row],
  //       dimension: "ROW",
  //       size: newRowHeight,
  //       sheetId: sheet.id,
  //       isManual: false,
  //     });
  //   }
  // }
  // /**
  //  * Get the max height of a row based on its cells.
  //  *
  //  * The max height of the row correspond to the cell with the biggest font size that has a content,
  //  * and that is not part of a multi-line merge.
  //  */
  // getRowMaxHeight(row: number, sheetId: UID) {
  //   const cellSizes = this.getters.getRowCells(sheetId, row).map((cell) => {
  //     const { col, row, sheetId } = this.getters.getCellPosition(cell.id);
  //     return this.getCellHeight(sheetId, col, row);
  //   });
  //   const maxSize = Math.max(...cellSizes);
  //   const rowMaxHeight = maxSize > DEFAULT_CELL_HEIGHT ? maxSize : DEFAULT_CELL_HEIGHT;
  //   return rowMaxHeight;
  // }
  // /**
  //  * Return the height the cell should have in the sheet, which is either DEFAULT_CELL_HEIGHT if the cell is in a multi-row
  //  * merge, or the height of the cell computed based on its content and font size.
  //  */
  // private getCellHeight(sheetId: UID, col: number, row: number) {
  //   const merge = this.getters.getMerge(sheetId, col, row);
  //   if (merge && merge.bottom !== merge.top) {
  //     return DEFAULT_CELL_HEIGHT;
  //   }
  //   const cell = this.getters.getCell(sheetId, col, row);
  //   return getDefaultCellHeight(cell);
  // }
  // /** Adjust the row heights of all the rows in all the sheets based on the font size of their cells  */
  // private adjustAllRowHeights() {
  //   for (let sheetId of this.getters.getSheetIds()) {
  //     const numberOfRows = this.getters.getNumberRows(sheetId);
  //     for (let i = 0; i < numberOfRows; i++) {
  //       const row = this.getters.getRow(sheetId, i);
  //       if (!row.isManuallySized) {
  //         const rowMaxHeight = this.getRowMaxHeight(i, sheetId);
  //         if (rowMaxHeight && rowMaxHeight !== DEFAULT_CELL_HEIGHT) {
  //           this.dispatch("RESIZE_COLUMNS_ROWS", {
  //             elements: [i],
  //             dimension: "ROW",
  //             size: rowMaxHeight,
  //             sheetId: sheetId,
  //             isManual: false,
  //           });
  //         }
  //       }
  //     }
  //   }
  // }
}
