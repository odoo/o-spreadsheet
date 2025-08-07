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

export type AddOnlyPositionSet = Omit<PositionSet, "delete" | "deleteMany">;

export class FilledPositionSet implements AddOnlyPositionSet {
  constructor(private sheetSizes: SheetSizes) {}

  add(position: CellPosition): void {}

  addMany(positions: Iterable<CellPosition>): void {}

  has(position: CellPosition): boolean {
    return true;
  }

  isEmpty(): boolean {
    return false;
  }

  *[Symbol.iterator](): Generator<CellPosition> {
    for (const sheetId in this.sheetSizes) {
      const { rows, cols } = this.sheetSizes[sheetId];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          yield { sheetId, row: i, col: j };
        }
      }
    }
  }
}
