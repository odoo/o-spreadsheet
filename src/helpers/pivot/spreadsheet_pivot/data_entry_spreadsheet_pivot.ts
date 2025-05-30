import { toNumber } from "../../../functions/helpers";
import { CellValue, DEFAULT_LOCALE, EvaluatedCell } from "../../../types";
import {
  DimensionTree,
  PivotDimension,
  PivotTableColumn,
  PivotTableRow,
} from "../../../types/pivot";
import { SpreadsheetPivotTable } from "../table_spreadsheet_pivot";
import { SpreadsheetPivotRuntimeDefinition } from "./runtime_definition_spreadsheet_pivot";

export type FieldName = string;
export type FieldValue = Pick<EvaluatedCell, "type" | "format" | "value" | "formattedValue">;

export type DataEntry = Record<FieldName, FieldValue | undefined>;
export type DataEntries = DataEntry[];

/**
 * This function converts a list of data entry into a spreadsheet pivot table.
 */
export function dataEntriesToSpreadsheetPivotTable(
  dataEntries: DataEntries,
  definition: SpreadsheetPivotRuntimeDefinition
) {
  const measureIds = definition.measures.filter((measure) => !measure.isHidden).map((m) => m.id);
  const columnsTree = dataEntriesToColumnsTree(dataEntries, definition.columns, 0);
  computeWidthOfColumnsNodes(columnsTree, measureIds.length);
  const cols = columnsTreeToColumns(columnsTree, definition);

  const rows = dataEntriesToRows(dataEntries, 0, definition.rows, [], []);
  // Add the total row
  rows.push({
    fields: [],
    values: [],
    indent: 0,
  });

  const fieldsType: Record<string, string> = {};
  for (const columns of definition.columns) {
    fieldsType[columns.fieldName] = columns.type;
  }
  for (const row of definition.rows) {
    fieldsType[row.fieldName] = row.type;
  }
  return new SpreadsheetPivotTable(cols, rows, measureIds, fieldsType);
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
  index: number,
  rows: PivotDimension[],
  fields: string[],
  values: CellValue[]
): PivotTableRow[] {
  if (index >= rows.length) {
    return [];
  }
  const row = rows[index];
  const rowName = row.nameWithGranularity;
  const groups = groupPivotDataEntriesBy(dataEntries, row);
  const orderedKeys = orderDataEntriesKeys(groups, row);
  const pivotTableRows: PivotTableRow[] = [];
  const _fields = fields.concat(rowName);
  for (const value of orderedKeys) {
    const _values = values.concat(value);
    pivotTableRows.push({
      fields: _fields,
      values: _values,
      indent: index,
    });
    const record = groups[value];
    if (record) {
      pivotTableRows.push(...dataEntriesToRows(record, index + 1, rows, _fields, _values));
    }
  }
  return pivotTableRows;
}

// -----------------------------------------------------------------------------
// COLUMNS
// -----------------------------------------------------------------------------

/**
 * Create the columns tree from data entries.
 */
function dataEntriesToColumnsTree(
  dataEntries: DataEntries,
  columns: PivotDimension[],
  index: number
): DimensionTree {
  if (index >= columns.length) {
    return [];
  }
  const column = columns[index];
  const colName = columns[index].nameWithGranularity;
  const groups = groupPivotDataEntriesBy(dataEntries, column);
  const orderedKeys = orderDataEntriesKeys(groups, columns[index]);
  return orderedKeys.map((key) => {
    return {
      value: groups[key]?.[0]?.[column.nameWithGranularity]?.value ?? null,
      field: colName,
      children: dataEntriesToColumnsTree(groups[key] || [], columns, index + 1),
      width: 0,
    };
  });
}
/**
 * Compute the width of each node in the column tree.
 * The width of a node is the sum of the width of its children.
 * For leaf nodes, the width is the number of measures.
 */
function computeWidthOfColumnsNodes(tree: DimensionTree, measureCount: number) {
  for (const key in tree) {
    const node = tree[key];
    if (node.children.length === 0) {
      node.width = measureCount;
    } else {
      computeWidthOfColumnsNodes(node.children, measureCount);
      node.width = node.children.reduce((acc, child) => acc + child.width, 0);
    }
  }
}

/**
 * Convert the columns tree to the columns
 */
function columnsTreeToColumns(
  mainTree: DimensionTree,
  definition: SpreadsheetPivotRuntimeDefinition
): PivotTableColumn[][] {
  const columnNames = definition.columns.map((col) => col.nameWithGranularity);
  const height = columnNames.length;
  const measures = definition.measures.filter((measure) => !measure.isHidden);
  const measureCount = measures.length;

  const headers: PivotTableColumn[][] = new Array(height).fill(0).map(() => []);

  function generateTreeHeaders(tree: DimensionTree, rowIndex: number, val: CellValue[]) {
    const row = headers[rowIndex];
    for (const node of tree) {
      const localVal = val.concat([node.value]);
      const cell: PivotTableColumn = {
        fields: columnNames.slice(0, rowIndex + 1),
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
  const hasColGroupBys = columnNames.length > 0;

  // 2) generate measures row
  const measureRow: PivotTableColumn[] = [];

  if (hasColGroupBys) {
    headers[headers.length - 1].forEach((cell) => {
      measures.forEach((measure) => {
        const measureCell = {
          fields: [...cell.fields, "measure"],
          values: [...cell.values, measure.id],
          width: 1,
          offset: 0,
        };
        measureRow.push(measureCell);
      });
    });
  }
  // Add the totals of the measures
  measures.forEach((measure) => {
    const measureCell = {
      fields: ["measure"],
      values: [measure.id],
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
export function groupPivotDataEntriesBy(dataEntries: DataEntries, dimension: PivotDimension) {
  return Object.groupBy(dataEntries, keySelector(dimension));
}

/**
 * Function used to identify the key that should be used to group dataEntries
 */
function keySelector(dimension: PivotDimension): (item: DataEntry, index: number) => string {
  const name = dimension.nameWithGranularity;
  return (item) => {
    return `${item[name]?.value ?? null}`;
  };
}

/**
 * Order the keys of the given data entries, based on the given dimension
 */
export function orderDataEntriesKeys(
  groups: Partial<Record<string, DataEntries>>,
  dimension: PivotDimension
): string[] {
  const order = dimension.order;
  if (!order) {
    return Object.keys(groups);
  }
  return Object.keys(groups).sort((a: string, b: string) =>
    compareDimensionValues(dimension, a, b)
  );
}

/**
 * Function used to compare two values, based on the type of the given dimension.
 * Used to order two values
 */
function compareDimensionValues(dimension: PivotDimension, a: string, b: string): number {
  if (a === "null") {
    return dimension.order === "asc" ? 1 : -1;
  }
  if (b === "null") {
    return dimension.order === "asc" ? -1 : 1;
  }
  if (dimension.type === "integer" || dimension.type === "datetime") {
    return dimension.order === "asc"
      ? toNumber(a, DEFAULT_LOCALE) - toNumber(b, DEFAULT_LOCALE)
      : toNumber(b, DEFAULT_LOCALE) - toNumber(a, DEFAULT_LOCALE);
  }
  return dimension.order === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}
