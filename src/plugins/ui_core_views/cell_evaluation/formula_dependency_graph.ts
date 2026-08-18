import { positionToZone } from "../../../helpers";
import { recomputeZones } from "../../../helpers/recompute_zones";
import { CellPosition, UID, Zone } from "../../../types";
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
   * Return all the cells that depend on the provided ranges,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getCellsDependingOn(ranges: RTreeBoundingBox[], ignore: PositionSet): PositionSet {
    const visited = this.createEmptyPositionSet();
    const queue: RTreeBoundingBox[] = Array.from(ranges).reverse();

    // At the end we want to remove from the visited set all the initial range positions, except the ones we're actually depending on
    // Some of the cells of the initial ranges might be depending on other cells of the initial ranges, and we want to keep those in the visited set
    const initialPositionsToRemove = this.createEmptyPositionSet();
    for (const range of ranges) {
      const zone = range.zone;
      const sheetId = range.sheetId;
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          initialPositionsToRemove.add({ sheetId, col, row });
        }
      }
    }

    while (queue.length > 0) {
      const range = queue.pop()!;
      const zone = range.zone;
      const sheetId = range.sheetId;
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          visited.add({ sheetId, col, row });
        }
      }

      const impactedPositions = this.rTree.search(range).map((dep) => dep.data);
      const nextInQueue: Record<UID, Zone[]> = {};
      for (const position of impactedPositions) {
        if (ignore.has(position)) {
          continue;
        }
        initialPositionsToRemove.delete(position);
        if (!visited.has(position)) {
          if (!nextInQueue[position.sheetId]) {
            nextInQueue[position.sheetId] = [];
          }
          nextInQueue[position.sheetId].push(positionToZone(position));
        }
      }
      for (const sheetId in nextInQueue) {
        const zones = recomputeZones(nextInQueue[sheetId], []);
        queue.push(...zones.map((zone) => ({ sheetId, zone })));
      }
    }

    for (const position of initialPositionsToRemove) {
      visited.delete(position);
    }

    return visited;
  }
}
