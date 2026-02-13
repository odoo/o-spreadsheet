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
    this.rTree = new SpreadsheetRTree();
    this.itemsBeforeNextSearch = items;
    this.bulkInsert();
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
    const groupedByBBox = groupSameBoundingBoxes(this.itemsBeforeNextSearch);
    this.itemsBeforeNextSearch = [];

    for (const [sheetId, sheetMap] of groupedByBBox.entries()) {
      const restItems: RangeSetItem[] = [];
      for (const item of sheetMap.values()) {
        const existingItems = this.rTree.search(item.boundingBox);
        const existingItem = existingItems.find(
          ({ boundingBox }) =>
            boundingBox.sheetId === item.boundingBox.sheetId &&
            boundingBox.zone.left === item.boundingBox.zone.left &&
            boundingBox.zone.top === item.boundingBox.zone.top &&
            boundingBox.zone.right === item.boundingBox.zone.right &&
            boundingBox.zone.bottom === item.boundingBox.zone.bottom
        );
        if (existingItem) {
          existingItem.data.addMany(item.data);
        } else {
          restItems.push(item);
        }
      }
      this.rTree.loadBySheet(sheetId, restItems);
    }
  }
}

type GroupedByBBox = Map<UID, Map<number | string, RangeSetItem>>;

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
function groupSameBoundingBoxes(items: RTreeRangeItem[]): GroupedByBBox {
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

  // Use Map instead of plain objects for better key handling and performance
  const groupedByBBox: GroupedByBBox = new Map();
  const mult1 = maxCol * maxRow;
  const mult2 = mult1 * maxCol;

  for (const item of items) {
    const boundingBox = item.boundingBox;
    const sheetId = boundingBox.sheetId;
    const zone = boundingBox.zone;
    const bBoxKey = useFastKey
      ? zone.left + zone.top * maxCol + zone.right * mult1 + zone.bottom * mult2
      : `${zone.left},${zone.top},${zone.right},${zone.bottom}`;

    if (!groupedByBBox.has(sheetId)) {
      groupedByBBox.set(sheetId, new Map());
    }
    const sheetMap = groupedByBBox.get(sheetId)!;
    if (sheetMap.has(bBoxKey)) {
      sheetMap.get(bBoxKey)!.data.add(item.data);
    } else {
      sheetMap.set(bBoxKey, {
        boundingBox,
        data: new RangeSet([item.data]),
      });
    }
  }

  return groupedByBBox;
}
