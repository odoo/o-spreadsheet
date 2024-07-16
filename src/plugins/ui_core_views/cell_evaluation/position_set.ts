import { positionToZone, ZoneGrid } from "../../../helpers";
import { CellPosition, UID, Zone } from "../../../types";
// import { BinaryGrid } from "./binary_grid";
import { RTreeBoundingBox } from "./r_tree";

export type SheetSizes = Record<UID, { rows: number; cols: number }>;

export class PositionSet {
  // private sheets: Record<UID, BinaryGrid> = {};
  private sheets: Record<UID, ZoneGrid> = {};
  /**
   * List of positions in the order they were inserted.
   */
  // private insertions: CellPosition[] = [];
  // private maxSize: number = 0;
  private insertions: RTreeBoundingBox[] = [];

  constructor(sheetSizes: SheetSizes) {
    for (const sheetId in sheetSizes) {
      const cols = sheetSizes[sheetId].cols;
      const rows = sheetSizes[sheetId].rows;
      // this.maxSize += cols * rows;
      // this.sheets[sheetId] = BinaryGrid.create(rows, cols);

      this.sheets[sheetId] = new ZoneGrid(rows, cols);
    }
  }

  addBoundingBox(boundingBox: RTreeBoundingBox) {
    const zonesActuallyAdded = this.sheets[boundingBox.sheetId].addZone(boundingBox.zone);
    for (const zone of zonesActuallyAdded) {
      this.insertions.push({ sheetId: boundingBox.sheetId, zone });
    }
  }

  add(position: CellPosition) {
    // const hasBeenInserted = this.sheets[position.sheetId].setValue(position, 1);
    // if (hasBeenInserted) {
    //   this.insertions.push(position);
    // }
    this.addBoundingBox({ sheetId: position.sheetId, zone: positionToZone(position) });
  }

  addMany(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.add(position);
    }
  }

  deleteBoundingBox(boundingBox: RTreeBoundingBox) {
    this.sheets[boundingBox.sheetId].removeZone(boundingBox.zone);
  }

  delete(position: CellPosition) {
    // this.sheets[position.sheetId].setValue(position, 0);
    this.deleteBoundingBox({ sheetId: position.sheetId, zone: positionToZone(position) });
  }

  deleteMany(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.delete(position);
    }
  }

  has(position: CellPosition) {
    // return this.sheets[position.sheetId].getValue(position) === 1;
    return this.sheets[position.sheetId].getIntersectionWith(positionToZone(position)).length > 0;
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
    // this.insertions = new Array<CellPosition>(this.maxSize);
    this.insertions = [];
    // let index = 0;
    for (const sheetId in this.sheets) {
      const grid = this.sheets[sheetId];

      // grid.fillAllPositions();
      // for (let i = 0; i < grid.rows; i++) {
      //   for (let j = 0; j < grid.cols; j++) {
      //     this.insertions[index++] = { sheetId, row: i, col: j };
      //   }
      // }

      const zone: Zone = {
        left: 0,
        right: grid.cols - 1,
        top: 0,
        bottom: grid.rows - 1,
      };
      grid.addZone(zone);
      this.insertions.push({ sheetId, zone });
    }
  }

  /**
   * Iterate over the positions in the order of insertion.
   * Note that the same position may be yielded multiple times if the value was added
   * to the set then removed and then added again.
   */
  *[Symbol.iterator](): Generator<CellPosition> {
    // for (const position of this.insertions) {
    //   if (this.sheets[position.sheetId].getValue(position) === 1) {
    //     yield position;
    //   }
    // }
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
