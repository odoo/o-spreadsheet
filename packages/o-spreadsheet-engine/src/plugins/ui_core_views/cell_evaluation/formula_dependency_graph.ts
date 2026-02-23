import { CellPosition, HeaderIndex, UID } from "../../..";
import { positionToZone } from "../../../helpers/zones";
import { BoundedRange } from "../../../types/range";
import { IntervalTree } from "./interval_tree";
import { RangeSet } from "./range_set";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses a collection of interval trees to efficiently find dependent cells.
 * There is one interval tree per column.
 */
export class FormulaDependencyGraph {
  // One interval tree per column, grouped by sheetId
  private forest: Record<UID, Record<HeaderIndex, IntervalTree>> = {};

  removeAllDependencies(formulaPosition: CellPosition) {
    // Not implemented.
    // For simplicity, we do not have a self-reblancing tree algorithm which is required
    // to delete intervals efficiently.
    // We accumulate stale intervals in the tree, but we didn't not find any real-world scenario
    // where this would cause a significant performance issue.
  }

  addDependencies(formulaPosition: CellPosition, dependencies: Iterable<BoundedRange>) {
    const dependentsRange = {
      zone: positionToZone(formulaPosition),
      sheetId: formulaPosition.sheetId,
    };
    for (const range of dependencies) {
      const { zone, sheetId } = range;
      for (let col = zone.left; col <= zone.right; col++) {
        const columnTree = this.getOrCreateIntervalTree(sheetId, col);
        columnTree.insert({ top: zone.top, bottom: zone.bottom, dependents: dependentsRange });
      }
    }
  }

  getCellsDependingOn(ranges: Iterable<BoundedRange>, visited = new RangeSet()): RangeSet {
    visited = visited.copy();
    const queue: BoundedRange[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.add(range);
      const zone = range.zone;
      const sheetForest = this.forest[range.sheetId];
      if (!sheetForest) {
        continue;
      }
      const impactedRanges = new RangeSet();
      for (let col = zone.left; col <= zone.right; col++) {
        const columnTree = sheetForest[col];
        if (!columnTree) {
          continue;
        }
        const overlappingIntervals = columnTree.query(zone);
        for (const interval of overlappingIntervals) {
          impactedRanges.add(interval.dependents);
        }
      }
      queue.push(...impactedRanges.difference(visited));
    }

    // remove initial ranges
    for (const range of ranges) {
      visited.delete(range);
    }
    return visited;
  }

  private getOrCreateIntervalTree(sheetId: UID, col: HeaderIndex): IntervalTree {
    let tree = this.forest[sheetId]?.[col];
    if (!tree) {
      if (!this.forest[sheetId]) {
        this.forest[sheetId] = {};
      }
      tree = new IntervalTree();
      this.forest[sheetId][col] = tree;
    }
    return tree;
  }
}
