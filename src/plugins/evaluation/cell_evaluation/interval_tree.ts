import { Dimension } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";

/**
 * Represents a numeric range [top, bottom].
 * Optional 'dependents' link the interval to the range of cells that depend on
 * the interval.
 * Optional 'dim' is the dimension along which contiguous dependents are compacted:
 * "COL" merges dependents of the same columns on contiguous rows, "ROW" merges
 * dependents of the same rows on contiguous columns.
 */
export interface Interval {
  start: number;
  end: number;
  dim?: Dimension;
  dependents?: BoundedRange;
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
    public start: IntervalNode | null = null,
    public stop: IntervalNode | null = null
  ) {
    this.max = interval.end;
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
  private buffer: Required<Interval>[] = [];

  /**
   * Adds an interval to the uncommitted buffer.
   * O(1) operation until the buffer needs to be merged into the main tree on the next query.
   */
  insert(interval: Required<Interval>) {
    this.buffer.push(interval);
  }

  /**
   * Finds all intervals overlapping the target.
   */
  query(target: Interval): Required<Interval>[] {
    if (this.buffer.length) {
      // If rebuilding the tree is too expensive (e.g. many inserts, interleaved with queries),
      // consider switching to a self-balancing tree (once it has been built a first time).
      // But rebuilding is already very fast, even with 10k intervals, so we keep it simple for now.
      this.rebuild();
    }
    const results: Required<Interval>[] = [];
    this.searchTree(this.root, target, results);
    return results;
  }

  private rebuild() {
    // Sort only the buffer, as the current tree is already sorted,
    // and we merge them in O(n) afterwards
    const currentSortedIntervals: Required<Interval>[] = [];
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
  private compactSortedIntervals(sortedIntervals: Required<Interval>[]): Interval[] {
    let current = sortedIntervals[0];
    let isCurrentCopied = false;
    const compacted: Interval[] = [];
    for (let i = 1; i < sortedIntervals.length; i++) {
      const next = sortedIntervals[i];
      const isSameInterval =
        next.start === current.start && next.end === current.end && next.dim === current.dim;
      const isDimCol = current.dim === "COL";
      const dStart = isDimCol ? "left" : "top";
      const dStop = isDimCol ? "right" : "bottom";

      if (
        isSameInterval &&
        // Is same column (or row)
        next.dependents.zone[dStart] === current.dependents.zone[dStart] &&
        next.dependents.zone[dStop] === current.dependents.zone[dStop] &&
        next.dependents.sheetId === current.dependents.sheetId
      ) {
        const pStart = isDimCol ? "top" : "left";
        const pStop = isDimCol ? "bottom" : "right";
        if (next.dependents.zone[pStart] - 1 === current.dependents.zone[pStop]) {
          if (!isCurrentCopied) {
            current = {
              ...current,
              dependents: {
                sheetId: current.dependents.sheetId,
                zone: { ...current.dependents.zone },
              },
            };
            isCurrentCopied = true;
          }
          // Extend the vertical boundary of the dependents
          current.dependents.zone[pStop] = next.dependents.zone[pStop];
        } else if (
          next.dependents.zone[pStart] === current.dependents.zone[pStart] &&
          next.dependents.zone[pStop] === current.dependents.zone[pStop]
        ) {
          // Exact same, ignore it
          continue;
        } else {
          compacted.push(current);
          current = next;
          isCurrentCopied = false;
        }
      } else {
        compacted.push(current);
        current = next;
        isCurrentCopied = false;
      }
    }
    compacted.push(current);
    return compacted;
  }

  private mergeSortedIntervals(
    a: Required<Interval>[],
    b: Required<Interval>[]
  ): Required<Interval>[] {
    const merged: Required<Interval>[] = [];
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

  private bulkLoad(sortedIntervals: Required<Interval>[]) {
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

    node.start = this.buildBalancedTree(sortedIntervals, start, mid);
    node.stop = this.buildBalancedTree(sortedIntervals, mid + 1, end);

    // Update augmented 'max' for the subtree
    node.max = Math.max(
      node.interval.end,
      node.start ? node.start.max : -1,
      node.stop ? node.stop.max : -1
    );

    return node;
  }

  private searchTree(node: IntervalNode | null, target: Interval, results: Interval[]) {
    if (!node || target.start > node.max) {
      return;
    }

    if (this.isOverlapping(node.interval, target)) {
      results.push(node.interval);
    }

    // Use node.max to skip subtrees that cannot possibly overlap.
    if (node.start && node.start.max >= target.start) {
      this.searchTree(node.start, target, results);
    }

    // Since tree is sorted by 'top', we only check right if target.bottom
    // can reach the node's top or beyond.
    if (node.stop && target.end >= node.interval.start) {
      this.searchTree(node.stop, target, results);
    }
  }

  private inOrderTraversal(node: IntervalNode | null, results: Interval[]) {
    if (!node) {
      return;
    }
    this.inOrderTraversal(node.start, results);
    results.push(node.interval);
    this.inOrderTraversal(node.stop, results);
  }

  private isOverlapping(a: Interval, b: Interval): boolean {
    return a.start <= b.end && a.end >= b.start;
  }
}

/**
 * Extracted comparison logic for consistency between sort and merge.
 */
function compareIntervals(a: Required<Interval>, b: Required<Interval>): number {
  // Primary sort by interval boundaries
  if (a.start !== b.start) {
    return a.start - b.start;
  } else if (a.end !== b.end) {
    return a.end - b.end;
  }
  // Secondary sort by dependent for compaction
  const { zone: zA, sheetId: sheetIdA } = a.dependents;
  const { zone: zB, sheetId: sheetIdB } = b.dependents;
  if (sheetIdA !== sheetIdB) {
    return sheetIdA > sheetIdB ? 1 : -1;
  }
  if (a.dim !== b.dim) {
    return a.dim > b.dim ? 1 : -1;
  }
  if (a.dim === "COL") {
    return zA.left - zB.left || zA.right - zB.right || zA.top - zB.top || zA.bottom - zB.bottom;
  }
  return zA.top - zB.top || zA.bottom - zB.bottom || zA.left - zB.left || zA.right - zB.right;
}
