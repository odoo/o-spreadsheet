import { JetSet } from "../misc";
import { PositionId } from "./evaluator";

/**
 * This class is an implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 */
export class FormulaDependencyGraph {
  /**
   * Internal structure:
   * - key: a cell position (encoded as an integer)
   * - value: a set of cell positions that depends on the key
   *
   * Given
   * - A1:"= B1 + SQRT(B2)"
   * - C1:"= B1";
   * - C2:"= C1"
   *
   * we will have something like:
   * - B1 ---> (A1, C1)   meaning A1 and C1 depends on B1
   * - B2 ---> (A1)       meaning A1 depends on B2
   * - C1 ---> (C2)       meaning C2 depends on C1
   */
  private readonly inverseDependencies: Map<PositionId, Set<PositionId>> = new Map();
  private readonly dependencies: Map<PositionId, PositionId[]> = new Map();

  removeAllDependencies(formulaPositionId: PositionId) {
    const dependencies = this.dependencies.get(formulaPositionId);
    if (!dependencies) {
      return;
    }
    for (const dependency of dependencies) {
      this.inverseDependencies.get(dependency)?.delete(formulaPositionId);
    }
    this.dependencies.delete(formulaPositionId);
  }

  addDependencies(formulaPositionId: PositionId, dependencies: PositionId[]): void {
    for (const dependency of dependencies) {
      const inverseDependencies = this.inverseDependencies.get(dependency);
      if (inverseDependencies) {
        inverseDependencies.add(formulaPositionId);
      } else {
        this.inverseDependencies.set(dependency, new Set([formulaPositionId]));
      }
    }
    const existingDependencies = this.dependencies.get(formulaPositionId);
    if (existingDependencies) {
      existingDependencies.push(...dependencies);
    } else {
      this.dependencies.set(formulaPositionId, dependencies);
    }
  }

  /**
   * Return the cell and all cells that depend on it,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getCellsDependingOn(positionIds: Iterable<PositionId>): Set<PositionId> {
    const visited: JetSet<PositionId> = new JetSet<PositionId>();
    const queue: PositionId[] = Array.from(positionIds);

    while (queue.length > 0) {
      const node = queue.shift()!;
      visited.add(node);

      const adjacentNodes = this.inverseDependencies.get(node) || new Set<PositionId>();
      for (const adjacentNode of adjacentNodes) {
        if (!visited.has(adjacentNode)) {
          queue.push(adjacentNode);
        }
      }
    }
    visited.delete(...positionIds);
    return visited;
  }
}
