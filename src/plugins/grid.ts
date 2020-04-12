import {
  isEqual,
  toCartesian,
  toXC,
  sanitizeSheet,
  numberToLetters,
  union
} from "../helpers/index";
import { BasePlugin } from "../base_plugin";
import { Cell, Command, Sheet, Zone, WorkbookData, Col, Row } from "../types/index";
import { tokenize } from "../formulas/index";
import { cellReference } from "../formulas/parser";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import {
  updateRemoveColumns,
  updateRemoveRows,
  updateAddColumns,
  updateAddRows
} from "../helpers/grid_manipulation";

const MIN_PADDING = 3;

export class GridPlugin extends BasePlugin {
  static getters = [
    "getColSize",
    "getRowSize",
    "getColsZone",
    "getRowsZone",
    "isMergeDestructive",
    "isInMerge",
    "getMainCell",
    "expandZone",
    "getGridSize"
  ];

  private nextId: number = 1;
  private width: number = 0;
  private height: number = 0;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): boolean {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        return this.workbook.cols.length > cmd.columns.length;
      case "REMOVE_ROWS":
        return this.workbook.rows.length > cmd.rows.length;
      default:
        return true;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.recomputeSizes();
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(col);
          if (size !== 0) {
            this.setColSize(col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let col of cmd.rows) {
          const size = this.getRowMaxHeight(col);
          if (size !== 0) {
            this.setRowSize(col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.cols) {
          this.setColSize(col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setRowSize(row, cmd.size);
        }
        break;
      case "REMOVE_COLUMNS":
        this.removeColumns(
          this.workbook.sheets.findIndex(sheet => sheet.name === cmd.sheet),
          cmd.columns
        );
        break;
      case "REMOVE_ROWS":
        this.removeRows(
          this.workbook.sheets.findIndex(sheet => sheet.name === cmd.sheet),
          cmd.rows
        );
        break;
      case "ADD_COLUMNS":
        this.addColumns(
          this.workbook.sheets.findIndex(sheet => sheet.name === cmd.sheet),
          cmd.column,
          cmd.position,
          cmd.quantity
        );
        break;
      case "ADD_ROWS":
        this.addRows(
          this.workbook.sheets.findIndex(sheet => sheet.name === cmd.sheet),
          cmd.row,
          cmd.position,
          cmd.quantity
        );
        break;
      case "ADD_MERGE":
        this.addMerge(cmd.sheet, cmd.zone);
        break;
      case "REMOVE_MERGE":
        this.removeMerge(cmd.sheet, cmd.zone);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getColSize(index: number) {
    return this.workbook.cols[index].size;
  }

  getRowSize(index: number) {
    return this.workbook.rows[index].size;
  }

  getColsZone(start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.workbook.rows.length - 1,
      left: start,
      right: end
    };
  }

  getRowsZone(start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.workbook.cols.length - 1
    };
  }

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  isMergeDestructive(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.workbook.rows[row];
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = actualRow.cells[col];
          if (cell && cell.content) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Add all necessary merge to the current selection to make it valid
   */
  expandZone(zone: Zone): Zone {
    let { left, right, top, bottom } = zone;
    let result: Zone = { left, right, top, bottom };
    for (let i = left; i <= right; i++) {
      for (let j = top; j <= bottom; j++) {
        let mergeId = this.workbook.mergeCellMap[toXC(i, j)];
        if (mergeId) {
          result = union(this.workbook.merges[mergeId], result);
        }
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInMerge(xc: string): boolean {
    return xc in this.workbook.mergeCellMap;
  }

  getMainCell(xc: string): string {
    if (!this.isInMerge(xc)) {
      return xc;
    }
    const merge = this.workbook.mergeCellMap[xc];
    return this.workbook.merges[merge].topLeft;
  }

  getGridSize(): [number, number] {
    return [this.width, this.height];
  }
  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(index: number): number {
    const cells = this.workbook.rows.reduce(
      (acc: Cell[], cur) => (cur.cells[index] ? acc.concat(cur.cells[index]) : acc),
      []
    );
    const sizes = cells.map(this.getters.getCellWidth);
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(index: number): number {
    const cells = Object.values(this.workbook.rows[index].cells);
    const sizes = cells.map(this.getters.getCellHeight);
    return Math.max(0, ...sizes);
  }

  private setColSize(index: number, size: number) {
    const col = this.workbook.cols[index];
    const delta = size - col.size;
    this.history.updateState(["cols", index, "size"], size);
    this.history.updateState(["cols", index, "right"], col.right + delta);
    for (let i = index + 1; i < this.workbook.cols.length; i++) {
      const col = this.workbook.cols[i];
      this.history.updateState(["cols", i, "left"], col.left + delta);
      this.history.updateState(["cols", i, "right"], col.right + delta);
    }
    this.history.updateLocalState(["width"], this.width + delta);
  }

  private setRowSize(index: number, size: number) {
    const row = this.workbook.rows[index];
    const delta = size - row.size;
    this.history.updateState(["rows", index, "size"], size);
    this.history.updateState(["rows", index, "bottom"], row.bottom + delta);
    for (let i = index + 1; i < this.workbook.rows.length; i++) {
      const row = this.workbook.rows[i];
      this.history.updateState(["rows", i, "top"], row.top + delta);
      this.history.updateState(["rows", i, "bottom"], row.bottom + delta);
    }
    this.history.updateLocalState(["height"], this.height + delta);
  }

  private recomputeSizes() {
    const workbook = this.workbook;
    const height = workbook.rows[workbook.rows.length - 1].bottom + DEFAULT_CELL_HEIGHT + 5;
    const width = workbook.cols[workbook.cols.length - 1].right + DEFAULT_CELL_WIDTH;
    this.history.updateLocalState(["width"], width);
    this.history.updateLocalState(["height"], height);
  }

  // ---------------------------------------------------------------------------
  // Merges
  // ---------------------------------------------------------------------------

  /**
   * Merge the current selection. Note that:
   * - it assumes that we have a valid selection (no intersection with other
   *   merges)
   * - it does nothing if the merge is trivial: A1:A1
   */
  private addMerge(sheet: string, zone: Zone) {
    const { left, right, top, bottom } = zone;
    let tl = toXC(left, top);
    let br = toXC(right, bottom);
    if (tl === br) {
      return;
    }

    let id = this.nextId++;
    this.history.updateState(["merges", id], {
      id,
      left,
      top,
      right,
      bottom,
      topLeft: tl
    });
    let previousMerges: Set<number> = new Set();
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const xc = toXC(col, row);
        if (col !== left || row !== top) {
          this.dispatch("CLEAR_CELL", {
            sheet,
            col,
            row
          });
        }
        if (this.workbook.mergeCellMap[xc]) {
          previousMerges.add(this.workbook.mergeCellMap[xc]);
        }
        this.history.updateState(["mergeCellMap", xc], id);
      }
    }
    for (let m of previousMerges) {
      this.history.updateState(["merges", m], undefined);
    }
  }

  private removeMerge(sheet: string, zone: Zone) {
    const { left, top, bottom, right } = zone;
    let tl = toXC(left, top);
    const mergeId = this.workbook.mergeCellMap[tl];
    const mergeZone = this.workbook.merges[mergeId];
    if (!isEqual(zone, mergeZone)) {
      throw new Error("Invalid merge zone");
    }
    this.history.updateState(["merges", mergeId], undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.updateState(["mergeCellMap", xc], undefined);
      }
    }
  }

  private removeAllMerges(sheetID: number) {
    for (let id in this.workbook.sheets[sheetID].merges) {
      this.history.updateState(["sheets", sheetID, "merges", id], undefined);
    }
    for (let id in this.workbook.sheets[sheetID].mergeCellMap) {
      this.history.updateState(["sheets", sheetID, "mergeCellMap", id], undefined);
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let [sheetID, sheetData] of sheets.entries()) {
      const sheet = this.workbook.sheets[sheetID];
      if (sheet && sheetData.merges) {
        this.importMerges(sheetID, sheetData.merges);
      }
    }
    this.recomputeSizes();
  }

  importMerges(sheetID: number, merges: string[]) {
    for (let m of merges) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      this.history.updateState(["sheets", sheetID, "merges", id], {
        id,
        left,
        top,
        right,
        bottom,
        topLeft: tl
      });
      for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
          const xc = toXC(col, row);
          this.history.updateState(["sheets", sheetID, "mergeCellMap", xc], id);
        }
      }
    }
  }

  private exportMerges(sheet: Sheet): string[] {
    return Object.values(Object.values(sheet.merges)).map(
      merge => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
    );
  }

  // ---------------------------------------------------------------------------
  // Grid Manipulation
  // ---------------------------------------------------------------------------

  /**
   * Delete column. This requires a lot of handling:
   * - Update the merges
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheetID ID of the sheet on which deletion should be applied
   * @param columns Columns to delete
   */
  private removeColumns(sheetID: number, columns: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (let column of columns) {
      // Remove the merges and adapt them.
      this.updateMergesStyles(sheetID, column, true);
      let merges: string[] = this.exportMerges(this.workbook.sheets[sheetID]);
      this.removeAllMerges(sheetID);
      merges = this.updateMerges(merges, (range: string) => updateRemoveColumns(range, [column]));

      // Update all the formulas.
      this.updateAllFormulasHorizontally(column, -1);

      // Move the cells.
      this.moveCellsHorizontally(column, -1);

      // Effectively delete the element and recompute the left-right.
      this.manageColumnsHeaders(column, -1);

      this.importMerges(sheetID, merges);
    }
  }

  /**
   * Delete row. This requires a lot of handling:
   * - Update the merges
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheetID ID of the sheet on which deletion should be applied
   * @param rows Rows to delete
   */
  private removeRows(sheetID: number, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);
    for (let row of rows) {
      // Remove the merges and adapt them.
      this.updateMergesStyles(sheetID, row, false);
      let merges: string[] = this.exportMerges(this.workbook.sheets[sheetID]);
      this.removeAllMerges(sheetID);
      merges = this.updateMerges(merges, (range: string) => updateRemoveRows(range, [row]));

      // Update all the formulas.
      this.updateAllFormulasVertically(row, -1);

      // Move the cells.
      this.moveCellsVertically(row, -1);

      // Effectively delete the element and recompute the left-right/top-bottom.
      this.processRowsHeaderDelete(row);

      this.importMerges(sheetID, merges);
    }
  }

  private addColumns(
    sheetID: number,
    column: number,
    position: "before" | "after",
    quantity: number
  ) {
    // Remove the merges and adapt them.
    let merges: string[] = this.exportMerges(this.workbook.sheets[sheetID]);
    this.removeAllMerges(sheetID);
    const col = position === "before" ? column : column + 1;
    merges = this.updateMerges(merges, (range: string) => updateAddColumns(range, col, quantity));

    // Update all the formulas.
    this.updateAllFormulasHorizontally(position === "before" ? column - 1 : column, quantity);

    // Move the cells.
    this.moveCellsHorizontally(position === "before" ? column : column + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.manageColumnsHeaders(column, quantity);

    this.importMerges(sheetID, merges);
  }

  private addRows(sheetID: number, row: number, position: "before" | "after", quantity: number) {
    for (let i = 0; i < quantity; i++) {
      this.addEmptyRow();
    }
    // Remove the merges and adapt them.
    let merges: string[] = this.exportMerges(this.workbook.sheets[sheetID]);
    this.removeAllMerges(sheetID);
    const r = position === "before" ? row : row + 1;
    merges = this.updateMerges(merges, (range: string) => updateAddRows(range, r, quantity));

    // Update all the formulas.
    this.updateAllFormulasVertically(position === "before" ? row - 1 : row, quantity);

    // Move the cells.
    this.moveCellsVertically(position === "before" ? row : row + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.processRowsHeaderAdd(row, quantity);

    this.importMerges(sheetID, merges);
  }

  private updateMergesStyles(sheetID: number, index: number, isColumn: boolean) {
    for (let merge of Object.values(this.workbook.merges)) {
      const xc = merge.topLeft;
      const topLeft = this.workbook.cells[xc];
      if (!topLeft) {
        continue;
      }
      let [x, y] = toCartesian(xc);
      if (isColumn && merge.left !== merge.right) {
        x += 1;
      }
      if (!isColumn && merge.top !== merge.bottom) {
        y += 1;
      }
      this.dispatch("UPDATE_CELL", {
        sheet: this.workbook.sheets[sheetID].name,
        col: x,
        row: y,
        style: topLeft.style,
        border: topLeft.border,
        format: topLeft.format
      });
    }
  }

  private updateMerges(merges: string[], updateCb: (range: string) => string | null): string[] {
    const updatedMerges: string[] = [];
    for (let merge of merges) {
      const updatedMerge = updateCb(merge);
      if (updatedMerge) {
        const [tl, br] = updatedMerge.split(":");
        if (tl === br) {
          continue;
        }
        updatedMerges.push(updatedMerge);
      }
    }
    return updatedMerges;
  }

  /**
   * Apply a function to update the formula on every cells of every sheets which
   * contains a formula
   * @param cb Update formula function to apply
   */
  private visitFormulas(cb: (value: string, sheet: string | undefined) => string) {
    for (let sheet of this.workbook.sheets) {
      for (let [xc, cell] of Object.entries(sheet.cells)) {
        if (cell.type === "formula") {
          const content = tokenize(cell.content!)
            .map(t => {
              if (t.type === "SYMBOL" && cellReference.test(t.value)) {
                let [value, sheetRef] = t.value.split("!").reverse();
                if (sheetRef) {
                  sheetRef = sanitizeSheet(sheetRef);
                  if (sheetRef === this.workbook.activeSheet.name) {
                    return cb(value, sheetRef);
                  }
                } else if (this.workbook.activeSheet.name === sheet.name) {
                  return cb(value, undefined);
                }
              }
              return t.value;
            })
            .join("");
          if (content !== cell.content) {
            const [col, row] = toCartesian(xc);
            this.dispatch("UPDATE_CELL", {
              sheet: sheet.name,
              col,
              row,
              content
            });
          }
        }
      }
    }
  }

  private getNewRef(value: string, sheet: string | undefined, x: number, y: number): string {
    const fixedCol = value.startsWith("$");
    const fixedRow = value.includes("$", 1);
    return `${sheet ? sheet + "!" : ""}${fixedCol ? "$" : ""}${numberToLetters(x)}${
      fixedRow ? "$" : ""
    }${String(y + 1)}`;
  }

  private updateAllFormulasHorizontally(base: number, step: number) {
    return this.visitFormulas((value: string, sheet: string | undefined): string => {
      let [x, y] = toCartesian(value);
      if (x === base && step === -1) {
        return "#REF";
      }
      if (x > base) {
        x += step;
      }
      return this.getNewRef(value, sheet, x, y);
    });
  }

  private updateAllFormulasVertically(base: number, step: number) {
    return this.visitFormulas((value: string, sheet: string | undefined): string => {
      let [x, y] = toCartesian(value);
      if (y === base && step === -1) {
        return "#REF";
      }
      if (y > base) {
        y += step;
      }
      return this.getNewRef(value, sheet, x, y);
    });
  }

  private processCellsToMove(
    shouldDelete: (cell: Cell) => boolean,
    shouldAdd: (cell: Cell) => boolean,
    buildCellToAdd: (cell: Cell) => Command
  ) {
    const deleteCommands: Command[] = [];
    const addCommands: Command[] = [];
    for (let [xc, cell] of Object.entries(this.workbook.cells)) {
      if (shouldDelete(cell)) {
        const [col, row] = toCartesian(xc);
        deleteCommands.push({
          type: "CLEAR_CELL",
          sheet: this.workbook.activeSheet.name,
          col,
          row
        });
        if (shouldAdd(cell)) {
          addCommands.push(buildCellToAdd(cell));
        }
      }
    }
    for (let cmd of deleteCommands) {
      this.dispatch(cmd.type, cmd);
    }
    for (let cmd of addCommands) {
      this.dispatch(cmd.type, cmd);
    }
  }

  private moveCellsHorizontally(base: number, step: number) {
    return this.processCellsToMove(
      cell => cell.col >= base,
      cell => cell.col !== base || step !== -1,
      cell => {
        return {
          type: "UPDATE_CELL",
          sheet: this.workbook.activeSheet.name,
          col: cell.col + step,
          row: cell.row,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format
        };
      }
    );
  }

  private moveCellsVertically(base: number, step: number) {
    return this.processCellsToMove(
      cell => cell.row >= base,
      cell => cell.row !== base || step !== -1,
      cell => {
        return {
          type: "UPDATE_CELL",
          sheet: this.workbook.activeSheet.name,
          col: cell.col,
          row: cell.row + step,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format
        };
      }
    );
  }

  private manageColumnsHeaders(base: number, step: number) {
    const cols: Col[] = [];
    let left = 0;
    let colIndex = 0;
    let newWidth = this.width;
    for (let i in this.workbook.cols) {
      if (parseInt(i) === base) {
        if (step !== -1) {
          const { size } = this.workbook.cols[colIndex];
          for (let a = 0; a < step; a++) {
            cols.push({
              name: numberToLetters(colIndex),
              size,
              left,
              right: left + size
            });
            newWidth = newWidth + size;
            left += size;
            colIndex++;
          }
        } else {
          const size = this.workbook.cols[colIndex].size;
          newWidth = newWidth - size;
          continue;
        }
      }
      const { size } = this.workbook.cols[i];
      cols.push({
        name: numberToLetters(colIndex),
        size,
        left,
        right: left + size
      });
      left += size;
      colIndex++;
    }
    this.history.updateLocalState(["width"], newWidth);
    this.history.updateState(["cols"], cols);
  }

  private processRowsHeaderDelete(index: number) {
    const rows: Row[] = [];
    let top = 0;
    let rowIndex = 0;
    let sizeToDelete = 0;
    const cellsQueue = this.workbook.rows.map(row => row.cells);
    for (let i in this.workbook.rows) {
      const row = this.workbook.rows[i];
      const { size } = row;
      if (parseInt(i) === index) {
        sizeToDelete = size;
        continue;
      }
      rowIndex++;
      rows.push({
        top,
        bottom: top + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex)
      });
      top += size;
    }
    this.history.updateLocalState(["height"], this.height - sizeToDelete);
    this.history.updateState(["rows"], rows);
  }

  private processRowsHeaderAdd(index: number, quantity: number) {
    const rows: Row[] = [];
    let top = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = this.workbook.rows.map(row => row.cells);
    for (let i in this.workbook.rows) {
      const { size } = this.workbook.rows[sizeIndex];
      if (parseInt(i) < index || parseInt(i) >= index + quantity) {
        sizeIndex++;
      }
      rowIndex++;
      rows.push({
        top,
        bottom: top + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex)
      });
      top += size;
    }
    this.history.updateLocalState(["height"], top);
    this.history.updateState(["rows"], rows);
  }

  private addEmptyRow() {
    const lastBottom = this.workbook.rows[this.workbook.rows.length - 1].bottom;
    const name = (this.workbook.rows.length + 1).toString();
    const newRows: Row[] = this.workbook.rows.slice();
    const size = 0;
    newRows.push({
      top: lastBottom,
      bottom: lastBottom + size,
      size,
      name,
      cells: {}
    });
    const sheetID = this.workbook.sheets.findIndex(s => s.name === this.workbook.activeSheet.name)!;
    this.history.updateLocalState(["height"], this.height + size);
    this.history.updateState(["rows"], newRows);
    this.history.updateState(["sheets", sheetID, "rows"], newRows);
  }
}
