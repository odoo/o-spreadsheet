import { JetSet } from "../../../helpers";
import { futureRecomputeZones } from "../../../helpers/recompute_zones";
import type { UID, Zone } from "../../../types";
import type { PositionBitsEncoder, PositionId } from "./evaluator";
import type { RTreeBoundingBox, RTreeItem } from "./r_tree";
import { SpreadsheetRTree } from "./r_tree";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses an R-Tree data structure to efficiently find dependent cells.
 */
export class FormulaDependencyGraph {
  private readonly dependencies: Map<PositionId, RTreeItem<PositionId>[]> = new Map();
  private readonly rTree: SpreadsheetRTree<PositionId>;

  constructor(private readonly encoder: PositionBitsEncoder, data: RTreeItem<PositionId>[] = []) {
    this.rTree = new SpreadsheetRTree(data);
  }

  removeAllDependencies(formulaPositionId: PositionId) {
    const ranges = this.dependencies.get(formulaPositionId);
    if (!ranges) {
      return;
    }
    for (const range of ranges) {
      this.rTree.remove(range);
    }
    this.dependencies.delete(formulaPositionId);
  }

  addDependencies(formulaPositionId: PositionId, dependencies: RTreeBoundingBox[]): void {
    const rTreeItems = dependencies.map(({ sheetId, zone }) => ({
      data: formulaPositionId,
      boundingBox: {
        zone,
        sheetId,
      },
    }));
    for (const item of rTreeItems) {
      this.rTree.insert(item);
    }
    const existingDependencies = this.dependencies.get(formulaPositionId);
    if (existingDependencies) {
      existingDependencies.push(...rTreeItems);
    } else {
      this.dependencies.set(formulaPositionId, rTreeItems);
    }
  }

  /**
   * Return all the cells that depend on the provided ranges,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getCellsDependingOn(ranges: RTreeBoundingBox[]): Set<PositionId> {
    const visited: JetSet<PositionId> = new JetSet<PositionId>();
    const queue: RTreeBoundingBox[] = Array.from(ranges).reverse();

    while (queue.length > 0) {
      const range = queue.pop()!;
      visited.addMany(this.encoder.encodeBoundingBox(range));

      const impactedPositionIds = this.rTree.search(range).map((dep) => dep.data);
      const nextInQueue: Record<UID, Zone[]> = {};
      for (const positionId of impactedPositionIds) {
        if (!visited.has(positionId)) {
          const { sheetId, zone } = this.encoder.decodeToBoundingBox(positionId);
          if (!nextInQueue[sheetId]) {
            nextInQueue[sheetId] = [];
          }
          nextInQueue[sheetId].push(zone);
        }
      }
      for (const sheetId in nextInQueue) {
        const zones = futureRecomputeZones(nextInQueue[sheetId]);
        queue.push(...zones.map((zone) => ({ sheetId, zone })));
      }
    }
    visited.deleteMany(ranges.flatMap((r) => this.encoder.encodeBoundingBox(r)));
    return visited;
  }
}
