import { FormulaOwnerId } from "../../../types/formula_owner";
import { HeaderIndex, UID } from "../../../types/misc";
import { BoundedRange, Range } from "../../../types/range";
import { IntervalTree, IntervalTreeOptions } from "../cell_evaluation/interval_tree";

/**
 * No compaction is needed for formula-owner leaf payloads: owner counts are
 * tiny compared to cell counts, and unlike cells a non-cell formula owner can
 * never be referenced *by* another formula, so there's no need to keep this
 * tree's shape minimal for downstream traversal cost.
 */
const ownerIdListOptions: IntervalTreeOptions<FormulaOwnerId[]> = {
  compareDependents: () => 0,
  canMerge: () => false,
  mergeContiguous: () => undefined,
};

/**
 * Tracks which formula owners (a conditional formatting rule, a data
 * validation criterion, a pivot calculated measure, ...) depend on which
 * ranges, so `FormulaManagerPlugin` can invalidate only the owners actually
 * affected by an edit instead of recomputing every owner on any relevant
 * command.
 *
 * Structurally a much simpler cousin of `FormulaDependencyGraph`
 * (`cell_evaluation/formula_dependency_graph.ts`): non-cell owners are always
 * dependency-graph leaves (nobody writes `=CHART_VALUE(...)`), so there is no
 * need for the `CellPosition`-shaped re-queryable node identity cells
 * require. Rebuilt from scratch whenever `FormulaManagerPlugin` re-pulls the
 * owner list, so there is no need for incremental removal either.
 */
export class OwnerDependencyIndex {
  private forest: Record<UID, Record<HeaderIndex, IntervalTree<FormulaOwnerId[]>>> = {};

  addDependencies(id: FormulaOwnerId, dependencies: Iterable<Range>) {
    for (const range of dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const { zone, sheetId } = range;
      for (let col = zone.left; col <= zone.right; col++) {
        const columnTree = this.getOrCreateIntervalTree(sheetId, col);
        columnTree.insert({ top: zone.top, bottom: zone.bottom, dependents: [id] });
      }
    }
  }

  getDependents(ranges: Iterable<BoundedRange>): Set<FormulaOwnerId> {
    const result = new Set<FormulaOwnerId>();
    for (const range of ranges) {
      const sheetForest = this.forest[range.sheetId];
      if (!sheetForest) {
        continue;
      }
      const zone = range.zone;
      for (let col = zone.left; col <= zone.right; col++) {
        const columnTree = sheetForest[col];
        if (!columnTree) {
          continue;
        }
        for (const interval of columnTree.query(zone)) {
          for (const id of interval.dependents) {
            result.add(id);
          }
        }
      }
    }
    return result;
  }

  private getOrCreateIntervalTree(sheetId: UID, col: HeaderIndex): IntervalTree<FormulaOwnerId[]> {
    let tree = this.forest[sheetId]?.[col];
    if (!tree) {
      if (!this.forest[sheetId]) {
        this.forest[sheetId] = {};
      }
      tree = new IntervalTree<FormulaOwnerId[]>(ownerIdListOptions);
      this.forest[sheetId][col] = tree;
    }
    return tree;
  }
}
