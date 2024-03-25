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
  rowTitle: string;
}

export interface SPTableCell {
  isHeader: boolean;
  domain?: string[];
  content?: string;
  style?: Object;
  measure?: string;
}

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

export interface PivotDimensionDefinition {
  name: string;
  order?: "asc" | "desc";
  granularity?: Granularity | string;
}

export interface PivotMeasureDefinition {
  name: string;
  aggregator?: Aggregator | string;
}

export interface PivotMeasure extends PivotMeasureDefinition {
  nameWithAggregator: string;
  displayName: string;
  type: string;
}

export interface PivotDimension extends PivotDimensionDefinition {
  nameWithGranularity: string;
  displayName: string;
  type: string;
}

export interface CommonPivotDefinition {
  columns: PivotDimensionDefinition[];
  rows: PivotDimensionDefinition[];
  measures: PivotMeasureDefinition[];
  name: string;
}

export interface Field {
  name: string;
  type: string;
  string: string;
  relation?: string;
  searchable?: boolean;
  aggregator?: string;
  store?: boolean;
}

export type Fields = Record<string, Field | undefined>;
