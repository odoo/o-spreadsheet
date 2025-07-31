import { CellPosition, UID } from "../../../types/misc";
import { SparseBinaryGrid } from "./binary_grid";

export class PositionSet {
  private sheets: Record<UID, SparseBinaryGrid> = {};
  /**
   * List of positions in the order they were inserted.
   */
  private insertions: CellPosition[] = [];

  constructor(sheetIds: UID[] = []) {
    for (const sheetId of sheetIds) {
      this.sheets[sheetId] = new SparseBinaryGrid();
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
