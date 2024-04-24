import { Border, BorderDescr, Style, TableId, UID } from "./misc";
import { Range } from "./range";

export interface Table {
  readonly id: TableId;
  readonly range: Range;
  readonly filters: Filter[];
  readonly config: TableConfig;
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

export interface ComputedTableStyle {
  borders: Border[][];
  styles: Style[][];
}

export interface TableElementStyle {
  border?: TableBorder;
  style?: Style;
  size?: number;
}

interface TableBorder extends Border {
  // used to describe borders inside of a zone
  horizontal?: BorderDescr;
  vertical?: BorderDescr;
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

  // Exist in OpenXML. Not implemented ATM.
  // firstHeaderCell: TableElementStyle;
  // lastHeaderCell: TableElementStyle;
  // firstTotalCell: TableElementStyle;
  // lastTotalCell: TableElementStyle;
}

export type TableStyleTemplateName =
  | "none"
  | "lightColoredText"
  | "lightAllBorders"
  | "mediumAllBorders"
  | "lightWithHeader"
  | "mediumBandedBorders"
  | "mediumMinimalBorders"
  | "darkNoBorders"
  | "mediumWhiteBorders"
  | "dark";
