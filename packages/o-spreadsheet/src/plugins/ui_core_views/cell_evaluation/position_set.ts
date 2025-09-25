import { CellPosition, UID } from "../../../types";
import { BinaryGrid } from "./binary_grid";

export type SheetSizes = Record<UID, { rows: number; cols: number }>;

export class PositionSet {
  private sheets: Record<UID, BinaryGrid> = {};
  /**
   * List of positions in the order they were inserted.
   */
  private insertions: CellPosition[] = [];
  private maxSize: number = 0;

  constructor(sheetSizes: SheetSizes) {
    for (const sheetId in sheetSizes) {
      const cols = sheetSizes[sheetId].cols;
      const rows = sheetSizes[sheetId].rows;
      this.maxSize += cols * rows;
      this.sheets[sheetId] = BinaryGrid.create(rows, cols);
    }
  }

  add(position: CellPosition) {
    const hasBeenInserted = this.sheets[position.sheetId].setValue(position, 1);
    if (hasBeenInserted) {
      this.insertions.push(position);
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
    const insertions = [...this];
    this.insertions = [];
    for (const sheetId in this.sheets) {
      this.sheets[sheetId].clear();
    }
    return insertions;
  }

  isEmpty() {
    if (this.insertions.length === 0) {
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
    this.insertions = new Array<CellPosition>(this.maxSize);
    let index = 0;
    for (const sheetId in this.sheets) {
      const grid = this.sheets[sheetId];
      grid.fillAllPositions();
      for (let i = 0; i < grid.rows; i++) {
        for (let j = 0; j < grid.cols; j++) {
          this.insertions[index++] = { sheetId, row: i, col: j };
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
    for (const position of this.insertions) {
      if (this.sheets[position.sheetId].getValue(position) === 1) {
        yield position;
      }
    }
  }
}
