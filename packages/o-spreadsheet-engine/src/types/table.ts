import { DateCriterionValue, GenericCriterionType } from "./generic_criterion";
import { Border, BorderDescr, Style, TableId, UID } from "./misc";
import { Range } from "./range";

export interface Table {
  readonly id: TableId;
  readonly range: Range;
  readonly filters: Filter[];
  readonly config: TableConfig;
  readonly isPivotTable?: boolean;
}

export interface StaticTable extends Table {
  readonly type: "static" | "forceStatic";
}

export interface DynamicTable extends Omit<Table, "filters"> {
  readonly type: "dynamic";
}

export type CoreTable = StaticTable | DynamicTable;
export type CoreTableType = Extract<CoreTable, { type: string }>["type"];

export interface Filter {
  readonly id: UID;
  readonly rangeWithHeaders: Range;
  readonly col: number;
  /** The filtered zone doesn't includes the headers of the table */
  readonly filteredRange: Range | undefined;
}

export interface TableConfig {
  hasFilters: boolean;
  totalRow: boolean;
  firstColumn: boolean;
  lastColumn: boolean;

  numberOfHeaders: number;

  bandedRows: boolean;
  bandedColumns: boolean;

  automaticAutofill?: boolean;

  styleId: string;
}

export interface TableMetaData {
  mode: "pivot" | "table";
  numberOfCols: number;
  numberOfRows: number;
  measureRow?: number;
  mainSubHeaderRows?: Set<number>;
  firstAlternatingSubHeaderIndexes?: Set<number>;
  secondAlternatingSubHeaderIndexes?: Set<number>;
  isTabular?: boolean;
}

export interface ComputedTableStyle {
  borders: Border[][];
  styles: Style[][];
}

export interface TableElementStyle {
  border?: TableBorder;
  style?: Style;
  size?: number;
}

export interface TableBorder {
  top?: BorderDescr | null;
  bottom?: BorderDescr | null;
  left?: BorderDescr | null;
  right?: BorderDescr | null;
  // used to describe borders inside of a zone
  horizontal?: BorderDescr | null;
  vertical?: BorderDescr | null;
}

export interface TableStyle {
  category: string;

  displayName: string;
  templateName: TableStyleTemplateName;
  primaryColor: string;

  wholeTable?: TableElementStyle;
  firstColumnStripe?: TableElementStyle;
  secondColumnStripe?: TableElementStyle;
  firstRowStripe?: TableElementStyle;
  secondRowStripe?: TableElementStyle;

  firstColumn?: TableElementStyle;
  lastColumn?: TableElementStyle;
  headerRow?: TableElementStyle;
  totalRow?: TableElementStyle;

  measureHeader?: TableElementStyle;
  mainSubHeaderRow?: TableElementStyle;
  firstAlternatingSubHeaderRow?: TableElementStyle;
  secondAlternatingSubHeaderRow?: TableElementStyle;

  // Exist in OpenXML. Not implemented ATM.
  // firstHeaderCell: TableElementStyle;
  // lastHeaderCell: TableElementStyle;
  // firstTotalCell: TableElementStyle;
  // lastTotalCell: TableElementStyle;
}

export type TableStyleTemplateName = string;

const filterCriterions: GenericCriterionType[] = [
  "containsText",
  "notContainsText",
  "isEqualText",
  "dateIs",
  "dateIsBefore",
  "dateIsOnOrBefore",
  "dateIsAfter",
  "dateIsOnOrAfter",
  "dateIsBetween",
  "dateIsNotBetween",
  "isEqual",
  "isNotEqual",
  "isGreaterThan",
  "isGreaterOrEqualTo",
  "isLessThan",
  "isLessOrEqualTo",
  "isBetween",
  "isNotBetween",
  "customFormula",
  "beginsWithText",
  "endsWithText",
  "isNotEmpty",
  "isEmpty",
];

export type FilterCriterionType = (typeof filterCriterions)[number];

export const availableFiltersOperators: Set<FilterCriterionType> = new Set(filterCriterions);

export const filterTextCriterionOperators: FilterCriterionType[] = [
  "containsText",
  "notContainsText",
  "isEqualText",
  "isEmpty",
  "isNotEmpty",
  "beginsWithText",
  "endsWithText",
];

export const filterNumberCriterionOperators: FilterCriterionType[] = [
  "isEqual",
  "isNotEqual",
  "isGreaterThan",
  "isGreaterOrEqualTo",
  "isLessThan",
  "isLessOrEqualTo",
  "isBetween",
  "isNotBetween",
  "isEmpty",
  "isNotEmpty",
];

export const filterDateCriterionOperators: FilterCriterionType[] = [
  "dateIs",
  "dateIsBefore",
  "dateIsOnOrBefore",
  "dateIsAfter",
  "dateIsOnOrAfter",
  "dateIsBetween",
  "dateIsNotBetween",
  "isEmpty",
  "isNotEmpty",
];

export interface ValuesFilter {
  filterType: "values";
  hiddenValues: string[];
}

export interface CriterionFilter {
  filterType: "criterion";
  type: FilterCriterionType | "none";
  values: string[];
  dateValue?: DateCriterionValue;
}

export type DataFilterValue = ValuesFilter | CriterionFilter;
