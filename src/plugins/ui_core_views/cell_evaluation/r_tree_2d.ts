/**
 * Vendored from https://github.com/mourner/rbush under MIT License
 */

import quickselect from "quickselect";

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ParentNode<T> {
  children: Node<T>[];
  height: number;
  leaf: false;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface LeafNode<T> {
  children: T[];
  height: number;
  leaf: true;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type Node<T> = ParentNode<T> | LeafNode<T>;

export default class RBush<T> {
  private _maxEntries: number;
  private _minEntries: number;
  private data: Node<T>;
  constructor(maxEntries = 9) {
    // max entries in a node is 9 by default; min node fill is 40% for best performance
    this._maxEntries = Math.max(4, maxEntries);
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
    this.clear();
  }

  all(): T[] {
    return this._all(this.data, []);
  }

  search(bbox: BBox): T[] {
    let node = this.data;
    const result: T[] = [];

    if (!intersects(bbox, node)) return result;

    const toBBox = this.toBBox;
    const nodesToSearch: any[] = [];

    while (node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childBBox = node.leaf ? toBBox(node.children[i]) : node.children[i];

        if (intersects(bbox, childBBox)) {
          if (node.leaf) result.push(node.children[i]);
          else if (contains(bbox, childBBox)) this._all(child, result);
          else nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }

    return result;
  }

  collides(bbox: BBox): boolean {
    let node = this.data;

    if (!intersects(bbox, node)) return false;

    const nodesToSearch: any[] = [];
    while (node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childBBox = node.leaf ? this.toBBox(node.children[i]) : node.children[i];

        if (intersects(bbox, childBBox)) {
          if (node.leaf || contains(bbox, childBBox)) return true;
          nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }

    return false;
  }

  load(items: readonly T[]): RBush<T> {
    if (!(items && items.length)) return this;

    if (items.length < this._minEntries) {
      for (let i = 0; i < items.length; i++) {
        this.insert(items[i]);
      }
      return this;
    }

    // recursively build the tree with the given data from scratch using OMT algorithm
    let node = this._build(items.slice(), 0, items.length - 1, 0);

    if (!this.data.children.length) {
      // save as is if tree is empty
      this.data = node;
    } else if (this.data.height === node.height) {
      // split root if trees have the same height
      this._splitRoot(this.data, node);
    } else {
      if (this.data.height < node.height) {
        // swap trees if inserted one is bigger
        const tmpNode = this.data;
        this.data = node;
        node = tmpNode;
      }

      // insert the small tree into the large tree at appropriate level
      this._insert(node, this.data.height - node.height - 1, true);
    }

    return this;
  }

  insert(item: T): RBush<T> {
    if (item) this._insert(item, this.data.height - 1);
    return this;
  }

  clear(): RBush<T> {
    this.data = createNode([]);
    return this;
  }

  remove(item: T, equals?: (a: T, b: T) => boolean): RBush<T> {
    if (!item) return this;

    let node: Node<T> = this.data;
    const bbox = this.toBBox(item);
    const path: any[] = [];
    const indexes: any[] = [];
    let i, parent, goingUp;

    // depth-first iterative tree traversal
    while (node || path.length) {
      if (!node) {
        // go up
        node = path.pop();
        parent = path[path.length - 1];
        i = indexes.pop();
        goingUp = true;
      }

      if (node.leaf) {
        // check current node
        const index = findItem(item, node.children, equals);

        if (index !== -1) {
          // item found, remove the item and condense tree upwards
          node.children.splice(index, 1);
          path.push(node);
          this._condense(path);
          return this;
        }
      }

      if (!goingUp && !node.leaf && contains(node, bbox)) {
        // go down
        path.push(node);
        indexes.push(i);
        i = 0;
        parent = node;
        node = node.children[0];
      } else if (parent) {
        // go right
        i++;
        node = parent.children[i];
        goingUp = false;
      } else {
        return this; // nothing found
      }
    }

    return this;
  }

  toBBox(item: T): BBox {
    // should be implemented in inherited class
    return item as unknown as BBox;
  }

  compareMinX(a: BBox, b: BBox): number {
    return a.minX - b.minX;
  }
  compareMinY(a: BBox, b: BBox): number {
    return a.minY - b.minY;
  }

  toJSON(): any {
    return this.data;
  }

  fromJSON(data: any): RBush<T> {
    this.data = data;
    return this;
  }

  _all(node: any, result: any) {
    const nodesToSearch: any[] = [];
    while (node) {
      if (node.leaf) result.push(...node.children);
      else nodesToSearch.push(...node.children);

      node = nodesToSearch.pop();
    }
    return result;
  }

  _build(items: T[], left: number, right: number, height: number) {
    const N = right - left + 1;
    let M = this._maxEntries;
    let node;

    if (N <= M) {
      // reached leaf level; return leaf
      node = createNode(items.slice(left, right + 1));
      calcBBox(node, this.toBBox);
      return node;
    }

    if (!height) {
      // target height of the bulk-loaded tree
      height = Math.ceil(Math.log(N) / Math.log(M));

      // target number of root entries to maximize storage utilization
      M = Math.ceil(N / Math.pow(M, height - 1));
    }

    node = createNode([]);
    node.leaf = false;
    node.height = height;

    // split the items into M mostly square tiles

    const N2 = Math.ceil(N / M);
    const N1 = N2 * Math.ceil(Math.sqrt(M));

    multiSelect(items, left, right, N1, this.compareMinX);

    for (let i = left; i <= right; i += N1) {
      const right2 = Math.min(i + N1 - 1, right);

      multiSelect(items, i, right2, N2, this.compareMinY);

      for (let j = i; j <= right2; j += N2) {
        const right3 = Math.min(j + N2 - 1, right2);

        // pack each entry recursively
        node.children.push(this._build(items, j, right3, height - 1));
      }
    }

    calcBBox(node, this.toBBox);

    return node;
  }

  _chooseSubtree(bbox: BBox, node: any, level: number, path: any) {
    while (true) {
      path.push(node);

      if (node.leaf || path.length - 1 === level) break;

      let minArea = Infinity;
      let minEnlargement = Infinity;
      let targetNode;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const area = bboxArea(child);
        const enlargement = enlargedArea(bbox, child) - area;

        // choose entry with the least area enlargement
        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          minArea = area < minArea ? area : minArea;
          targetNode = child;
        } else if (enlargement === minEnlargement) {
          // otherwise choose one with the smallest area
          if (area < minArea) {
            minArea = area;
            targetNode = child;
          }
        }
      }

      node = targetNode || node.children[0];
    }

    return node;
  }

  _insert(item: T, level: number, isNode?: boolean) {
    const bbox: BBox = isNode ? (item as BBox) : this.toBBox(item);
    const insertPath: any[] = [];

    // find the best node for accommodating the item, saving all nodes along the path too
    const node = this._chooseSubtree(bbox, this.data, level, insertPath);

    // put the item into the node
    node.children.push(item);
    extend(node, bbox);

    // split on node overflow; propagate upwards if necessary
    while (level >= 0) {
      if (insertPath[level].children.length > this._maxEntries) {
        this._split(insertPath, level);
        level--;
      } else break;
    }

    // adjust bboxes along the insertion path
    this._adjustParentBBoxes(bbox, insertPath, level);
  }

  // split overflowed node into two
  _split(insertPath: Node<T>[], level: number) {
    const node = insertPath[level];
    const M = node.children.length;
    const m = this._minEntries;

    this._chooseSplitAxis(node, m, M);

    const splitIndex = this._chooseSplitIndex(node, m, M);

    const newNode: Node<T> = createNode(
      node.children.splice(splitIndex, node.children.length - splitIndex)
    );
    newNode.height = node.height;
    newNode.leaf = node.leaf;

    calcBBox(node, this.toBBox);
    calcBBox(newNode, this.toBBox);

    if (level) insertPath[level - 1].children.push(newNode);
    else this._splitRoot(node, newNode);
  }

  _splitRoot(node: Node<T>, newNode: Node<T>) {
    // split root node
    this.data = createNode([node, newNode]);
    this.data.height = node.height + 1;
    this.data.leaf = false;
    calcBBox(this.data, this.toBBox);
  }

  _chooseSplitIndex(node: any, m: number, M: number) {
    let index;
    let minOverlap = Infinity;
    let minArea = Infinity;

    for (let i = m; i <= M - m; i++) {
      const bbox1 = distBBox(node, 0, i, this.toBBox);
      const bbox2 = distBBox(node, i, M, this.toBBox);

      const overlap = intersectionArea(bbox1, bbox2);
      const area = bboxArea(bbox1) + bboxArea(bbox2);

      // choose distribution with minimum overlap
      if (overlap < minOverlap) {
        minOverlap = overlap;
        index = i;

        minArea = area < minArea ? area : minArea;
      } else if (overlap === minOverlap) {
        // otherwise choose distribution with minimum area
        if (area < minArea) {
          minArea = area;
          index = i;
        }
      }
    }

    return index || M - m;
  }

  // sorts node children by the best axis for split
  _chooseSplitAxis(node: any, m: number, M: number) {
    const compareMinX = node.leaf ? this.compareMinX : compareNodeMinX;
    const compareMinY = node.leaf ? this.compareMinY : compareNodeMinY;
    const xMargin = this._allDistMargin(node, m, M, compareMinX);
    const yMargin = this._allDistMargin(node, m, M, compareMinY);

    // if total distributions margin value is minimal for x, sort by minX,
    // otherwise it's already sorted by minY
    if (xMargin < yMargin) node.children.sort(compareMinX);
  }

  // total margin of all possible split distributions where each node is at least m full
  _allDistMargin(node: any, m: number, M: number, compare: any) {
    node.children.sort(compare);

    const toBBox = this.toBBox;
    const leftBBox = distBBox(node, 0, m, toBBox);
    const rightBBox = distBBox(node, M - m, M, toBBox);
    let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

    for (let i = m; i < M - m; i++) {
      const child = node.children[i];
      extend(leftBBox, node.leaf ? toBBox(child) : child);
      margin += bboxMargin(leftBBox);
    }

    for (let i = M - m - 1; i >= m; i--) {
      const child = node.children[i];
      extend(rightBBox, node.leaf ? toBBox(child) : child);
      margin += bboxMargin(rightBBox);
    }

    return margin;
  }

  _adjustParentBBoxes(bbox: BBox, path: any, level: number) {
    // adjust bboxes along the given tree path
    for (let i = level; i >= 0; i--) {
      extend(path[i], bbox);
    }
  }

  _condense(path: any) {
    // go through the path, removing empty nodes and updating bboxes
    for (let i = path.length - 1, siblings; i >= 0; i--) {
      if (path[i].children.length === 0) {
        if (i > 0) {
          siblings = path[i - 1].children;
          siblings.splice(siblings.indexOf(path[i]), 1);
        } else this.clear();
      } else calcBBox(path[i], this.toBBox);
    }
  }
}

function findItem(item: any, items: any, equalsFn?: any) {
  if (!equalsFn) return items.indexOf(item);

  for (let i = 0; i < items.length; i++) {
    if (equalsFn(item, items[i])) return i;
  }
  return -1;
}

// calculate node's bbox from bboxes of its children
function calcBBox(node: any, toBBox: any) {
  distBBox(node, 0, node.children.length, toBBox, node);
}

// min bounding rectangle of node children from k to p-1
function distBBox(node: any, k: number, p: number, toBBox: any, destNode?: any) {
  if (!destNode) destNode = createNode([]);
  destNode.minX = Infinity;
  destNode.minY = Infinity;
  destNode.maxX = -Infinity;
  destNode.maxY = -Infinity;

  for (let i = k; i < p; i++) {
    const child = node.children[i];
    extend(destNode, node.leaf ? toBBox(child) : child);
  }

  return destNode;
}

function extend(a: BBox, b: BBox) {
  a.minX = Math.min(a.minX, b.minX);
  a.minY = Math.min(a.minY, b.minY);
  a.maxX = Math.max(a.maxX, b.maxX);
  a.maxY = Math.max(a.maxY, b.maxY);
  return a;
}

function compareNodeMinX(a: BBox, b: BBox) {
  return a.minX - b.minX;
}
function compareNodeMinY(a: BBox, b: BBox) {
  return a.minY - b.minY;
}

function bboxArea(a: BBox) {
  return (a.maxX - a.minX) * (a.maxY - a.minY);
}
function bboxMargin(a: BBox) {
  return a.maxX - a.minX + (a.maxY - a.minY);
}

function enlargedArea(a: BBox, b: BBox) {
  return (
    (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
    (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY))
  );
}

function intersectionArea(a: BBox, b: BBox) {
  const minX = Math.max(a.minX, b.minX);
  const minY = Math.max(a.minY, b.minY);
  const maxX = Math.min(a.maxX, b.maxX);
  const maxY = Math.min(a.maxY, b.maxY);

  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function contains(a: BBox, b: BBox) {
  return a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY;
}

function intersects(a: BBox, b: BBox) {
  return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY;
}

function createNode<T>(children: T[]): LeafNode<T> {
  return {
    children,
    height: 1,
    leaf: true,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

/**
 * sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
 * combines selection algorithm with binary divide & conquer approach
 */
function multiSelect(
  arr: unknown[],
  left: number,
  right: number,
  n: number,
  compare: (a: unknown, b: unknown) => number
) {
  const stack = [left, right];

  while (stack.length) {
    right = stack.pop()!;
    left = stack.pop()!;

    if (right - left <= n) continue;

    const mid = left + Math.ceil((right - left) / n / 2) * n;
    quickselect(arr, mid, left, right, compare);

    stack.push(left, mid, mid, right);
  }
}
