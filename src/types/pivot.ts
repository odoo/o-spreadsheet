import { CellValue } from "./cells";
import { Locale } from "./locale";
import { FPayload, UID, Zone } from "./misc";

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
  values: CellValue[];
  width: number;
  offset: number;
}

export interface PivotTableRow {
  fields: string[];
  values: CellValue[];
  indent: number;
}

export interface PivotTableData {
  cols: PivotTableColumn[][];
  rows: PivotTableRow[];
  measures: string[];
  fieldsType?: Record<string, string | undefined>; // TODO Make it mandatory when JSON migration is available
}

export interface PivotHeaderCell {
  type: "HEADER";
  domain: PivotDomain;
}

export interface PivotMeasureHeaderCell {
  type: "MEASURE_HEADER";
  domain: PivotDomain;
  measure: string;
}

export interface PivotValueCell {
  type: "VALUE";
  domain: PivotDomain;
  measure: string;
}

export interface PivotEmptyCell {
  type: "EMPTY";
}

export type PivotTableCell =
  | PivotHeaderCell
  | PivotMeasureHeaderCell
  | PivotValueCell
  | PivotEmptyCell;

export interface PivotTimeAdapterNotNull<T> {
  normalizeFunctionValue: (value: Exclude<CellValue, null>) => T;
  toValueAndFormat: (normalizedValue: T, locale?: Locale) => FPayload;
  toFunctionValue: (normalizedValue: T) => string;
}

export interface PivotTimeAdapter<T> {
  normalizeFunctionValue: (value: CellValue) => T | null;
  toValueAndFormat: (normalizedValue: T, locale?: Locale) => FPayload;
  toFunctionValue: (normalizedValue: T) => string;
}

export interface PivotNode {
  field: string;
  type: string;
  value: CellValue;
}

export type PivotDomain = PivotNode[];
