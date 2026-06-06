import { UID } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";

/**
 * Dependents of an interval whose position is a function of the queried rows,
 * used to represent a whole fill region with a single interval. A change in rows
 * [qTop, qBottom] of this interval's column dirties the region cells (all in
 * column `col`) in rows [qTop + lowConst, qBottom + highConst], clamped to
 * [rowStart, rowEnd]. See FormulaDependencyGraph.addRegionDependencies.
 */
export interface AffineDependents {
  sheetId: UID;
  col: number;
  rowStart: number;
  rowEnd: number;
  lowConst: number;
  highConst: number;
}

/**
 * Represents a numeric range [top, bottom].
 * 'dependents' link the interval to a fixed range of cells that depend on it;
 * 'affine' instead derives the dependents from the queried rows (region cells).
 * Exactly one of the two is set.
 */
export interface Interval {
  top: number;
  bottom: number;
  dependents?: BoundedRange;
  affine?: AffineDependents;
}

class IntervalNode {
  /**
   * Augmented value: the highest 'bottom' boundary in this subtree.
   * Allows O(log n) pruning during overlap searches.
   * @see https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
   */
  max: number;

  constructor(
    public interval: Interval,
    public left: IntervalNode | null = null,
    public right: IntervalNode | null = null
  ) {
    this.max = interval.bottom;
  }
}

/**
 * An Interval Tree is an (augmented) binary search tree where each node stores an
 * interval [<low value>, <high value>]
 *
 * Augmented: each node stores the maximum 'high' value among all intervals in its subtree,
 * enabling O(log n) retrieval of all intervals overlapping a given range.
 *
 * To avoid constant, expensive tree rebalancing, new intervals are pushed to a
 * `buffer` (O(1) insert).
 * The tree is only rebuilt and balanced when a `query` is performed or the buffer exceeds a threshold.
 */
export class IntervalTree {
  private root: IntervalNode | null = null;
  private buffer: Interval[] = [];

  /**
   * Adds an interval to the uncommitted buffer.
   * O(1) operation until the buffer needs to be merged into the main tree on the next query.
   */
  insert(interval: Interval) {
    this.buffer.push(interval);
  }

  /**
   * Finds all intervals overlapping the target.
   */
  query(target: Interval): Interval[] {
    if (this.buffer.length) {
      // If rebuilding the tree is too expensive (e.g. many inserts, interleaved with queries),
      // consider switching to a self-balancing tree (once it has been built a first time).
      // But rebuilding is already very fast, even with 10k intervals, so we keep it simple for now.
      this.rebuild();
    }
    const results: Interval[] = [];
    this.searchTree(this.root, target, results);
    return results;
  }

  private rebuild() {
    // Sort only the buffer, as the current tree is already sorted,
    // and we merge them in O(n) afterwards
    const currentSortedIntervals: Interval[] = [];
    this.inOrderTraversal(this.root, currentSortedIntervals);
    const sortedBuffer = this.buffer.sort(compareIntervals);
    const allIntervals = this.mergeSortedIntervals(currentSortedIntervals, sortedBuffer);
    this.bulkLoad(allIntervals);
    this.buffer = [];
  }

  /**
   * Compacts consecutive intervals with consecutive dependents into a single
   * interval.
   */
  private compactSortedIntervals(sortedIntervals: Interval[]): Interval[] {
    let current = sortedIntervals[0];
    const compacted: Interval[] = [];
    for (let i = 1; i < sortedIntervals.length; i++) {
      const next = sortedIntervals[i];
      const isSameInterval = next.top === current.top && next.bottom === current.bottom;
      if (
        isSameInterval &&
        // Affine (region) intervals are never compacted: their dependents are a
        // function of the query, not a fixed range.
        next.dependents &&
        current.dependents &&
        // Is same column
        next.dependents.zone.left === current.dependents.zone.left &&
        next.dependents.zone.right === current.dependents.zone.right &&
        next.dependents.sheetId === current.dependents.sheetId
      ) {
        if (next.dependents.zone.top - 1 === current.dependents.zone.bottom) {
          // Extend the vertical boundary of the dependents
          current.dependents.zone.bottom = next.dependents.zone.bottom;
        } else if (
          next.dependents.zone.top === current.dependents.zone.top &&
          next.dependents.zone.bottom === current.dependents.zone.bottom
        ) {
          // Exact same, ignore it
          continue;
        } else {
          compacted.push(current);
          current = next;
        }
      } else {
        compacted.push(current);
        current = next;
      }
    }
    compacted.push(current);
    return compacted;
  }

  private mergeSortedIntervals(a: Interval[], b: Interval[]): Interval[] {
    const merged: Interval[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
      if (compareIntervals(a[i], b[j]) <= 0) {
        merged.push(a[i++]);
      } else {
        merged.push(b[j++]);
      }
    }
    // Append remaining elements
    return merged.concat(i < a.length ? a.slice(i) : b.slice(j));
  }

  private bulkLoad(sortedIntervals: Interval[]) {
    const compacted = this.compactSortedIntervals(sortedIntervals);
    this.root = this.buildBalancedTree(compacted);
  }

  private buildBalancedTree(
    sortedIntervals: Interval[],
    start = 0,
    end = sortedIntervals.length
  ): IntervalNode | null {
    if (start >= end) {
      return null;
    }

    const mid = start + ((end - start) >> 1); // divide by 2
    const node = new IntervalNode(sortedIntervals[mid]);

    node.left = this.buildBalancedTree(sortedIntervals, start, mid);
    node.right = this.buildBalancedTree(sortedIntervals, mid + 1, end);

    // Update augmented 'max' for the subtree
    node.max = Math.max(
      node.interval.bottom,
      node.left ? node.left.max : -1,
      node.right ? node.right.max : -1
    );

    return node;
  }

  private searchTree(node: IntervalNode | null, target: Interval, results: Interval[]) {
    if (!node || target.top > node.max) {
      return;
    }

    if (this.isOverlapping(node.interval, target)) {
      results.push(node.interval);
    }

    // Use node.max to skip subtrees that cannot possibly overlap.
    if (node.left && node.left.max >= target.top) {
      this.searchTree(node.left, target, results);
    }

    // Since tree is sorted by 'top', we only check right if target.bottom
    // can reach the node's top or beyond.
    if (node.right && target.bottom >= node.interval.top) {
      this.searchTree(node.right, target, results);
    }
  }

  private inOrderTraversal(node: IntervalNode | null, results: Interval[]) {
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

/**
 * Extracted comparison logic for consistency between sort and merge.
 */
function compareIntervals(a: Interval, b: Interval): number {
  // Primary sort by interval boundaries
  if (a.top !== b.top) {
    return a.top - b.top;
  } else if (a.bottom !== b.bottom) {
    return a.bottom - b.bottom;
  }
  // Secondary sort by dependent for compaction. Affine (region) intervals carry
  // no fixed dependents and are not compacted, so their relative order is
  // irrelevant — keep them after equal-boundary fixed intervals.
  if (!a.dependents || !b.dependents) {
    return (a.dependents ? 0 : 1) - (b.dependents ? 0 : 1);
  }
  const { zone: zA, sheetId: sheetIdA } = a.dependents;
  const { zone: zB, sheetId: sheetIdB } = b.dependents;
  if (sheetIdA !== sheetIdB) {
    return sheetIdA > sheetIdB ? 1 : -1;
  }
  return zA.left - zB.left || zA.right - zB.right || zA.top - zB.top || zA.bottom - zB.bottom;
}
