import { positionToZone } from "../../../helpers/zones";
import { CellPosition, HeaderIndex, UID, Zone } from "../../../types/misc";
import { BoundedRange, Range } from "../../../types/range";
import { AffineDependents, IntervalTree } from "./interval_tree";
import { RangeSet } from "./range_set";

/**
 * Resolve the region cells dirtied by a change in `queriedZone`, for an affine
 * interval. See AffineDependents / FormulaDependencyGraph.addRegionDependencies.
 */
function affineDependents(affine: AffineDependents, queriedZone: Zone): BoundedRange | undefined {
  const top = Math.max(affine.rowStart, queriedZone.top + affine.lowConst);
  const bottom = Math.min(affine.rowEnd, queriedZone.bottom + affine.highConst);
  if (top > bottom) {
    return undefined;
  }
  return { sheetId: affine.sheetId, zone: { left: affine.col, right: affine.col, top, bottom } };
}

/**
 * Geometry of a vertical fill region: cells in column `col`, rows
 * [rowStart, rowEnd], whose formula is the template (anchored at `anchorRow`)
 * translated down row by row.
 */
export interface RegionDependencyInfo {
  sheetId: UID;
  col: HeaderIndex;
  rowStart: HeaderIndex;
  rowEnd: HeaderIndex;
  anchorRow: HeaderIndex;
  /** Template dependencies (at the anchor row). */
  dependencies: Range[];
  /** The template dependencies translated down by one row, to detect shifting. */
  dependenciesShiftedByOneRow: Range[];
}

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
    // For simplicity, we do not have a self-rebalancing tree algorithm which is required
    // to delete intervals efficiently.
    // We accumulate stale intervals in the tree, but we did not find any real-world scenario
    // where this would cause a significant performance issue.
  }

  addDependencies(formulaPosition: CellPosition, dependencies: Iterable<Range>) {
    const dependentsRange = {
      zone: positionToZone(formulaPosition),
      sheetId: formulaPosition.sheetId,
    };
    for (const range of dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const { zone, sheetId } = range;
      for (let col = zone.left; col <= zone.right; col++) {
        const columnTree = this.getOrCreateIntervalTree(sheetId, col);
        columnTree.insert({ top: zone.top, bottom: zone.bottom, dependents: dependentsRange });
      }
    }
  }

  /**
   * Register the dependencies of a whole fill region without materializing one
   * formula per cell. Each template dependency is inserted once per column it
   * spans: a non-shifting (absolute-row) dependency becomes a fixed interval
   * pointing at the whole region; a dependency that shifts one row per cell
   * becomes an affine interval whose dependents are derived from the query.
   *
   * Returns false when the region doesn't match these patterns (e.g. a
   * dependency that shifts by more than one row, or whose columns shift), in
   * which case the caller must fall back to per-cell registration.
   */
  addRegionDependencies(region: RegionDependencyInfo): boolean {
    const { sheetId, col, rowStart, rowEnd, anchorRow } = region;
    const dependentColumn: BoundedRange = {
      sheetId,
      zone: { left: col, right: col, top: rowStart, bottom: rowEnd },
    };
    // Validate every dependency first so a single insert isn't done on failure.
    const inserts: {
      depSheetId: UID;
      col: HeaderIndex;
      interval: Parameters<IntervalTree["insert"]>[0];
    }[] = [];
    for (let i = 0; i < region.dependencies.length; i++) {
      const dep = region.dependencies[i];
      if (dep.invalidSheetName || dep.invalidXc) {
        continue;
      }
      const shifted = region.dependenciesShiftedByOneRow[i];
      const { left, right, top, bottom } = dep.zone;
      const columnsUnchanged = shifted.zone.left === left && shifted.zone.right === right;
      if (!columnsUnchanged) {
        return false;
      }
      const isFixed = shifted.zone.top === top && shifted.zone.bottom === bottom;
      const shiftsByOneRow = shifted.zone.top === top + 1 && shifted.zone.bottom === bottom + 1;
      if (isFixed) {
        for (let c = left; c <= right; c++) {
          inserts.push({
            depSheetId: dep.sheetId,
            col: c,
            interval: { top, bottom, dependents: dependentColumn },
          });
        }
      } else if (shiftsByOneRow) {
        const affine: AffineDependents = {
          sheetId,
          col,
          rowStart,
          rowEnd,
          lowConst: anchorRow - bottom,
          highConst: anchorRow - top,
        };
        const intervalTop = top + (rowStart - anchorRow);
        const intervalBottom = bottom + (rowEnd - anchorRow);
        for (let c = left; c <= right; c++) {
          inserts.push({
            depSheetId: dep.sheetId,
            col: c,
            interval: { top: intervalTop, bottom: intervalBottom, affine },
          });
        }
      } else {
        return false;
      }
    }
    for (const { depSheetId, col, interval } of inserts) {
      this.getOrCreateIntervalTree(depSheetId, col).insert(interval);
    }
    return true;
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
          if (interval.dependents) {
            impactedRanges.add(interval.dependents);
          } else if (interval.affine) {
            const dependents = affineDependents(interval.affine, zone);
            if (dependents) {
              impactedRanges.add(dependents);
            }
          }
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
