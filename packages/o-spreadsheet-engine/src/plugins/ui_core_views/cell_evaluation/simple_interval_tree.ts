import { CellPosition, HeaderIndex, Zone } from "../../..";
import { positionToZone } from "../../../helpers/zones";
import { RTreeBoundingBox } from "./r_tree";
import { ZoneSet } from "./zone_set";

export interface Interval {
  top: number;
  bottom: number;
  dependents?: Zone;
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

export class SheetDependencyGraph {
  // one interval tree per column. Each tree contains intervals corresponding to the rows of the dependencies in that column.
  private forest: Record<HeaderIndex, IntervalTree> = {};

  addDependencies(formulaPosition: CellPosition, dependencies: RTreeBoundingBox[]): void {
    const dependentsZone = positionToZone(formulaPosition);
    for (const { zone, sheetId } of dependencies) {
      for (let col = zone.left; col <= zone.right; col++) {
        let columnTree = this.forest[col];
        if (!columnTree) {
          columnTree = new IntervalTree();
          this.forest[col] = columnTree;
        }
        columnTree.insert({ top: zone.top, bottom: zone.bottom, dependents: dependentsZone });
      }
    }
  }

  getRangeDependents(zones: Iterable<Zone>): Zone[] {
    const result: Zone[] = [];
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        const tree = this.forest[col];
        if (!tree) {
          continue;
        }
        const overlappingIntervals = tree.query({ top: zone.top, bottom: zone.bottom });
        for (const interval of overlappingIntervals) {
          result.push(interval.dependents);
        }
      }
    }
    return result;
  }

  getRangeDependentsRecursive(zones: Iterable<Zone>, visited: ZoneSet = new ZoneSet()): ZoneSet {
    visited = visited.copy();
    const queue: Zone[] = Array.from(zones).reverse();
    while (queue.length > 0) {
      const zone = queue.pop()!;
      visited.add(zone);
      for (let col = zone.left; col <= zone.right; col++) {
        const tree = this.forest[col];
        if (!tree) {
          continue;
        }
        const overlappingIntervals = tree.query({ top: zone.top, bottom: zone.bottom });
        for (const interval of overlappingIntervals) {
          // TODO only add the difference between the interval dependents and visited
          if (interval.dependents && !visited.has(interval.dependents)) {
            queue.push(interval.dependents);
          }
        }
      }
    }

    // remove initial zones
    for (const zone of zones) {
      visited.delete(zone);
    }
    return visited;
  }
}

export class IntervalTree {
  private root: IntervalNode | null = null;
  private buffer: Required<Interval>[] = [];

  // When the buffer hits this size, we merge it into the main tree
  private readonly REBUILD_THRESHOLD = 64;

  /**
   * Bulk loads data. Completely overwrites current tree and buffer.
   * Complexity is O(n log n)
   */
  bulkLoad(intervals: Required<Interval>[]): void {
    const sorted = [...intervals].sort((a, b) => {
      // Sort intervals by their starting point
      if (a.bottom !== b.bottom) {
        return a.bottom - b.bottom;
      } else if (a.top !== b.top) {
        return a.top - b.top;
      }
      // If they have the same start and end, sort by dependents to group them together
      // Critical for the compaction step.
      const zoneA = a.dependents;
      const zoneB = b.dependents;
      if (zoneA.left !== zoneB.left) {
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
    const compacted: Interval[] = [current];
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const isSameInterval = next.top === current.top && next.bottom === current.bottom;
      if (
        isSameInterval &&
        // is same column
        next.dependents.left === current.dependents.left &&
        next.dependents.right === current.dependents.right &&
        // are contiguous
        next.dependents.top - 1 === current.dependents.bottom
      ) {
        current.dependents.bottom = next.dependents.bottom; // Merge dependents with same interval
      } else {
        compacted.push(current);
        current = next;
      }
    }
    this.root = this.buildBalancedTree(compacted);
    this.buffer = [];
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
