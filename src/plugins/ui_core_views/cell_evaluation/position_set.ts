import { positionToZone, ZoneGrid } from "../../../helpers";
import { CellPosition, UID } from "../../../types";
import { BinaryGrid } from "./binary_grid";
import { RTreeBoundingBox } from "./r_tree";

export type SheetSizes = Record<UID, { rows: number; cols: number }>;

export class PositionSet {
  private sheets: Record<UID, BinaryGrid> = {};
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
    this.sheets[position.sheetId].setValue(position, 1);
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
    return this.sheets[position.sheetId]?.getValue(position) === 1;
  }

  clear(): CellPosition[] {
    const insertions = [...this];
    for (const sheetId in this.sheets) {
      this.sheets[sheetId].clear();
    }
    return insertions;
  }

  isEmpty() {
    for (const sheetId in this.sheets) {
      if (!this.sheets[sheetId].isEmpty()) {
        return false;
      }
    }
    return true;
  }

  fillAllPositions() {
    for (const sheetId in this.sheets) {
      const grid = this.sheets[sheetId];
      grid.fillAllPositions();
    }
  }

  /**
   * Iterate over the positions in the order of insertion.
   * Note that the same position may be yielded multiple times if the value was added
   * to the set then removed and then added again.
   */
  *[Symbol.iterator](): Generator<CellPosition> {
    for (const sheetId in this.sheets) {
      const grid = this.sheets[sheetId];
      for (let i = 0; i < grid.rows; i++) {
        for (let j = 0; j < grid.cols; j++) {
          const position = { sheetId, row: i, col: j };
          if (this.has(position)) {
            yield position;
          }
        }
      }
    }
  }
}

export class ZoneSet {
  private sheets: Record<UID, ZoneGrid> = {};
  /**
   * List of positions in the order they were inserted.
   */
  private insertions: RTreeBoundingBox[] = [];

  constructor(sheetIds: UID[]) {
    for (const sheetId of sheetIds) {
      this.sheets[sheetId] = new ZoneGrid();
    }
  }

  addBoundingBox(boundingBox: RTreeBoundingBox) {
    const zonesActuallyAdded = this.sheets[boundingBox.sheetId].addZone(boundingBox.zone);
    for (const zone of zonesActuallyAdded) {
      this.insertions.push({ sheetId: boundingBox.sheetId, zone });
    }
  }

  deleteBoundingBox(boundingBox: RTreeBoundingBox) {
    this.sheets[boundingBox.sheetId].removeZone(boundingBox.zone);
  }

  has(position: CellPosition) {
    return this.sheets[position.sheetId].getIntersectionWith(positionToZone(position)).length > 0;
  }

  /**
   * Iterate over the positions in the order of insertion.
   * Note that the same position may be yielded multiple times if the value was added
   * to the set then removed and then added again.
   */
  *[Symbol.iterator](): Generator<CellPosition> {
    for (const boundingBox of this.insertions) {
      const intersectedZones = this.sheets[boundingBox.sheetId].getIntersectionWith(
        boundingBox.zone
      );
      for (const zone of intersectedZones) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            yield { sheetId: boundingBox.sheetId, col, row };
          }
        }
      }
    }
  }
}
