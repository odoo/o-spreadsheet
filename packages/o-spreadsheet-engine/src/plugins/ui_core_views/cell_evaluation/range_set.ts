import { CellPosition, UID } from "../../..";
import { positionToBoundedRange } from "../../../helpers/range";
import { BoundedRange } from "../../../types/range";
import { ZoneSet } from "./zone_set";

export class RangeSet {
  private setsBySheetId: Record<UID, ZoneSet> = {};

  constructor(ranges: Iterable<BoundedRange> = []) {
    for (const range of ranges) {
      this.add(range);
    }
  }

  add(range: BoundedRange) {
    if (!this.setsBySheetId[range.sheetId]) {
      this.setsBySheetId[range.sheetId] = new ZoneSet();
    }
    this.setsBySheetId[range.sheetId].add(range.zone);
  }

  addMany(ranges: Iterable<BoundedRange>) {
    for (const range of ranges) {
      this.add(range);
    }
  }

  addPosition(position: CellPosition) {
    this.add(positionToBoundedRange(position));
  }

  addManyPositions(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.addPosition(position);
    }
  }

  has(range: BoundedRange): boolean {
    if (!this.setsBySheetId[range.sheetId]) {
      return false;
    }
    return this.setsBySheetId[range.sheetId].has(range.zone);
  }

  hasPosition(position: CellPosition): boolean {
    return this.has(positionToBoundedRange(position));
  }

  delete(range: BoundedRange) {
    if (!this.setsBySheetId[range.sheetId]) {
      return;
    }
    this.setsBySheetId[range.sheetId].delete(range.zone);
  }

  deleteMany(ranges: Iterable<BoundedRange>) {
    for (const range of ranges) {
      this.delete(range);
    }
  }

  deleteManyPositions(positions: Iterable<CellPosition>) {
    for (const position of positions) {
      this.delete(positionToBoundedRange(position));
    }
  }

  difference(other: RangeSet): RangeSet {
    const result = new RangeSet();
    for (const sheetId in this.setsBySheetId) {
      result.setsBySheetId[sheetId] = this.setsBySheetId[sheetId];
    }
    for (const sheetId in other.setsBySheetId) {
      if (result.setsBySheetId[sheetId]) {
        result.setsBySheetId[sheetId] = result.setsBySheetId[sheetId].difference(
          other.setsBySheetId[sheetId]
        );
      }
    }
    return result;
  }

  copy(): RangeSet {
    const result = new RangeSet();
    for (const sheetId in this.setsBySheetId) {
      result.setsBySheetId[sheetId] = this.setsBySheetId[sheetId].copy();
    }
    return result;
  }

  clear() {
    this.setsBySheetId = {};
  }

  size(): number {
    let size = 0;
    for (const sheetId in this.setsBySheetId) {
      size += this.setsBySheetId[sheetId].size();
    }
    return size;
  }

  positionSize(): number {
    let size = 0;
    for (const sheetId in this.setsBySheetId) {
      size += this.setsBySheetId[sheetId].positionSize();
    }
    return size;
  }

  isEmpty(): boolean {
    for (const sheetId in this.setsBySheetId) {
      if (!this.setsBySheetId[sheetId].isEmpty()) {
        return false;
      }
    }
    return true;
  }

  /**
   * iterator of all the ranges in the RangeSet
   */
  [Symbol.iterator](): IterableIterator<BoundedRange> {
    const result: BoundedRange[] = [];
    for (const sheetId in this.setsBySheetId) {
      for (const zone of this.setsBySheetId[sheetId]) {
        result.push({ sheetId: sheetId, zone });
      }
    }
    return result[Symbol.iterator]();
  }
}
