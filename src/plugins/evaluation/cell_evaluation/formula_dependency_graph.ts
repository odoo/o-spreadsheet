import { dimensionStartEnd, positionToZone } from "../../../helpers/zones";
import { CellPosition, Dimension, HeaderIndex, UID, Zone } from "../../../types/misc";
import { BoundedRange, Range } from "../../../types/range";
import { IntervalTree } from "./interval_tree";
import { RangeSet } from "./range_set";

const DEFAULT_DIMENSION = "COL";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses a collection of interval trees to efficiently find dependent cells.
 * There is one interval tree per col/row.
 */
export class FormulaDependencyGraph {
  // One interval tree per column, grouped by sheetId
  private forest: Record<UID, Record<HeaderIndex, IntervalTree>> = {};
  private dependeciesDimensions: Record<UID, Dimension> = {};

  constructor(sheetUsedZones: Record<UID, Zone> = {}) {
    for (const sheetId of Object.keys(sheetUsedZones)) {
      const zone = sheetUsedZones[sheetId];
      if (zone.right - zone.left > (zone.bottom - zone.top) * 2) {
        this.dependeciesDimensions[sheetId] = "ROW";
      } else {
        this.dependeciesDimensions[sheetId] = "COL";
      }
    }
  }

  removeAllDependencies(formulaPosition: CellPosition) {
    // Not implemented.
    // For simplicity, we do not have a self-rebalancing tree algorithm which is required
    // to delete intervals efficiently.
    // We accumulate stale intervals in the tree, but we did not find any real-world scenario
    // where this would cause a significant performance issue.
  }

  getTreeSpan(range: BoundedRange) {
    const dim = this.dependeciesDimensions[range.sheetId] ?? DEFAULT_DIMENSION;
    return dimensionStartEnd(dim, range.zone);
  }

  addDependencies(formulaPosition: CellPosition, dependencies: Iterable<Range>) {
    const dependentsRange = {
      zone: positionToZone(formulaPosition),
      sheetId: formulaPosition.sheetId,
    };
    // Dependents are compacted following the layout of the formula sheet
    const dependentsDim = this.dependeciesDimensions[formulaPosition.sheetId] ?? DEFAULT_DIMENSION;
    for (const range of dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const { start, end, crossStart, crossEnd } = this.getTreeSpan(range);
      for (let headerIndex = start; headerIndex <= end; headerIndex++) {
        const columnTree = this.getOrCreateIntervalTree(range.sheetId, headerIndex);
        columnTree.insert({
          start: crossStart,
          end: crossEnd,
          dim: dependentsDim,
          dependents: dependentsRange,
        });
      }
    }
  }

  getCellsDependingOn(ranges: Iterable<BoundedRange>, visited = new RangeSet()): RangeSet {
    visited = visited.copy();

    // At the end we want to remove from the visited set all the initial range positions, except the ones we're actually depending on
    // Some of the cells of the initial ranges might be depending on other cells of the initial ranges, and we want to keep those in the visited set
    const initialRangesToRemove = visited.copy();
    const hasInitialRanges = !initialRangesToRemove.isEmpty();

    const queue: BoundedRange[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.add(range);
      const sheetForest = this.forest[range.sheetId];
      if (!sheetForest) {
        continue;
      }
      const impactedRanges = new RangeSet();

      const { start, end, crossStart, crossEnd } = this.getTreeSpan(range);
      const queryInterval = { start: crossStart, end: crossEnd };

      for (let headerIndex = start; headerIndex <= end; headerIndex++) {
        const columnTree = sheetForest[headerIndex];
        if (!columnTree) {
          continue;
        }
        const overlappingIntervals = columnTree.query(queryInterval);
        for (const interval of overlappingIntervals) {
          impactedRanges.add(interval.dependents);
        }
      }
      for (const impactedRange of impactedRanges) {
        if (!visited.has(impactedRange)) {
          queue.push(impactedRange);
        }
        if (hasInitialRanges) {
          initialRangesToRemove.delete(impactedRange);
        }
      }
    }

    // remove initial ranges
    for (const range of initialRangesToRemove) {
      visited.delete(range);
    }

    return visited;
  }

  private getOrCreateIntervalTree(sheetId: UID, header: HeaderIndex): IntervalTree {
    let tree = this.forest[sheetId]?.[header];
    if (!tree) {
      if (!this.forest[sheetId]) {
        this.forest[sheetId] = {};
      }
      tree = new IntervalTree();
      this.forest[sheetId][header] = tree;
    }
    return tree;
  }
}
