/**
 * This file contains the implementation of a Graph, used in
 * the cell evaluation to track dependencies between cells.
 *
 * Graph is a directed graph, i.e. edge between two nodes is
 * unidirectional. BiDirectionalGraph is an implementation of a
 * undirected graph.
 */

/**
 * This class represent a node of a Graph. It contains a value
 * (xc) and a list of nodes. The list represents all the links from
 * this node to the nodes present in the list.
 */
export class Node {
  constructor(public xc: string, public adjacent: Node[] = []) {}

  addAdjacent(node: Node): void {
    this.adjacent.push(node);
  }

  removeAdjacent(xc: string): Node | null {
    const index = this.adjacent.findIndex((node) => node.xc === xc);

    if (index > -1) {
      return this.adjacent.splice(index, 1)[0];
    }

    return null;
  }
}

/**
 * This class is an implementation of a directed Graph.
 */
export class Graph {
  nodes: Map<string, Node> = new Map();

  addNode(xc: string): Node {
    let node = this.nodes.get(xc);
    if (node) {
      return node;
    }
    node = new Node(xc);
    this.nodes.set(xc, node);
    return node;
  }

  getAdjacentNodes(xc: string): Node[] {
    return this.nodes.get(xc)?.adjacent || [];
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(xc: string): Node | undefined {
    const nodeToRemove = this.nodes.get(xc);

    if (!nodeToRemove) {
      return undefined;
    }
    this.nodes.forEach((node) => node.removeAdjacent(nodeToRemove.xc));
    this.nodes.delete(xc);
    return nodeToRemove;
  }

  /**
   * Create an edge between two nodes
   *
   */
  addEdge(source: string, destination: string): void {
    const sourceNode = this.addNode(source);
    const destinationNode = this.addNode(destination);
    sourceNode.addAdjacent(destinationNode);
  }

  /**
   * Remove an edge between two nodes
   */
  removeEdge(source: string, destination: string): void {
    const sourceNode = this.nodes.get(source);
    const destinationNode = this.nodes.get(destination);
    if (sourceNode && destinationNode) {
      sourceNode.removeAdjacent(destination);
    }
  }

  private depthFirstSearchAdjacent(
    node: Node,
    visited: Set<string>,
    callback: (xc: string) => void
  ): void {
    visited.add(node.xc);

    for (const adjacent of node.adjacent) {
      if (!visited.has(adjacent.xc)) {
        callback(adjacent.xc);
        this.depthFirstSearchAdjacent(adjacent, visited, callback);
      }
    }
  }

  /**
   * See https://en.wikipedia.org/wiki/Depth-first_search
   */
  depthFirstSearch(xc: string, callback: (xc: string) => void) {
    const visited: Set<string> = new Set<string>();

    visited.add(xc);
    const node = this.nodes.get(xc);
    if (!node) {
      return;
    }
    this.depthFirstSearchAdjacent(node, visited, callback);
  }

  hasRelationBetween(root: string, target: string): boolean {
    const node = this.nodes.get(root);
    if (!node) {
      return false;
    }
    for (const neighbor of node.adjacent) {
      if (neighbor.xc === target) {
        return true;
      }
    }
    return false;
  }

  hasNode(xc: string): boolean {
    return this.nodes.has(xc);
  }
}
/**
 * This class is an implementation of an undirect graph.
 */
export class BiDirectionalGraph {
  topDown: Graph = new Graph();
  bottomUp: Graph = new Graph();

  addNode(xc: string): Node {
    return this.topDown.addNode(xc);
  }

  getTopDownAdjacentNodes(xc: string): Node[] {
    return this.topDown.getAdjacentNodes(xc);
  }

  getBottomUpAdjacentNodes(xc: string): Node[] {
    return this.bottomUp.getAdjacentNodes(xc);
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(xc: string): Node | undefined {
    const topDownNode = this.topDown.removeNode(xc);
    const bottomUpNode = this.bottomUp.removeNode(xc);
    return topDownNode || bottomUpNode;
  }

  /**
   * Create an edge between two nodes
   *
   */
  addEdge(source: string, destination: string): void {
    this.topDown.addEdge(source, destination);
    this.bottomUp.addEdge(destination, source);
  }

  /**
   * Remove an edge between two nodes
   */
  removeEdge(source: string, destination: string): void {
    this.topDown.removeEdge(source, destination);
    this.bottomUp.removeEdge(destination, source);
  }

  hasRelationBetween(root: string, target: string): boolean {
    return (
      this.topDown.hasRelationBetween(root, target) ||
      this.bottomUp.hasRelationBetween(root, target)
    );
  }

  hasTopDownNode(xc: string): boolean {
    return this.topDown.nodes.has(xc);
  }
  hasBottomUpNode(xc: string): boolean {
    return this.bottomUp.nodes.has(xc);
  }
}
