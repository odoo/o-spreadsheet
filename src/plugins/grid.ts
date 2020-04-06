import { isEqual, toCartesian, toXC, union } from "../helpers/index";
import { BasePlugin } from "../base_plugin";
import { Cell, GridCommand, Sheet, Zone, WorkbookData } from "../types/index";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";

const MIN_PADDING = 3;

export class GridPlugin extends BasePlugin {
  static getters = ["getColSize", "getRowSize", "isMergeDestructive", "expandZone", "getGridSize"];

  nextId: number = 1;
  private width: number = 0;
  private height: number = 0;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  handle(cmd: GridCommand) {
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
          this.dispatch({
            type: "CLEAR_CELL",
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

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let [i, sheetData] of sheets.entries()) {
      const sheet = this.workbook.sheets[i];
      if (sheet && sheetData.merges) {
        this.importSheet(sheet, sheetData.merges);
      }
    }
    this.recomputeSizes();
  }

  importSheet(sheet: Sheet, merges: string[]) {
    for (let m of merges) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      sheet.merges[id] = {
        id,
        left,
        top,
        right,
        bottom,
        topLeft: tl
      };
      for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
          const xc = toXC(col, row);
          sheet.mergeCellMap[xc] = id;
        }
      }
    }
  }
}
