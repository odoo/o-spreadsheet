export interface Interval {
  low: number;
  high: number;
  id?: string; // Optional: useful for linking to your actual data
}

class IntervalNode {
  public max: number;

  constructor(
    public interval: Interval,
    public left: IntervalNode | null = null,
    public right: IntervalNode | null = null
  ) {
    this.max = interval.high;
  }
}

export class BufferedIntervalTree {
  private root: IntervalNode | null = null;
  private buffer: Interval[] = [];

  // When the buffer hits this size, we merge it into the main tree
  private readonly REBUILD_THRESHOLD = 100;

  /**
   * Bulk loads data. Completely overwrites current tree and buffer.
   */
  public bulkLoad(intervals: Interval[]): void {
    // Sort intervals by their starting point
    const sorted = [...intervals].sort((a, b) => a.low - b.low);
    this.root = this.buildBalancedTree(sorted);
    this.buffer = [];
  }

  /**
   * Handles individual inserts cheaply by throwing them in a buffer.
   */
  public insert(interval: Interval): void {
    this.buffer.push(interval);

    // Rebuild the tree if the buffer gets too large
    if (this.buffer.length >= this.REBUILD_THRESHOLD) {
      this.rebuild();
    }
  }

  /**
   * Queries for all intervals that OVERLAP the target interval.
   */
  public query(target: Interval): Interval[] {
    const results: Interval[] = [];

    // 1. Search the balanced tree
    this.searchTree(this.root, target, results);

    // 2. Search the uncommitted buffer
    for (const bufInterval of this.buffer) {
      if (this.isOverlapping(bufInterval, target)) {
        results.push(bufInterval);
      }
    }

    return results;
  }

  // --- Internal Helper Methods ---

  private rebuild(): void {
    // Collect all intervals currently in the tree
    const currentIntervals: Interval[] = [];
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
      node.interval.high,
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
    if (target.low > node.max) {
      return;
    }

    // Check if the current node overlaps
    if (this.isOverlapping(node.interval, target)) {
      results.push(node.interval);
    }

    // Always search the left child if it might contain an overlap
    if (node.left && node.left.max >= target.low) {
      this.searchTree(node.left, target, results);
    }

    // Only search the right child if the target's high could potentially overlap
    // with the right subtree's start values (which are >= node.interval.low)
    if (node.right && target.high >= node.interval.low) {
      this.searchTree(node.right, target, results);
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
    return a.low <= b.high && a.high >= b.low;
  }
}
