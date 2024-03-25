import { CellValue } from "./cells";
import { Format } from "./format";
import { Locale } from "./locale";

export type Aggregator =
  | "array_agg"
  | "count"
  | "count_distinct"
  | "bool_and"
  | "bool_or"
  | "max"
  | "min"
  | "avg"
  | "sum";

export type Granularity = "day" | "week" | "month" | "quarter" | "year";

export interface PivotCoreDimension {
  name: string;
  order?: "asc" | "desc";
  granularity?: Granularity | string;
}

export interface PivotCoreMeasure {
  name: string;
  aggregator?: Aggregator | string;
}

export interface CommonPivotCoreDefinition {
  columns: PivotCoreDimension[];
  rows: PivotCoreDimension[];
  measures: PivotCoreMeasure[];
  name: string;
}

export interface SpreadsheetPivotCoreDefinition extends CommonPivotCoreDefinition {
  type: "SPREADSHEET";
}

export type PivotCoreDefinition = SpreadsheetPivotCoreDefinition;

export interface PivotField {
  name: string;
  type: string;
  string: string;
  relation?: string;
  searchable?: boolean;
  aggregator?: string;
  store?: boolean;
  groupable?: boolean;
  help?: string;
}

export type PivotFields = Record<string, PivotField | undefined>;

export interface PivotMeasure extends PivotCoreMeasure {
  nameWithAggregator: string;
  displayName: string;
  type: string;
}

export interface PivotDimension extends PivotCoreDimension {
  nameWithGranularity: string;
  displayName: string;
  type: string;
}

export interface SPTableColumn {
  fields: string[];
  values: string[];
  width: number;
  offset: number;
}

export interface SPTableRow {
  fields: string[];
  values: string[];
  indent: number;
}

export interface SPTableData {
  cols: SPTableColumn[][];
  rows: SPTableRow[];
  measures: string[];
  rowTitle?: string;
}

export interface SPTableCell {
  isHeader: boolean;
  domain?: string[];
  content?: string;
  measure?: string;
}

export interface PivotTimeAdapter<T> {
  normalizeFunctionValue: (value: string) => T;
  formatValue: (normalizedValue: T, locale?: Locale) => string;
  getFormat: (locale?: Locale) => Format | undefined;
  toCellValue: (normalizedValue: T) => CellValue;
}
