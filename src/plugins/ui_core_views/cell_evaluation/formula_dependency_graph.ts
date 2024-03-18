import { positions, positionToZone } from "../../../helpers";
import { CellPosition } from "../../../types";
import { PositionMap } from "./position_map";
import { PositionSet } from "./position_set";
import { RTreeBoundingBox, RTreeItem, SpreadsheetRTree } from "./r_tree";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses an R-Tree data structure to efficiently find dependent cells.
 */
export class FormulaDependencyGraph {
  private readonly dependencies: PositionMap<RTreeItem<CellPosition>[]> = new PositionMap();
  private readonly rTree: SpreadsheetRTree<CellPosition>;

  constructor(
    private readonly createEmptyPositionSet: () => PositionSet,
    data: RTreeItem<CellPosition>[] = []
  ) {
    this.rTree = new SpreadsheetRTree(data);
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
      data: formulaPosition,
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
   * Return the cell and all cells that depend on it,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getCellsDependingOn(ranges: RTreeBoundingBox[]): PositionSet {
    const visited = this.createEmptyPositionSet();
    const queue: RTreeBoundingBox[] = Array.from(ranges).reverse();
    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.addMany(
        positions(range.zone).map((position) => ({ sheetId: range.sheetId, ...position }))
      );

      const impactedPositions = this.rTree.search(range).map((dep) => dep.data);
      for (const position of impactedPositions) {
        if (!visited.has(position)) {
          queue.push({ sheetId: position.sheetId, zone: positionToZone(position) });
        }
      }
    }
    visited.deleteMany(
      ranges.flatMap((r) =>
        positions(r.zone).map((position) => ({ sheetId: r.sheetId, ...position }))
      )
    );
    return visited;
  }
}
