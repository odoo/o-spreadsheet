import { CellValue } from "./cells";
import { Format } from "./format";
import { Locale } from "./locale";
import { UID, Zone } from "./misc";

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

export type Granularity =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "day_of_month"
  | "iso_week_number"
  | "month_number"
  | "quarter_number"
  | "year_number";

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
  dataSet?: {
    sheetId: UID;
    zone: Zone;
  };
}

interface FakePivotDefinition extends CommonPivotCoreDefinition {
  type: "FAKE";
}

export type PivotCoreDefinition = SpreadsheetPivotCoreDefinition | FakePivotDefinition;

export type TechnicalName = string;

export interface PivotField {
  name: TechnicalName;
  type: string;
  string: string;
  aggregator?: string;
  help?: string;
}

export type PivotFields = Record<TechnicalName, PivotField | undefined>;

export interface PivotMeasure extends PivotCoreMeasure {
  nameWithAggregator: string;
  displayName: string;
  type: string;
  isValid: boolean;
}

export interface PivotDimension extends PivotCoreDimension {
  nameWithGranularity: string;
  displayName: string;
  type: string;
  isValid: boolean;
}

export interface PivotTableColumn {
  fields: string[];
  values: string[];
  width: number;
  offset: number;
}

export interface PivotTableRow {
  fields: string[];
  values: string[];
  indent: number;
}

export interface PivotTableData {
  cols: PivotTableColumn[][];
  rows: PivotTableRow[];
  measures: string[];
  rowTitle?: string;
}

export interface PivotTableCell {
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

//TODO Use it everywhere a domain is required
export interface DomainArg {
  field: string;
  value: string;
}

//TODO
// export type DomainArgs = DomainArg[];
export type StringDomainArgs = string[];
