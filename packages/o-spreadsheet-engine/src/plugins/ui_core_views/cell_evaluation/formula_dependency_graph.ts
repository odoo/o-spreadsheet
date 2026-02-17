import { PositionMap } from "../../../helpers/cells/position_map";
import { CellPosition } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";
import { RTreeBoundingBox, RTreeItem } from "./r_tree";
import { RangeSet } from "./range_set";

import { UID } from "../../..";
import { DependencyGraph } from "./dependencies_buckets";
import { SheetDependencyGraph } from "./simple_interval_tree";

/**
 * Implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 * It uses an R-Tree data structure to efficiently find dependent cells.
 */
export class FormulaDependencyGraphRTree {
  private readonly dependencies: PositionMap<RTreeItem<BoundedRange>[]> = new PositionMap();
  private readonly bySheet: Record<UID, SheetDependencyGraph> = {};

  constructor(data: RTreeItem<BoundedRange>[] = []) {
    for (const item of data) {
      const { sheetId, zone } = item.data;
      const graph = this.bySheet[sheetId] || (this.bySheet[sheetId] = new SheetDependencyGraph());
      graph.addDependencies({ sheetId, col: zone.left, row: zone.top }, [item.boundingBox]);
      // this.addDependencies({ sheetId, col: zone.left, row: zone.top }, [item.boundingBox]);
    }
    // this.bySheet = new DependenciesRTree(data);
  }

  removeAllDependencies(formulaPosition: CellPosition) {
    return;
    // const ranges = this.dependencies.get(formulaPosition);
    // if (!ranges) {
    //   return;
    // }
    // for (const range of ranges) {
    //   this.bySheet.remove(range);
    // }
    // this.dependencies.delete(formulaPosition);
  }

  addDependencies(formulaPosition: CellPosition, dependencies: RTreeBoundingBox[]): void {
    // const rTreeItems = dependencies.map(({ sheetId, zone }) => ({
    //   data: {
    //     sheetId: formulaPosition.sheetId,
    //     zone: positionToZone(formulaPosition),
    //   },
    //   boundingBox: {
    //     zone,
    //     sheetId,
    //   },
    // }));
    for (const range of dependencies) {
      const sheetId = range.sheetId;
      let graph = this.bySheet[sheetId];
      if (!graph) {
        graph = new SheetDependencyGraph();
        this.bySheet[sheetId] = graph;
      }
      graph.addDependencies(formulaPosition, [range]);
    }
    // for (const item of rTreeItems) {
    //   this.bySheet.insert(item);
    // }
    // const existingDependencies = this.dependencies.get(formulaPosition);
    // if (existingDependencies) {
    //   existingDependencies.push(...rTreeItems);
    // } else {
    //   this.dependencies.set(formulaPosition, rTreeItems);
    // }
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
      const graph = this.bySheet[range.sheetId];
      if (!graph) {
        continue;
      }
      const impactedZones = graph.getRangeDependents([range.zone]);
      queue.push(...impactedZones.difference(visited));
    }

    // remove initial ranges
    for (const range of ranges) {
      visited.delete(range);
    }
    return visited;
  }
}

/**
 * FormulaDependencyGraphV2: Uses one DependencyGraph per sheet.
 */
export class FormulaDependencyGraph {
  private readonly graphs: Map<UID, DependencyGraph> = new Map();

  constructor(data: RTreeItem<BoundedRange>[] = []) {
    for (const item of data) {
      const { sheetId, zone } = item.data;
      this.addDependencies({ sheetId, col: zone.left, row: zone.top }, [item.boundingBox]);
    }
  }

  removeAllDependencies(formulaPosition: CellPosition) {
    // TODO
  }

  addDependencies(formulaPosition: CellPosition, dependencies: RTreeBoundingBox[]): void {
    for (const { zone, sheetId } of dependencies) {
      let graph = this.graphs.get(sheetId);
      if (!graph) {
        graph = new DependencyGraph();
        this.graphs.set(sheetId, graph);
      }
      graph.addDependency(formulaPosition, zone);
    }
    // Track dependents for getCellsDependingOn
    // const key = this._posKey(formulaPosition);
    // let set = this.dependents.get(key);
    // if (!set) {
    //   set = new ZoneSet();
    //   this.dependents.set(key, set);
    // }
    // for (const { zone } of dependencies) {
    //   set.add(zone);
    // }
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
      // Find dependents for this range
      const graph = this.graphs.get(range.sheetId);
      if (graph) {
        const dependents = graph.getRangeDependents(range.zone);
        queue.push(...new RangeSet(dependents).difference(visited));
        // for (const dep of dependents) {
        //   if (!visited.has(dep)) {
        //     // should add the difference
        //     queue.push(dep);
        //   }
        // }
      }
    }
    // remove initial ranges
    for (const range of ranges) {
      visited.delete(range);
    }
    ("654f203e-9ead-4bc3-9d1b-942969000ee1:2-16936-0-0");
    console.log(
      "Visited dependents:",
      [...visited].map(
        (r) => `${r.sheetId}:${r.zone.top}-${r.zone.bottom}-${r.zone.left}-${r.zone.right}`
      )
    );
    return visited;
  }
}
