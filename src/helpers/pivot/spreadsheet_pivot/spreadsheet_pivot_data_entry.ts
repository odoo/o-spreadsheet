import { EvaluatedCell, Locale } from "../../../types";
import { PivotDimension, SPTableColumn, SPTableRow } from "../../../types/pivot";
import { createDate } from "./spreadsheet_pivot_date";
import { SpreadsheetPivotRuntimeDefinition } from "./spreadsheet_pivot_runtime_definition";
import { SpreadsheetPivotTable } from "./spreadsheet_pivot_table";

export type FieldName = string;
export type FieldValue = Pick<EvaluatedCell, "type" | "format" | "value">;

export type DataEntry = Record<FieldName, FieldValue | undefined>;
export type DataEntries = DataEntry[];

interface ColumnsNode {
  value: string;
  field: string;
  children: ColumnsTree;
  width: number;
}

type ColumnsTree = ColumnsNode[];

/**
 * This function converts a list of data entry into a spreadsheet pivot table.
 */
export function dataEntriesToSpreadsheetPivotTable(
  dataEntries: DataEntries,
  definition: SpreadsheetPivotRuntimeDefinition,
  locale: Locale
) {
  const columnsTree = dateEntriesToColumnsTree(dataEntries, locale, definition.columns, 0);
  computeWidthOfColumnsNodes(columnsTree, definition.measures.length);
  const cols = columnsTreeToColumns(columnsTree, definition);

  const rows = dataEntriesToRows(dataEntries, locale, 0, definition.rows, [], []);
  // Add the total row
  rows.push({
    fields: [],
    values: [],
    indent: 0,
  });

  const measures = definition.measures.map((m) => m.name);
  const rowTitle = rows.length > 0 ? rows[0].values[0] : "";
  return new SpreadsheetPivotTable(cols, rows, measures, rowTitle);
}

// -----------------------------------------------------------------------------
// ROWS
// -----------------------------------------------------------------------------

/**
 * Create the rows from the data entries. This function is called recursively
 * for each level of rows dimensions.
 */
function dataEntriesToRows(
  dataEntries: DataEntries,
  locale: Locale,
  index: number,
  rows: PivotDimension[],
  fields: string[],
  values: string[]
): SPTableRow[] {
  if (index >= rows.length) {
    return [];
  }
  const row = rows[index];
  const rowName = row.nameWithGranularity;
  const groups = groupBy(dataEntries, row, locale);
  const orderedKeys = orderDataEntriesKeys(groups, row);
  const spTableRows: SPTableRow[] = [];
  for (const value of orderedKeys) {
    const _fields = fields.concat(rowName);
    const _values = values.concat(value);
    spTableRows.push({
      fields: _fields,
      values: _values,
      indent: index,
    });
    const record = groups[value];
    if (record) {
      spTableRows.push(...dataEntriesToRows(record, locale, index + 1, rows, _fields, _values));
    }
  }
  return spTableRows;
}

// -----------------------------------------------------------------------------
// COLUMNS
// -----------------------------------------------------------------------------

/**
 * Create the columns tree from data entries.
 */
function dateEntriesToColumnsTree(
  dataEntries: DataEntries,
  locale: Locale,
  columns: PivotDimension[],
  index: number
): ColumnsTree {
  if (index >= columns.length) {
    return [];
  }
  const column = columns[index];
  const colName = columns[index].nameWithGranularity;
  const groups = groupBy(dataEntries, column, locale);
  const orderedKeys = orderDataEntriesKeys(groups, columns[index]);
  const columnsTree: ColumnsTree = [];
  for (const value of orderedKeys) {
    columnsTree.push({
      value,
      field: colName,
      children: dateEntriesToColumnsTree(groups[value] || [], locale, columns, index + 1),
      width: 0,
    });
  }
  return columnsTree;
}
/**
 * Compute the width of each node in the column tree.
 * The width of a node is the sum of the width of its children.
 * For leaf nodes, the width is the number of measures.
 */
function computeWidthOfColumnsNodes(tree: ColumnsTree, measureCount: number) {
  for (const key in tree) {
    const node = tree[key];
    if (Object.keys(node.children).length === 0) {
      node.width = measureCount;
    } else {
      computeWidthOfColumnsNodes(node.children, measureCount);
      node.width = Object.values(node.children).reduce((acc, child) => acc + child.width, 0);
    }
  }
}

/**
 * Convert the columns tree to the columns
 */
function columnsTreeToColumns(
  mainTree: ColumnsTree,
  definition: SpreadsheetPivotRuntimeDefinition
): SPTableColumn[][] {
  const columnsName = definition.columns.map((col) => col.nameWithGranularity);
  const height = columnsName.length;
  const measureCount = definition.measures.length;

  const headers: SPTableColumn[][] = new Array(height).fill(0).map(() => []);

  function generateTreeHeaders(tree: ColumnsTree, rowIndex: number, val: string[]) {
    const row = headers[rowIndex];
    for (const node of Object.values(tree)) {
      const localVal = val.concat([node.value]);
      const cell: SPTableColumn = {
        fields: columnsName.slice(0, rowIndex + 1),
        values: localVal,
        width: node.width,
        offset: 0,
      };
      row.push(cell);
      if (rowIndex <= height - 1) {
        generateTreeHeaders(node.children, rowIndex + 1, localVal);
      }
    }
  }
  generateTreeHeaders(mainTree, 0, []);
  const hasColGroupBys = columnsName.length > 0;

  // 2) generate measures row
  const measureRow: SPTableColumn[] = [];

  if (hasColGroupBys) {
    headers[headers.length - 1].forEach((cell) => {
      definition.measures.forEach((measure) => {
        const measureCell = {
          fields: [...cell.fields, "measure"],
          values: [...cell.values, measure.name],
          width: 1,
          offset: 0,
        };
        measureRow.push(measureCell);
      });
    });
  }
  // Add the totals of the measures
  definition.measures.forEach((measure) => {
    const measureCell = {
      fields: ["measure"],
      values: [measure.name],
      width: 1,
      offset: 0,
    };
    measureRow.push(measureCell);
  });
  headers.push(measureRow);
  // 3) Add the total cell
  if (headers.length === 1) {
    headers.unshift([]); // Will add the total there
  }
  headers[headers.length - 2].push({
    fields: [],
    values: [],
    width: measureCount,
    offset: 0,
  });

  return headers;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * Group the dataEntries based on the given dimension
 */
export function groupBy(dataEntries: DataEntries, dimension: PivotDimension, locale: Locale) {
  const groups = Object.groupBy(dataEntries, keySelector(dimension, locale));
  return groups;
}

/**
 * Function used to identify the key that should be used to group dataEntries
 */
function keySelector(
  dimension: PivotDimension,
  locale: Locale
): (item: DataEntry, index: number) => string {
  const name = dimension.name;
  return (item, index) => {
    const value = item[name]?.value ?? null;
    if (dimension.type !== "date") {
      return `${value}`;
    }
    return `${createDate(dimension, value, locale)}`;
  };
}

/**
 * Order the keys of the given data entries, based on the given dimension
 */
function orderDataEntriesKeys(
  groups: Partial<Record<string, DataEntries>>,
  dimension: PivotDimension
): string[] {
  const order = dimension.order;
  if (!order) {
    return Object.keys(groups);
  }
  return Object.keys(groups).sort((a: string, b: string) =>
    compareDimensionValues(a, b, dimension)
  );
}

/**
 * Function used to compare two values, based on the type of the given dimension.
 * Used to order two values
 */
function compareDimensionValues(a: string, b: string, dimension: PivotDimension): number {
  if (dimension.type === "integer" || dimension.type === "date") {
    return dimension.order === "asc"
      ? parseInt(a, 10) - parseInt(b, 10)
      : parseInt(b, 10) - parseInt(a, 10);
  }
  return dimension.order === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}
