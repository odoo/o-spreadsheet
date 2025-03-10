import { CellPosition, UID } from "../../../types";
import { BinaryGrid } from "./binary_grid";

export type SheetSizes = Record<UID, { rows: number; cols: number }>;

export class PositionSet {
  private sheets: Record<UID, BinaryGrid> = {};

  // The following arrays are used to store the positions in the order of insertion.
  // Using separate arrays for sheet IDs, rows, and columns instead of an array of position objects is preferable for performance reasons.
  private sheetIds: string[];
  private rows: Int32Array;
  private cols: Int32Array;
  private length: number = 0;

  private maxSize: number = 0;

  constructor(sheetSizes: SheetSizes) {
    for (const sheetId in sheetSizes) {
      const { cols, rows } = sheetSizes[sheetId];
      this.maxSize += cols * rows;
      this.sheets[sheetId] = BinaryGrid.create(rows, cols);
    }

    this.sheetIds = new Array<string>(this.maxSize);
    this.rows = new Int32Array(this.maxSize);
    this.cols = new Int32Array(this.maxSize);
  }

  add(position: CellPosition) {
    const hasBeenInserted = this.sheets[position.sheetId].setValue(position, 1);
    if (hasBeenInserted) {
      this.sheetIds[this.length] = position.sheetId;
      this.rows[this.length] = position.row;
      this.cols[this.length] = position.col;
      this.length++;
    }
  }

  addMany(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.add(position);
    }
  }

  delete(position: CellPosition) {
    this.sheets[position.sheetId].setValue(position, 0);
  }

  deleteMany(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.delete(position);
    }
  }

  has(position: CellPosition) {
    return this.sheets[position.sheetId].getValue(position) === 1;
  }

  clear(): CellPosition[] {
    const insertions: CellPosition[] = [];
    for (let i = 0; i < this.length; i++) {
      insertions.push({
        sheetId: this.sheetIds[i],
        row: this.rows[i],
        col: this.cols[i],
      });
    }

    this.length = 0;
    for (const sheetId in this.sheets) {
      this.sheets[sheetId].clear();
    }

    return insertions;
  }

  isEmpty() {
    if (this.length === 0) {
      return true;
    }
    for (const sheetId in this.sheets) {
      if (!this.sheets[sheetId].isEmpty()) {
        return false;
      }
    }
    return true;
  }

  fillAllPositions() {
    this.length = 0;
    for (const sheetId in this.sheets) {
      const grid = this.sheets[sheetId];
      grid.fillAllPositions();
      for (let i = 0; i < grid.rows; i++) {
        for (let j = 0; j < grid.cols; j++) {
          this.sheetIds[this.length] = sheetId;
          this.rows[this.length] = i;
          this.cols[this.length] = j;
          this.length++;
        }
      }
    }
  }

  /**
   * Iterate over the positions in the order of insertion.
   * Note that the same position may be yielded multiple times if the value was added
   * to the set then removed and then added again.
   */
  *[Symbol.iterator](): Generator<CellPosition> {
    for (let i = 0; i < this.length; i++) {
      const position: CellPosition = {
        sheetId: this.sheetIds[i],
        row: this.rows[i],
        col: this.cols[i],
      };
      if (this.sheets[position.sheetId].getValue(position) === 1) {
        yield position;
      }
    }
  }
}
