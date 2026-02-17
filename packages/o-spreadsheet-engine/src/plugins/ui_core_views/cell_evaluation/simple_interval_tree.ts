import { CellPosition, HeaderIndex, UID } from "../../..";
import { positionToZone } from "../../../helpers/zones";
import { BoundedRange } from "../../../types/range";
import { RTreeBoundingBox, RTreeItem } from "./r_tree";
import { RangeSet } from "./range_set";

export interface Interval {
  top: number;
  bottom: number;
  dependents?: BoundedRange;
}

class IntervalNode {
  max: number;

  constructor(
    public interval: Interval,
    public left: IntervalNode | null = null,
    public right: IntervalNode | null = null
  ) {
    this.max = interval.bottom;
  }
}

export class ForestDependencyGraph {
  // one interval tree per column. Each tree contains intervals corresponding to the rows of the dependencies in that column.
  private forest: Record<UID, Record<HeaderIndex, IntervalTree>> = {};

  constructor(data: RTreeItem<BoundedRange>[] = []) {
    for (const item of data) {
      const { sheetId, zone } = item.boundingBox;
      for (let col = zone.left; col <= zone.right; col++) {
        let tree = this.forest[sheetId]?.[col];
        if (!tree) {
          tree = new IntervalTree();
          if (!this.forest[sheetId]) {
            this.forest[sheetId] = {};
          }
          this.forest[sheetId][col] = tree;
        }
        tree.insert({ top: zone.top, bottom: zone.bottom, dependents: item.data });
      }
    }
  }

  removeAllDependencies(formulaPosition: CellPosition) {
    // TODO
  }

  addDependencies(formulaPosition: CellPosition, dependencies: RTreeBoundingBox[]): void {
    const dependentsRange = {
      zone: positionToZone(formulaPosition),
      sheetId: formulaPosition.sheetId,
    };
    for (const { zone, sheetId } of dependencies) {
      for (let col = zone.left; col <= zone.right; col++) {
        let columnTree = this.forest[sheetId]?.[col];
        if (!columnTree) {
          columnTree = new IntervalTree();
          if (!this.forest[sheetId]) {
            this.forest[sheetId] = {};
          }
          this.forest[sheetId][col] = columnTree;
        }
        columnTree.insert({ top: zone.top, bottom: zone.bottom, dependents: dependentsRange });
      }
    }
  }

  // getCellsDependingOn(ranges: Iterable<BoundedRange>, visited = new RangeSet()): RangeSet {
  //   visited = visited.copy();
  //   const queue: BoundedRange[] = Array.from(ranges).reverse();
  //   while (queue.length > 0) {
  //     const range = queue.pop()!;
  //     visited.add(range);
  //     const graph = this.forest[range.sheetId];
  //     if (!graph) {
  //       continue;
  //     }
  //     const impactedZones = graph.getRangeDependents([range.zone]);
  //     queue.push(...impactedZones.difference(visited));
  //   }

  //   // remove initial ranges
  //   for (const range of ranges) {
  //     visited.delete(range);
  //   }
  //   return visited;
  // }

  getCellsDependingOn(ranges: Iterable<BoundedRange>, visited = new RangeSet()): RangeSet {
    visited = visited.copy();
    const queue: BoundedRange[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.add(range);
      const zone = range.zone;
      const graph = this.forest[range.sheetId];
      if (!graph) {
        continue;
      }
      for (let col = zone.left; col <= zone.right; col++) {
        const tree = graph[col];
        if (!tree) {
          continue;
        }
        const overlappingIntervals = tree.query(zone);
        for (const interval of overlappingIntervals) {
          // TODO only add the difference between the interval dependents and visited
          if (interval.dependents && !visited.has(interval.dependents)) {
            queue.push(interval.dependents);
          }
        }
      }
    }

    // remove initial zones
    for (const range of ranges) {
      visited.delete(range);
    }
    return visited;
  }
}

export class IntervalTree {
  private root: IntervalNode | null = null;
  private buffer: Required<Interval>[] = [];

  // When the buffer hits this size, we merge it into the main tree
  private readonly REBUILD_THRESHOLD = 1;

  /**
   * Bulk loads data. Completely overwrites current tree and buffer.
   * Complexity is O(n log n)
   */
  bulkLoad(intervals: Required<Interval>[]): void {
    console.time("Building interval tree with " + intervals.length + " intervals");
    const sorted = [...intervals].sort((a, b) => {
      // Sort intervals by their starting point
      if (a.top !== b.top) {
        return a.top - b.top;
      } else if (a.bottom !== b.bottom) {
        return a.bottom - b.bottom;
      }
      // If they have the same start and end, sort by dependents to group them together
      // Critical for the compaction step.
      const { zone: zoneA, sheetId: sheetIdA } = a.dependents;
      const { zone: zoneB, sheetId: sheetIdB } = b.dependents;
      if (sheetIdA !== sheetIdB) {
        return sheetIdA > sheetIdB ? 1 : -1;
      } else if (zoneA.left !== zoneB.left) {
        return zoneA.left - zoneB.left;
      } else if (zoneA.right !== zoneB.right) {
        return zoneA.right - zoneB.right;
      } else if (zoneA.top !== zoneB.top) {
        return zoneA.top - zoneB.top;
      } else {
        return zoneA.bottom - zoneB.bottom;
      }
    });
    let current = sorted[0];
    const compacted: Interval[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const isSameInterval = next.top === current.top && next.bottom === current.bottom;
      if (
        isSameInterval &&
        next.dependents.sheetId === current.dependents.sheetId &&
        // is same column (but left and right are the same)
        next.dependents.zone.left === current.dependents.zone.left &&
        next.dependents.zone.right === current.dependents.zone.right &&
        // are contiguous
        next.dependents.zone.top - 1 === current.dependents.zone.bottom
      ) {
        current.dependents.zone.bottom = next.dependents.zone.bottom; // Merge dependents with same interval
      } else {
        compacted.push(current);
        current = next;
      }
    }
    compacted.push(current);
    this.root = this.buildBalancedTree(compacted);
    this.buffer = [];
    console.timeEnd("Building interval tree with " + intervals.length + " intervals");
  }

  /**
   * Handles individual inserts cheaply by throwing them in a buffer.
   */
  insert(interval: Required<Interval>): void {
    this.buffer.push(interval);
  }

  /**
   * Queries for all intervals that OVERLAP the target interval.
   */
  query(target: Interval): Required<Interval>[] {
    if (this.buffer.length >= this.REBUILD_THRESHOLD) {
      this.rebuild();
    }
    const results: Required<Interval>[] = [];
    this.searchTree(this.root, target, results);
    this.searchUncommittedBuffer(target, results);
    return results;
  }

  private rebuild(): void {
    // Collect all intervals currently in the tree
    const currentIntervals: Required<Interval>[] = [];
    this.inOrderTraversal(this.root, currentIntervals);

    // Merge with buffer and rebuild
    const allIntervals = currentIntervals.concat(this.buffer);
    this.bulkLoad(allIntervals);
  }

  private buildBalancedTree(sortedIntervals: Interval[]): IntervalNode | null {
    if (sortedIntervals.length === 0) {
      return null;
    }

    // Pick the middle element to ensure perfect balancing
    const midIndex = Math.floor(sortedIntervals.length / 2);
    const node = new IntervalNode(sortedIntervals[midIndex]);

    // Recursively build left and right children
    node.left = this.buildBalancedTree(sortedIntervals.slice(0, midIndex));
    node.right = this.buildBalancedTree(sortedIntervals.slice(midIndex + 1));

    // Update the 'max' value for this node based on its children
    node.max = Math.max(
      node.interval.bottom,
      node.left ? node.left.max : -Infinity,
      node.right ? node.right.max : -Infinity
    );

    return node;
  }

  private searchTree(node: IntervalNode | null, target: Interval, results: Interval[]): void {
    if (!node) {
      return;
    }

    // If target's low is greater than the node's subtree max,
    // it's impossible for an overlap to exist in this subtree. Prune it.
    if (target.top > node.max) {
      return;
    }

    // Check if the current node overlaps
    if (this.isOverlapping(node.interval, target)) {
      results.push(node.interval);
    }

    // Always search the left child if it might contain an overlap
    if (node.left && node.left.max >= target.top) {
      this.searchTree(node.left, target, results);
    }

    // Only search the right child if the target's end could potentially overlap
    // with the right subtree's start values (which are >= node.interval.start)
    if (node.right && target.bottom >= node.interval.top) {
      this.searchTree(node.right, target, results);
    }
  }

  private searchUncommittedBuffer(target: Interval, results: Interval[]): void {
    for (const bufInterval of this.buffer) {
      if (this.isOverlapping(bufInterval, target)) {
        results.push(bufInterval);
      }
    }
  }

  private inOrderTraversal(node: IntervalNode | null, results: Interval[]): void {
    if (!node) {
      return;
    }
    this.inOrderTraversal(node.left, results);
    results.push(node.interval);
    this.inOrderTraversal(node.right, results);
  }

  private isOverlapping(a: Interval, b: Interval): boolean {
    return a.top <= b.bottom && a.bottom >= b.top;
  }
}
