import RBush from "rbush";

import { UID, Zone } from "../../../types";

/**
 * R-Tree Data Structure
 *
 * R-Tree is a spatial data structure used for efficient indexing and querying
 * of multi-dimensional objects, particularly in geometric and spatial applications.
 *
 * It organizes objects into a tree hierarchy, grouping nearby objects together
 * in bounding boxes. Each node in the tree represents a bounding box that
 * contains its child nodes or leaf objects. This hierarchical structure allows
 * for faster spatial queries.
 *
 * @see https://en.wikipedia.org/wiki/R-tree
 *
 * Consider a 2D Space with four zones: A, B, C, D
 * +--------------------------+
 * |                          |
 * |   +---+     +-------+    |
 * |   | A |     |   B   |    |
 * |   +---+     +-------+    |
 * |                          |
 * |                          |
 * |          +---+           |
 * |          | C |           |
 * |          +---+           |
 * |      +-----------+       |
 * |      |     D     |       |
 * |      +-----------+       |
 * |                          |
 * +--------------------------+
 *
 * It groups together zones that are spatially close into a minimum bounding box.
 * For example, A and B are grouped together in rectangle R1, and C and D are grouped
 * in R2.
 *
 * R0
 * +--------------------------+
 * |   R1                     |
 * |   +-----------------+    |
 * |   | A |     |   B   |    |
 * |   +-----------------+    |
 * |                          |
 * |      R2                  |
 * |      +---+---+---+       |
 * |      |   | C |   |       |
 * |      |   +---+   |       |
 * |      +-----------+       |
 * |      |     D     |       |
 * |      +-----------+       |
 * |                          |
 * +--------------------------+
 *
 * The tree would look like this:
 *          R0
 *         /  \
 *        /    \
 *       R1     R2
 *       |      |
 *      A,B    C,D

 * Choosing how to group the zones is crucial for the performance of the tree.
 * Key considerations include avoiding excessive empty space coverage and minimizing overlap
 * to reduce the number of subtrees processed during searches.
 *
 * Various heuristics exist for determining the optimal grouping strategy, such as "least enlargement"
 * which prioritizes grouping nodes resulting in the smallest increase in bounding box size. In cases where
 * the choice cannot be made based on this criterion due to the same enlargement for different groupings,
 * we then evaluate "least area," aiming to minimize the overall area of bounding boxes.
 *
 * This implementation is tailored for spreadsheet use, indexing objects associated
 * with a zone and a sheet.
 *
 * It uses the RBush library under the hood. One 2D RBush R-tree per sheet.
 * @see https://github.com/mourner/rbush
 */
export class SpreadsheetRTree<T> {
  /**
   * One 2D R-tree per sheet
   */
  private rTrees: Record<UID, RBush<RTreeItem<T>>> = {};

  /**
   * Bulk-inserts the given items into the tree. Bulk insertion is usually ~2-3 times
   * faster than inserting items one by one. After bulk loading (bulk insertion into
   * an empty tree), subsequent query performance is also ~20-30% better.
   */
  constructor(items: Iterable<RTreeItem<T>> = []) {
    const rangesPerSheet = {};
    for (const item of items) {
      const sheetId = item.boundingBox.sheetId;
      if (!rangesPerSheet[sheetId]) {
        rangesPerSheet[sheetId] = [];
      }
      rangesPerSheet[sheetId].push(item);
    }
    for (const sheetId in rangesPerSheet) {
      this.rTrees[sheetId] = new ZoneRBush();
      this.rTrees[sheetId].load(rangesPerSheet[sheetId]); // bulk-insert
    }
  }

  insert(item: RTreeItem<T>) {
    const sheetId = item.boundingBox.sheetId;
    if (!this.rTrees[sheetId]) {
      this.rTrees[sheetId] = new ZoneRBush();
    }
    this.rTrees[sheetId].insert(item);
  }

  search({ zone, sheetId }: RTreeBoundingBox): RTreeItem<T>[] {
    if (!this.rTrees[sheetId]) {
      return [];
    }
    return this.rTrees[sheetId].search({
      minX: zone.left,
      minY: zone.top,
      maxX: zone.right,
      maxY: zone.bottom,
    });
  }

  remove(item: RTreeItem<T>) {
    const sheetId = item.boundingBox.sheetId;
    if (!this.rTrees[sheetId]) {
      return;
    }
    this.rTrees[sheetId].remove(item, this.rtreeItemComparer);
  }

  private rtreeItemComparer(left: RTreeItem<T>, right: RTreeItem<T>) {
    return (
      left.data === right.data &&
      left.boundingBox.sheetId === right.boundingBox.sheetId &&
      left.boundingBox?.zone.left === right.boundingBox.zone.left &&
      left.boundingBox?.zone.top === right.boundingBox.zone.top &&
      left.boundingBox?.zone.right === right.boundingBox.zone.right &&
      left.boundingBox?.zone.bottom === right.boundingBox.zone.bottom
    );
  }
}

/**
 * RBush extension to use zones as bounding boxes
 */
class ZoneRBush<T> extends RBush<RTreeItem<T>> {
  toBBox({ boundingBox }: RTreeItem) {
    const zone = boundingBox.zone;
    return {
      minX: zone.left,
      minY: zone.top,
      maxX: zone.right,
      maxY: zone.bottom,
    };
  }
  compareMinX(a: RTreeItem, b: RTreeItem) {
    return a.boundingBox.zone.left - b.boundingBox.zone.left;
  }
  compareMinY(a: RTreeItem, b: RTreeItem) {
    return a.boundingBox.zone.top - b.boundingBox.zone.top;
  }
}

/**
 * Data associated with a range to be indexed in a R-tree
 */
export interface RTreeItem<T = unknown> {
  /**
   * A bounding box to locate the item in the space
   */
  boundingBox: RTreeBoundingBox;
  /**
   * Any arbitrary data associated with the bounding box
   */
  data: T;
}

export interface RTreeBoundingBox {
  sheetId: UID;
  zone: Zone;
}
