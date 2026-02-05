import { UID } from "../../..";
import { BoundedRange } from "../../../types/range";
import { RTreeBoundingBox, RTreeItem, SpreadsheetRTree } from "./r_tree";
import { RangeSet } from "./range_set";

interface RangeSetItem {
  boundingBox: RTreeBoundingBox;
  data: RangeSet;
}

export type RTreeRangeItem = RTreeItem<BoundedRange>;

/**
 * R-Tree of ranges, mapping zones (r-tree bounding boxes) to ranges (data of the r-tree item).
 * Ranges associated to the exact same bounding box are grouped together
 * to reduce the number of nodes in the R-tree.
 */
export class DependenciesRTree {
  private readonly rTree: SpreadsheetRTree<RangeSet>;

  constructor(items: RTreeRangeItem[] = []) {
    const compactedBoxes = groupSameBoundingBoxes(items);
    this.rTree = new SpreadsheetRTree(compactedBoxes);
  }

  private itemsBeforeNextSearch: RTreeRangeItem[] = [];

  insert(item: RTreeRangeItem) {
    this.itemsBeforeNextSearch.push(item);
  }

  search({ zone, sheetId }: RTreeBoundingBox): RangeSet {
    this.bulkInsert();
    const results: RangeSet = new RangeSet();
    for (const { data } of this.rTree.search({ zone, sheetId })) {
      results.addMany(data);
    }
    return results;
  }

  remove(item: RTreeRangeItem) {
    this.bulkInsert();
    const data = this.rTree.search(item.boundingBox);
    const itemBoundingBox = item.boundingBox;
    const exactBoundingBox = data.find(
      ({ boundingBox }) =>
        boundingBox.sheetId === itemBoundingBox.sheetId &&
        boundingBox.zone.left === itemBoundingBox.zone.left &&
        boundingBox.zone.top === itemBoundingBox.zone.top &&
        boundingBox.zone.right === itemBoundingBox.zone.right &&
        boundingBox.zone.bottom === itemBoundingBox.zone.bottom
    );
    if (exactBoundingBox) {
      exactBoundingBox.data.delete(item.data);
    } else {
      this.rTree.remove({ ...item, data: new RangeSet([item.data]) });
    }
  }

  private bulkInsert() {
    if (this.itemsBeforeNextSearch.length === 0) {
      return;
    }
    const compactedBoxes = groupSameBoundingBoxes(this.itemsBeforeNextSearch);
    this.rTree.load(compactedBoxes);
    this.itemsBeforeNextSearch = [];
  }
}

/**
 * Group together all formulas pointing to the exact same dependency (bounding box).
 * The goal is to optimize the following case:
 * - if any cell in B1:B1000 changes, C1 must be recomputed
 * - if any cell in B1:B1000 changes, C2 must be recomputed
 * - if any cell in B1:B1000 changes, C3 must be recomputed
 * ...
 * - if any cell in B1:B1000 changes, C1000 must be recomputed
 *
 * Instead of having 1000 entries in the R-tree, we want to have a single entry
 * with B1:B1000 (bounding box) pointing to C1:C1000 (formulas).
 */
function groupSameBoundingBoxes(items: RTreeRangeItem[]): RangeSetItem[] {
  // Important: this function must be as fast as possible. It is on the evaluation hot path.
  let maxCol = 0;
  let maxRow = 0;
  for (let i = 0; i < items.length; i++) {
    const zone = items[i].boundingBox.zone;
    if (zone.right > maxCol) {
      maxCol = zone.right;
    }
    if (zone.bottom > maxRow) {
      maxRow = zone.bottom;
    }
  }
  maxCol += 1;
  maxRow += 1;

  // in most real-world cases, we can use a fast numeric key
  // but if the zones are too far right or bottom, we fallback to a slower string key
  const maxPossibleKey = (((maxRow + 1) * maxCol + 1) * maxRow + 1) * maxCol;
  const useFastKey = maxPossibleKey <= Number.MAX_SAFE_INTEGER;
  if (!useFastKey) {
    console.warn("Max col/row size exceeded, using slow zone key");
  }
  const groupedByBBox: Record<UID, Record<string, RangeSetItem>> = {};
  for (const item of items) {
    const sheetId = item.boundingBox.sheetId;
    if (!groupedByBBox[sheetId]) {
      groupedByBBox[sheetId] = {};
    }
    const bBox = item.boundingBox.zone;
    let bBoxKey: number | string = 0;
    if (useFastKey) {
      bBoxKey =
        bBox.left +
        bBox.top * maxCol +
        bBox.right * maxCol * maxRow +
        bBox.bottom * maxCol * maxRow * maxCol;
    } else {
      bBoxKey = `${bBox.left},${bBox.top},${bBox.right},${bBox.bottom}`;
    }
    if (groupedByBBox[sheetId][bBoxKey]) {
      const ranges = groupedByBBox[sheetId][bBoxKey].data;
      ranges.add(item.data);
    } else {
      groupedByBBox[sheetId][bBoxKey] = {
        boundingBox: item.boundingBox,
        data: new RangeSet([item.data]),
      };
    }
  }
  const result: RangeSetItem[] = [];
  for (const sheetId in groupedByBBox) {
    const map = groupedByBBox[sheetId];
    for (const key in map) {
      result.push(map[key]);
    }
  }
  return result;
}
