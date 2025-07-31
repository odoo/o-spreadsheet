import { CellPosition, UID } from "../../../types";
import { SparseBinaryGrid } from "./binary_grid";

export type SheetSizes = Record<UID, { rows: number; cols: number }>;

export class PositionSet {
  private sheets: Record<UID, SparseBinaryGrid> = {};
  /**
   * List of positions in the order they were inserted.
   */
  private insertions: CellPosition[] = [];
  private maxSize: number = 0;
  private sheetSizes: SheetSizes = {};

  constructor(sheetSizes: SheetSizes) {
    this.sheetSizes = sheetSizes;
    for (const sheetId in sheetSizes) {
      const cols = sheetSizes[sheetId].cols;
      const rows = sheetSizes[sheetId].rows;
      this.maxSize += cols * rows;
      this.sheets[sheetId] = new SparseBinaryGrid(rows, cols);
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
      this.sheets[sheetId].fillAllPositions();
      const sheetSize = this.sheetSizes[sheetId];
      for (let i = 0; i < sheetSize.rows; i++) {
        for (let j = 0; j < sheetSize.cols; j++) {
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
