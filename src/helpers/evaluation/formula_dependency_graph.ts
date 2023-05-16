/**
 * This class is an implementation of a dependency Graph.
 * The graph is used to evaluate the cells in the correct
 * order, and should be updated each time a cell's content is modified
 *
 */
export class FormulaDependencyGraph {
  /**
   * Internal structure:
   * - key: a cell rc
   * - value: a set of cell rc that depends on the key
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
  private readonly nodes: Map<string, Set<string>> = new Map();

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
  getDependencyPrecedence(rc: string): Set<string> {
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
