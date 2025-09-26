import { positionToZone } from "../../../helpers";
import { PositionMap } from "../../../helpers/cells/position_map";
import { BoundedRange, CellPosition, Range } from "../../../types";
import { RTreeBoundingBox, RTreeItem } from "./r_tree";
import { RangeRTree } from "./range_r_tree";
import { RangeSet } from "./range_set";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses an R-Tree data structure to efficiently find dependent cells.
 */
export class FormulaDependencyGraph {
  private readonly dependencies: PositionMap<RTreeItem<Range>[]> = new PositionMap();
  private readonly rTree: RangeRTree;

  constructor(data: RTreeItem<BoundedRange>[] = []) {
    this.rTree = new RangeRTree(data);
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
    if (dependencies.length === 0) {
      return;
    }
    const formulaZone = positionToZone(formulaPosition);
    const rTreeItems = dependencies.map(({ sheetId, zone }) => ({
      data: {
        sheetId: formulaPosition.sheetId,
        zone: formulaZone,
        unboundedZone: formulaZone,
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
   * Return all the cells that depend on the provided ranges,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getCellsDependingOn(ranges: Iterable<BoundedRange>): RangeSet {
    const visited = new RangeSet();
    const queue: BoundedRange[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.add(range);
      const impactedRanges = this.rTree.search(range).map(({ data }) => data);
      // console.log("impactedRanges", impactedRanges.length);
      // console.log("pushed to queue", [...new RangeSet(impactedRanges).difference(visited)].length);
      queue.push(...new RangeSet(impactedRanges).difference(visited));
    }

    // remove initial ranges
    for (const range of ranges) {
      visited.delete(range);
    }
    return visited;
  }
}
