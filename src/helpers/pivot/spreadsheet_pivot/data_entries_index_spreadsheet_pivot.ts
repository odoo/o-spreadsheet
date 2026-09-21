import { _t } from "../../../translation";
import { CellValue } from "../../../types/cells";
import { EvaluationError } from "../../../types/errors";
import { PivotDimension, PivotNode } from "../../../types/pivot";
import { DataEntries, DataEntry } from "./data_entry_spreadsheet_pivot";

type GroupKey = CellValue | undefined;

interface IndexNode {
  /**
   * The data entries matching the domain leading to this node.
   */
  entries: DataEntries;
  /**
   * Groups of the next row dimension.
   */
  rowChildren: Map<GroupKey, IndexNode> | undefined;
  /**
   * Groups of the next column dimension.
   */
  colChildren: Map<GroupKey, IndexNode> | undefined;
}

const EMPTY_DATA_ENTRIES: DataEntries = [];

/**
 * Index of the data entries of a spreadsheet pivot, used to retrieve the
 * entries matching a pivot domain without scanning all the entries.
 *
 * Starting with the row dimensions, one can descend either in the
 * next row dimension (`rowChildren`) or in the first column dimension
 * (`colChildren`).
 *
 * e.g. with the rows ["continent", "city"] and the columns ["team"]
 *
 *  root                          -> all the entries
 *  ├── (col) Team 1              -> [team=Team 1]
 *  ├── (col) Team 2              -> [team=Team 2]
 *  ├── (row) Europe              -> [continent=Europe]
 *  │   ├── (col) Team 1          -> [continent=Europe, team=Team 1]
 *  │   ├── (row) Brussels        -> [continent=Europe, city=Brussels]
 *  │   │   └── (col) Team 1      -> [continent=Europe, city=Brussels, team=Team 1]
 *  │   └── (row) Paris
 *  │       └── ...
 *  └── (row) North America
 *      └── ...
 *
 * Each entry is inserted once per couple (row prefix, column prefix) it belongs
 * to, which is exactly the number of pivot cells it contributes to.
 */
export class PivotDataEntriesIndex {
  private root: IndexNode = createIndexNode();

  constructor(
    dataEntries: DataEntries,
    private rowDimensions: PivotDimension[],
    private colDimensions: PivotDimension[]
  ) {
    for (const entry of dataEntries) {
      this.addEntry(entry);
    }
  }

  /**
   * Get the data entries matching the given domain.
   */
  getDataEntries(domain: PivotNode[]): DataEntries {
    // Classify the domain nodes into row keys and column keys.
    // They could be in any order (rows first or columns first)
    const rowKeys: GroupKey[] = [];
    const colKeys: GroupKey[] = [];
    // dispatch each domain node to the row or column dimension it matches
    for (const domainNode of domain) {
      const rowDimension = this.rowDimensions[rowKeys.length];
      if (rowDimension?.nameWithGranularity === domainNode.field) {
        rowKeys.push(toGroupKey(domainNode.value, rowDimension));
        continue;
      }
      const colDimension = this.colDimensions[colKeys.length];
      if (colDimension?.nameWithGranularity !== domainNode.field) {
        throw new EvaluationError(_t("Dimension %s does not exist", domainNode.field));
      }
      colKeys.push(toGroupKey(domainNode.value, colDimension));
    }
    // The row dimensions are always above the column ones in the tree
    let node: IndexNode | undefined = this.root;
    for (const key of rowKeys) {
      node = node.rowChildren?.get(key);
      if (!node) {
        return EMPTY_DATA_ENTRIES;
      }
    }
    for (const key of colKeys) {
      node = node.colChildren?.get(key);
      if (!node) {
        return EMPTY_DATA_ENTRIES;
      }
    }
    return node.entries;
  }

  private addEntry(entry: DataEntry) {
    let rowNode = this.root;
    this.addEntryToColumns(rowNode, entry);
    for (const dimension of this.rowDimensions) {
      rowNode = getOrCreateChild(rowNode, "rowChildren", getEntryGroupKey(entry, dimension));
      this.addEntryToColumns(rowNode, entry);
    }
  }

  /**
   * Add the entry to the given row node, and to each of its column prefixes.
   */
  private addEntryToColumns(rowNode: IndexNode, entry: DataEntry) {
    rowNode.entries.push(entry);
    let node = rowNode;
    for (const dimension of this.colDimensions) {
      node = getOrCreateChild(node, "colChildren", getEntryGroupKey(entry, dimension));
      node.entries.push(entry);
    }
  }
}

function createIndexNode(): IndexNode {
  return { entries: [], rowChildren: undefined, colChildren: undefined };
}

function getOrCreateChild(
  node: IndexNode,
  axis: "rowChildren" | "colChildren",
  key: GroupKey
): IndexNode {
  let children = node[axis];
  if (!children) {
    children = new Map<GroupKey, IndexNode>();
    node[axis] = children;
  }
  let child = children.get(key);
  if (!child) {
    child = createIndexNode();
    children.set(key, child);
  }
  return child;
}

function getEntryGroupKey(entry: DataEntry, dimension: PivotDimension): GroupKey {
  return toGroupKey(entry[dimension.nameWithGranularity]?.value, dimension);
}

function toGroupKey(value: GroupKey, dimension: PivotDimension): GroupKey {
  return dimension.type === "char" ? String(value) : value;
}
