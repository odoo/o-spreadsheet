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

  getAdjacentNodes(xc: string): Node[] | undefined {
    return this.nodes.get(xc)?.adjacent;
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

    callback(node.xc);

    for (const adjacent of node.adjacent) {
      if (!visited.has(adjacent.xc)) {
        this.depthFirstSearchAdjacent(adjacent, visited, callback);
      }
    }
  }

  depthFirstSearch(xc: string, callback: (xc: string) => void) {
    const visited: Set<string> = new Set<string>();
    callback(xc);
    visited.add(xc);
    const node = this.nodes.get(xc);
    if (!node) {
      return;
    }
    this.depthFirstSearchAdjacent(node, visited, callback);
  }
}
