import {
  CellValue,
  DimensionTree,
  Pivot,
  PivotColRowDomain,
  PivotDomain,
  PivotNode,
  SortDirection,
} from "../../types";
import { clip, deepCopy } from "../misc";

export const PREVIOUS_VALUE = "(previous)";
export const NEXT_VALUE = "(next)";

export function getDomainOfParentRow(pivot: Pivot, domain: PivotDomain): PivotDomain {
  const { colDomain, rowDomain } = domainToColRowDomain(pivot, domain);
  return [...colDomain, ...rowDomain.slice(0, rowDomain.length - 1)];
}

export function getDomainOfParentCol(pivot: Pivot, domain: PivotDomain): PivotDomain {
  const { colDomain, rowDomain } = domainToColRowDomain(pivot, domain);
  return [...colDomain.slice(0, colDomain.length - 1), ...rowDomain];
}

/**
 * Split a pivot domain into the part related to the rows of the pivot, and the part related to the columns.
 */
export function domainToColRowDomain(pivot: Pivot, domain: PivotDomain): PivotColRowDomain {
  const rowFields = pivot.definition.rows.map((c) => c.nameWithGranularity);
  const rowDomain = domain.filter((node) => rowFields.includes(node.field));
  const columnFields = pivot.definition.columns.map((c) => c.nameWithGranularity);
  const colDomain = domain.filter((node) => columnFields.includes(node.field));
  return { colDomain, rowDomain };
}

export function getDimensionDomain(
  pivot: Pivot,
  dimension: "column" | "row",
  domain: PivotDomain
): PivotDomain {
  return dimension === "column"
    ? domainToColRowDomain(pivot, domain).colDomain
    : domainToColRowDomain(pivot, domain).rowDomain;
}

function getFieldValueInDomain(
  fieldNameWithGranularity: string,
  domain: PivotDomain
): CellValue | undefined {
  const node = domain.find((n) => n.field === fieldNameWithGranularity);
  return node?.value;
}

export function isDomainIsInPivot(pivot: Pivot, domain: PivotDomain) {
  const { rowDomain, colDomain } = domainToColRowDomain(pivot, domain);
  return (
    checkIfDomainInInTree(rowDomain, pivot.getTableStructure().getRowTree()) &&
    checkIfDomainInInTree(colDomain, pivot.getTableStructure().getColTree())
  );
}

function checkIfDomainInInTree(domain: PivotDomain, tree: DimensionTree) {
  return walkDomainTree(domain, tree) !== undefined;
}

/**
 * Given a tree of the col/rows of a pivot, and a domain related to those col/rows, return the node of the tree
 * corresponding to the domain.
 *
 * @param domain The domain to find in the tree
 * @param tree The tree to search in7
 * @param stopAtField If provided, the search will stop at the field with this name
 */
function walkDomainTree(
  domain: PivotDomain,
  tree: DimensionTree,
  stopAtField?: string
): DimensionTree | undefined {
  let currentTreeNode = tree;
  for (const node of domain) {
    const child = currentTreeNode.find((n) => n.value === node.value);
    if (!child) {
      return undefined;
    }
    if (child.field === stopAtField) {
      return currentTreeNode;
    }
    currentTreeNode = child.children;
  }
  return currentTreeNode;
}

/**
 * Get the domain parent of the given domain with the field `parentFieldName` as leaf of the domain.
 *
 * In practice, if the `parentFieldName` is a row in the pivot, the helper will return a domain with the same column
 * domain, and with a row domain all groupBys children to `parentFieldName` removed.
 */
export function getFieldParentDomain(
  pivot: Pivot,
  parentFieldName: string,
  domain: PivotDomain
): PivotDomain {
  let { rowDomain, colDomain } = domainToColRowDomain(pivot, domain);
  const dimension = getFieldDimensionType(pivot, parentFieldName);

  if (dimension === "row") {
    const index = rowDomain.findIndex((node) => node.field === parentFieldName);
    if (index === -1) {
      return domain;
    }
    rowDomain = rowDomain.slice(0, index + 1);
  } else {
    const index = colDomain.findIndex((node) => node.field === parentFieldName);
    if (index === -1) {
      return domain;
    }
    colDomain = colDomain.slice(0, index + 1);
  }

  return [...rowDomain, ...colDomain];
}

/**
 * Replace in the domain the value of the field `fieldNameWithGranularity` with the given `value`
 */
export function replaceFieldValueInDomain(
  domain: PivotDomain,
  fieldNameWithGranularity: string,
  value: CellValue
): PivotDomain {
  domain = deepCopy(domain);
  const node = domain.find((n) => n.field === fieldNameWithGranularity);
  if (!node) {
    return domain;
  }
  node.value = value;
  return domain;
}

export function isFieldInDomain(nameWithGranularity: string, domain: PivotDomain): boolean {
  return domain.some((node) => node.field === nameWithGranularity);
}

/**
 * Check if the field is in the rows or columns of the pivot
 */
export function getFieldDimensionType(pivot: Pivot, nameWithGranularity: string): "row" | "column" {
  const rowFields = pivot.definition.rows.map((c) => c.nameWithGranularity);
  if (rowFields.includes(nameWithGranularity)) {
    return "row";
  }
  const columnFields = pivot.definition.columns.map((c) => c.nameWithGranularity);
  if (columnFields.includes(nameWithGranularity)) {
    return "column";
  }
  throw new Error(`Field ${nameWithGranularity} not found in pivot`);
}

/**
 * Replace in the given domain the value of the field `fieldNameWithGranularity` with the previous or next value.
 */
export function getPreviousOrNextValueDomain(
  pivot: Pivot,
  domain: PivotDomain,
  fieldNameWithGranularity: string,
  direction: typeof PREVIOUS_VALUE | typeof NEXT_VALUE
): PivotDomain | undefined {
  const dimension = getFieldDimensionType(pivot, fieldNameWithGranularity);
  const tree =
    dimension === "row"
      ? pivot.getTableStructure().getRowTree()
      : pivot.getTableStructure().getColTree();
  const dimDomain = getDimensionDomain(pivot, dimension, domain);

  const currentTreeNode = walkDomainTree(dimDomain, tree, fieldNameWithGranularity);
  const values = currentTreeNode?.map((n) => n.value) ?? [];
  const value = getFieldValueInDomain(fieldNameWithGranularity, domain);
  if (value === undefined) {
    return undefined;
  }

  const valueIndex = values.indexOf(value);
  if (value === undefined || valueIndex === -1) {
    return undefined;
  }

  const offset = direction === PREVIOUS_VALUE ? -1 : 1;
  const newIndex = clip(valueIndex + offset, 0, values.length - 1);
  return replaceFieldValueInDomain(domain, fieldNameWithGranularity, values[newIndex]);
}

export function domainToString(domain: PivotDomain | undefined): string {
  return domain ? domain.map(domainNodeToString).join(", ") : "";
}

export function domainNodeToString(domainNode: PivotNode | undefined): string {
  return domainNode ? `${domainNode.field}=${domainNode.value}` : "";
}

/**
 *
 * For the ranking, the pivot cell values of a column (or row) at the same depth are grouped together before being sorted
 * and ranked.
 *
 * The grouping of a pivot cell is done with both the value of the domain nodes that are parent of the field
 * `fieldNameWithGranularity` and the value of the last node of the domain of the pivot cell, if it's not the field
 * `fieldNameWithGranularity`.
 *
 * For example, let's take a pivot grouped by (Date:year, Stage, User, Product), where we want to rank by "Stage" field.
 * The domain nodes parents of the "Stage" are [Date:year]. The pivot cell with domain:
 * - [Date:year=2021] is not ranked because it does not contain the "Stage" field
 * - [Date:year=2021, Stage=Lead] is grouped with the cells [Date:year=2021, Stage=*, User=None, Product=None],
 *      and then ranked within the group
 * - [Date:year=2021, Stage=Lead, User=Bob] is grouped with the cells [Date:year=2021, Stage=*, User=Bob, Product=None],
 *      and then ranked within the group
 * - [Date:year=2021, Stage=Lead, User=Bob, Product=Table] is grouped with the cells [Date:year=2021, Stage=*, User=*, Product=Table],
 *      and then ranked within the group
 *
 * If we rank the pivot on "User" instead, the parent domain becomes [Date:year, Sage] .The cell with domain:
 * - [Date:year=2021] is not ranked because it does not contain the "Stage" field
 * - [Date:year=2021, Stage=Lead] is not ranked because it does not contain the "User" field
 * - [Date:year=2021, Stage=Lead, User=Bob] is grouped with the cells [Date:year=2021, Stage=Lead, User=Bob, Product=None],
 *      and then ranked within the group
 * - [Date:year=2021, Stage=Lead, User=Bob, Product=Table] is grouped with the cells with [Date:year=2021, Stage=Lead, User=*, Product=Table],
 *     and then ranked within the group
 *
 */
export function getRankingDomainKey(domain: PivotDomain, fieldNameWithGranularity: string): string {
  const index = domain.findIndex((node) => node.field === fieldNameWithGranularity);
  if (index === -1) {
    return "";
  }

  const parent = domain.slice(0, index);
  const lastNode = domain.at(-1)!;
  return domainToString(
    lastNode.field === fieldNameWithGranularity ? parent : [...parent, lastNode]
  );
}

/**
 * The running total domain is the domain without the field `fieldNameWithGranularity`, ie. we do the running total of
 * all the pivot cells of the column that have any value for the field `fieldNameWithGranularity` and the same value for
 * the other fields.
 */
export function getRunningTotalDomainKey(
  domain: PivotDomain,
  fieldNameWithGranularity: string
): string {
  const index = domain.findIndex((node) => node.field === fieldNameWithGranularity);
  if (index === -1) {
    return "";
  }
  return domainToString([...domain.slice(0, index), ...domain.slice(index + 1)]);
}

export function sortPivotTree(
  tree: DimensionTree,
  baseDomain: PivotDomain,
  sortDirection: SortDirection,
  getSortValue: (domain: PivotDomain) => number
): DimensionTree {
  const sortedTree = tree
    .map((node) => {
      const fullDomain = [...baseDomain, { field: node.field, value: node.value, type: node.type }];
      const sortValue = getSortValue(fullDomain);
      return { ...node, sortValue, fullDomain };
    })
    .sort((node1, node2) =>
      sortDirection === "asc"
        ? node1.sortValue - node2.sortValue
        : node2.sortValue - node1.sortValue
    );

  for (const node of sortedTree) {
    node.children = sortPivotTree(node.children, node.fullDomain, sortDirection, getSortValue);
  }

  return sortedTree;
}
