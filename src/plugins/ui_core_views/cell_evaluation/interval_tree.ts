import { BoundedRange } from "../../../types/range";

/**
 * Represents a numeric range [top, bottom].
 * Optional 'dependents' link the interval to the range of cells (or, more
 * generally, whatever `T` represents) that depend on the interval.
 */
export interface Interval<T = BoundedRange> {
  top: number;
  bottom: number;
  dependents?: T;
}

/**
 * Pluggable identity/merge behaviour for a given `dependents` payload type,
 * so `IntervalTree` can be reused for payloads other than `BoundedRange`
 * (e.g. a `FormulaOwnerId[]`) without changing its traversal/balancing logic.
 */
export interface IntervalTreeOptions<T> {
  /** Total order used to sort/group intervals sharing the same [top, bottom]. */
  compareDependents(a: T, b: T): number;
  /** Whether two dependents sharing the same [top, bottom] may be compacted together. */
  canMerge(a: T, b: T): boolean;
  /**
   * Attempt to merge two contiguous same-[top,bottom] dependents into one.
   * Return `undefined` if they should be kept as separate intervals.
   */
  mergeContiguous(a: T, b: T): T | undefined;
}

export const defaultIntervalTreeOptions: IntervalTreeOptions<BoundedRange> = {
  compareDependents(a, b) {
    if (a.sheetId !== b.sheetId) {
      return a.sheetId > b.sheetId ? 1 : -1;
    }
    return (
      a.zone.left - b.zone.left ||
      a.zone.right - b.zone.right ||
      a.zone.top - b.zone.top ||
      a.zone.bottom - b.zone.bottom
    );
  },
  canMerge(a, b) {
    return a.zone.left === b.zone.left && a.zone.right === b.zone.right && a.sheetId === b.sheetId;
  },
  mergeContiguous(a, b) {
    if (b.zone.top - 1 === a.zone.bottom) {
      // Extend the vertical boundary of the dependents
      return { sheetId: a.sheetId, zone: { ...a.zone, bottom: b.zone.bottom } };
    } else if (b.zone.top === a.zone.top && b.zone.bottom === a.zone.bottom) {
      // Exact same, ignore it
      return a;
    }
    return undefined;
  },
};

class IntervalNode<T> {
  /**
   * Augmented value: the highest 'bottom' boundary in this subtree.
   * Allows O(log n) pruning during overlap searches.
   * @see https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
   */
  max: number;

  constructor(
    public interval: Interval<T>,
    public left: IntervalNode<T> | null = null,
    public right: IntervalNode<T> | null = null
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
export class IntervalTree<T = BoundedRange> {
  private root: IntervalNode<T> | null = null;
  private buffer: Required<Interval<T>>[] = [];

  constructor(private options: IntervalTreeOptions<T>) {}

  /**
   * Adds an interval to the uncommitted buffer.
   * O(1) operation until the buffer needs to be merged into the main tree on the next query.
   */
  insert(interval: Required<Interval<T>>) {
    this.buffer.push(interval);
  }

  /**
   * Finds all intervals overlapping the target.
   */
  query(target: Interval<T>): Required<Interval<T>>[] {
    if (this.buffer.length) {
      // If rebuilding the tree is too expensive (e.g. many inserts, interleaved with queries),
      // consider switching to a self-balancing tree (once it has been built a first time).
      // But rebuilding is already very fast, even with 10k intervals, so we keep it simple for now.
      this.rebuild();
    }
    const results: Required<Interval<T>>[] = [];
    this.searchTree(this.root, target, results);
    return results;
  }

  private rebuild() {
    // Sort only the buffer, as the current tree is already sorted,
    // and we merge them in O(n) afterwards
    const currentSortedIntervals: Required<Interval<T>>[] = [];
    this.inOrderTraversal(this.root, currentSortedIntervals);
    const sortedBuffer = this.buffer.sort((a, b) => this.compareIntervals(a, b));
    const allIntervals = this.mergeSortedIntervals(currentSortedIntervals, sortedBuffer);
    this.bulkLoad(allIntervals);
    this.buffer = [];
  }

  /**
   * Compacts consecutive intervals with consecutive dependents into a single
   * interval.
   */
  private compactSortedIntervals(sortedIntervals: Required<Interval<T>>[]): Interval<T>[] {
    let current = sortedIntervals[0];
    const compacted: Interval<T>[] = [];
    for (let i = 1; i < sortedIntervals.length; i++) {
      const next = sortedIntervals[i];
      const isSameInterval = next.top === current.top && next.bottom === current.bottom;
      if (isSameInterval && this.options.canMerge(current.dependents, next.dependents)) {
        const merged = this.options.mergeContiguous(current.dependents, next.dependents);
        if (merged !== undefined) {
          current = { ...current, dependents: merged };
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

  private mergeSortedIntervals(
    a: Required<Interval<T>>[],
    b: Required<Interval<T>>[]
  ): Required<Interval<T>>[] {
    const merged: Required<Interval<T>>[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
      if (this.compareIntervals(a[i], b[j]) <= 0) {
        merged.push(a[i++]);
      } else {
        merged.push(b[j++]);
      }
    }
    // Append remaining elements
    return merged.concat(i < a.length ? a.slice(i) : b.slice(j));
  }

  private bulkLoad(sortedIntervals: Required<Interval<T>>[]) {
    const compacted = this.compactSortedIntervals(sortedIntervals);
    this.root = this.buildBalancedTree(compacted);
  }

  private buildBalancedTree(
    sortedIntervals: Interval<T>[],
    start = 0,
    end = sortedIntervals.length
  ): IntervalNode<T> | null {
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

  private searchTree(node: IntervalNode<T> | null, target: Interval<T>, results: Interval<T>[]) {
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

  private inOrderTraversal(node: IntervalNode<T> | null, results: Interval<T>[]) {
    if (!node) {
      return;
    }
    this.inOrderTraversal(node.left, results);
    results.push(node.interval);
    this.inOrderTraversal(node.right, results);
  }

  private isOverlapping(a: Interval<T>, b: Interval<T>): boolean {
    return a.top <= b.bottom && a.bottom >= b.top;
  }

  /**
   * Extracted comparison logic for consistency between sort and merge.
   */
  private compareIntervals(a: Required<Interval<T>>, b: Required<Interval<T>>): number {
    // Primary sort by interval boundaries
    if (a.top !== b.top) {
      return a.top - b.top;
    } else if (a.bottom !== b.bottom) {
      return a.bottom - b.bottom;
    }
    // Secondary sort by dependent for compaction
    return this.options.compareDependents(a.dependents, b.dependents);
  }
}
