import { NEXT_VALUE, PREVIOUS_VALUE } from "../helpers/pivot/pivot_domain_helpers";
import { CellValue } from "./cells";
import { Format } from "./format";
import { Locale } from "./locale";
import { Dimension, FunctionResultObject, SortDirection, UID, Zone } from "./misc";

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
  | "month"
  | "year"
  | "second_number"
  | "minute_number"
  | "hour_number"
  | "day_of_week"
  | "day_of_month"
  | "iso_week_number"
  | "month_number"
  | "quarter_number";

export interface PivotCoreDimension {
  fieldName: string;
  order?: SortDirection;
  granularity?: Granularity | string;
  isCustomField?: boolean;
  parentField?: string;
  customGroups?: PivotCustomGroup[];
}

export interface PivotCoreMeasure {
  /**
   * Identifier of the measure, `technicalName:aggregator{:autoIncrementedNumber}`.
   * It's used to identify the measure in the pivot formula.
   */
  id: string;
  userDefinedName?: string;
  fieldName: string;
  aggregator: Aggregator | string;
  isHidden?: boolean;
  format?: Format;
  computedBy?: { sheetId: UID; formula: string };
  display?: PivotMeasureDisplay;
}

export interface CommonPivotCoreDefinition {
  columns: PivotCoreDimension[];
  rows: PivotCoreDimension[];
  measures: PivotCoreMeasure[];
  name: string;
  deferUpdates?: boolean;
  sortedColumn?: PivotSortedColumn;
  collapsedDomains?: PivotCollapsedDomains;
  customFields?: Record<string, PivotCustomGroupedField>;
}

export interface PivotSortedColumn {
  order: SortDirection;
  domain: PivotDomain;
  measure: string;
}

export interface PivotCollapsedDomains {
  COL: PivotDomain[];
  ROW: PivotDomain[];
}

export interface PivotCustomGroupedField {
  parentField: string;
  name: string;
  groups: PivotCustomGroup[];
}

export interface PivotCustomGroup {
  name: string;
  values: CellValue[];
  isOtherGroup?: boolean;
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
  isCustomField?: boolean;
  parentField?: string;
  customGroups?: PivotCustomGroup[];
}

export type PivotFields = Record<TechnicalName, PivotField | undefined>;

export interface PivotMeasure extends PivotCoreMeasure {
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
  dimension: Dimension;
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
  toValueAndFormat: (normalizedValue: T, locale?: Locale) => FunctionResultObject;
  toFunctionValue: (normalizedValue: T) => string;
}

export interface PivotTimeAdapter<T> {
  normalizeFunctionValue: (value: CellValue) => T | null;
  toValueAndFormat: (normalizedValue: T, locale?: Locale) => FunctionResultObject;
  toFunctionValue: (normalizedValue: T) => string;
}

export interface PivotNode {
  field: string;
  type: string;
  value: CellValue;
}

export type PivotDomain = PivotNode[];

/** Pivot domain splitted for the domain related to the pivot's rows and columns  */
export interface PivotColRowDomain {
  colDomain: PivotDomain;
  rowDomain: PivotDomain;
}

export interface PivotMeasureDisplay {
  type: PivotMeasureDisplayType;
  fieldNameWithGranularity?: string;
  value?: string | boolean | number | typeof PREVIOUS_VALUE | typeof NEXT_VALUE;
}

export type PivotMeasureDisplayType =
  | "no_calculations"
  | "%_of_grand_total"
  | "%_of_col_total"
  | "%_of_row_total"
  | "%_of_parent_row_total"
  | "%_of_parent_col_total"
  | "index"
  | "%_of_parent_total"
  | "running_total"
  | "%_running_total"
  | "rank_asc"
  | "rank_desc"
  | "%_of"
  | "difference_from"
  | "%_difference_from";

export interface DimensionTreeNode {
  value: CellValue;
  field: string;
  type: string;
  children: DimensionTree;
  width: number;
}

export type DimensionTree = DimensionTreeNode[];

export interface PivotVisibilityOptions {
  displayColumnHeaders: boolean;
  displayTotals: boolean;
  displayMeasuresRow: boolean;
}
