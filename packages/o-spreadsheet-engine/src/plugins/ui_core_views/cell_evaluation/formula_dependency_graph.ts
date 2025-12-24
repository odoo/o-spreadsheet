import { PositionMap } from "../../../helpers/cells/position_map";
import { positionToZone } from "../../../helpers/zones";
import { CellPosition } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";
import { DependenciesRTree } from "./dependencies_r_tree";
import { RTreeBoundingBox, RTreeItem } from "./r_tree";
import { RangeSet } from "./range_set";

interface RTreeItemFormula extends BoundedRange {
  type: "FORMULA";
}

interface RTreeMisc {
  type: "MISC";
}

type RTreeItemData = RTreeItemFormula | RTreeMisc;

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses an R-Tree data structure to efficiently find dependent cells.
 */
export class FormulaDependencyGraph {
  private readonly dependencies: PositionMap<RTreeItem<RTreeItemData>[]> = new PositionMap();
  private readonly rTree: DependenciesRTree;

  constructor(data: RTreeItem<RTreeItemData>[] = []) {
    this.rTree = new DependenciesRTree(data);
  }

  removeAllDependencies(formulaPosition: CellPosition) {
    const ranges = this.dependencies.get(formulaPosition);
    if (!ranges) {
      return;
    }
    for (const range of ranges) {
      this.rTree.remove(range);
    }
    this.dependencies.delete(formulaPosition);
  }

  addDependencies(formulaPosition: CellPosition, dependencies: RTreeBoundingBox[]): void {
    const rTreeItems = dependencies.map(({ sheetId, zone }) => ({
      data: {
        sheetId: formulaPosition.sheetId,
        zone: positionToZone(formulaPosition),
      },
      boundingBox: {
        zone,
        sheetId,
      },
    }));
    for (const item of rTreeItems) {
      this.rTree.insert(item);
    }
    const existingDependencies = this.dependencies.get(formulaPosition);
    if (existingDependencies) {
      existingDependencies.push(...rTreeItems);
    } else {
      this.dependencies.set(formulaPosition, rTreeItems);
    }
  }

  /**
   * Return all the cells that depend on the provided ranges.
   */
  getCellsDependingOn(ranges: Iterable<BoundedRange>, visited = new RangeSet()): RangeSet {
    visited = visited.copy();
    const queue: BoundedRange[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.add(range);
      const impactedRanges = this.rTree.search(range);
      queue.push(...impactedRanges.difference(visited));
    }

    // remove initial ranges
    for (const range of ranges) {
      visited.delete(range);
    }
    return visited;
  }
}
