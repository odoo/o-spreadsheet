/**
 * This file contains structures used in the cell evaluation
 * to track relations between formula cells.
 */

// TODO remove type
type Node = Set<string>;

/**
 * This class is an implementation of a directed Graph.
 *
 * For something like
 * - A1:"= B1 + SQRT(B2)"
 * - C1:"= B1";
 * - C2:"= C1"
 *
 * we will have something like:
 * - (B1) ---> (A1, C1)
 * - (B2) ---> (A1)
 * - (C1) ---> (C2)
 */
export class FormulaDependencyGraph {
  private readonly nodes: Map<string, Node> = new Map();

  removeAllDependencies(formulaRc) {
    for (const value of this.nodes.values()) {
      value.delete(formulaRc);
    }
  }

  addDependencies(formulaRc: string, dependencies: string[]): void {
    for (const dependency of dependencies) {
      let node = this.nodes.get(dependency);
      if (node) {
        node.add(formulaRc);
      } else {
        this.nodes.set(dependency, new Set([formulaRc]));
      }
    }
  }

  /**
   * Return the cell and all cells that depend on it,
   * in the correct order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getEvaluationOrder(rc: string): Set<string> {
    const visited: Set<string> = new Set<string>();
    const queue: string[] = [rc];

    while (queue.length > 0) {
      const node = queue.shift()!;
      visited.add(node);

      const adjacentNodes = this.nodes.get(node) || new Set<string>();
      for (const adjacentNode of adjacentNodes) {
        if (!visited.has(adjacentNode)) {
          queue.push(adjacentNode);
        }
      }
    }

    return visited;
  }
}
