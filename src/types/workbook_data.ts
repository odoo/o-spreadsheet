import { CellValue, DataValidationRule, Format, Locale } from ".";
import { ExcelChartDefinition } from "./chart/chart";
import { ConditionalFormat } from "./conditional_formatting";
import { Image } from "./image";
import { Border, Dimension, HeaderGroup, PaneDivision, Pixel, Style, UID } from "./misc";

export interface Dependencies {
  references: string[];
  numbers: number[];
  strings: string[];
}

export interface CellData {
  content?: string;
  style?: number;
  border?: number;
  format?: number;
}

export interface HeaderData {
  size?: number;
  isHidden?: boolean;
}

export interface FigureData<T> {
  id: UID;
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
  tag: string;
  data: T;
}

export interface SheetData {
  id: string;
  name: string;
  colNumber: number;
  rowNumber: number;
  cells: { [key: string]: CellData | undefined };
  merges: string[];
  figures: FigureData<any>[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
  dataValidationRules?: DataValidationRuleData[];
  filterTables: FilterTableData[];
  areGridLinesVisible?: boolean;
  isVisible: boolean;
  panes?: PaneDivision;
  headerGroups?: Record<Dimension, HeaderGroup[]>;
}

interface WorkbookSettings {
  locale: Locale;
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  formats: { [key: number]: Format };
  borders: { [key: number]: Border };
  revisionId: UID;
  uniqueFigureIds: boolean;
  settings: WorkbookSettings;
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

export interface ExcelCellData extends CellData {
  value: CellValue;
  isFormula: Boolean;
  computedFormat?: Format;
}
export interface ExcelSheetData extends Omit<SheetData, "figureTables" | "cols" | "rows"> {
  cells: { [key: string]: ExcelCellData | undefined };
  charts: FigureData<ExcelChartDefinition>[];
  images: FigureData<Image>[];
  filterTables: ExcelFilterTableData[];
  cols: { [key: number]: ExcelHeaderData };
  rows: { [key: number]: ExcelHeaderData };
}

export interface ExcelHeaderData extends HeaderData {
  outlineLevel?: number;
  collapsed?: boolean;
}

export interface FilterTableData {
  range: string;
}

export interface DataValidationRuleData extends Omit<DataValidationRule, "ranges"> {
  ranges: string[];
}

export interface ExcelFilterTableData {
  range: string;
  filters: ExcelFilterData[];
}

export interface ExcelFilterData {
  colId: number;
  displayedValues: string[];
  displayBlanks?: boolean;
}
