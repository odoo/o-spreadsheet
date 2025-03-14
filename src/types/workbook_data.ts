import { CellValue, DataValidationRule, Format, Locale } from ".";
import { ExcelChartDefinition } from "./chart/chart";
import { ConditionalFormat } from "./conditional_formatting";
import { Image } from "./image";
import { Border, Color, Dimension, HeaderGroup, PaneDivision, Pixel, Style, UID } from "./misc";
import { PivotCoreDefinition } from "./pivot";
import { CoreTableType, TableConfig, TableStyleTemplateName } from "./table";

export interface Dependencies {
  references: string[];
  numbers: number[];
  strings: string[];
}

export interface CellData {
  content?: string;
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
  styles: { [zone: string]: number };
  formats: { [zone: string]: number };
  borders: { [zone: string]: number };
  merges: string[];
  figures: FigureData<any>[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
  dataValidationRules: DataValidationRuleData[];
  tables: TableData[];
  areGridLinesVisible?: boolean;
  isVisible: boolean;
  panes?: PaneDivision;
  headerGroups?: Record<Dimension, HeaderGroup[]>;
  color?: Color;
}

interface WorkbookSettings {
  locale: Locale;
}

type PivotData = { formulaId: string } & PivotCoreDefinition;

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  formats: { [key: number]: Format };
  borders: { [key: number]: Border };
  pivots: { [key: string]: PivotData };
  pivotNextId: number;
  revisionId: UID;
  uniqueFigureIds: boolean;
  settings: WorkbookSettings;
  customTableStyles: { [key: string]: TableStyleData };
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

export interface ExcelCellData extends CellData {
  value: CellValue;
  isFormula: Boolean;
  format?: number;
  style?: number;
  border?: number;
  computedFormat?: Format;
}
export interface ExcelSheetData extends Omit<SheetData, "figureTables" | "cols" | "rows"> {
  cells: { [key: string]: ExcelCellData | undefined };
  formulaSpillRanges: { [xc: string]: string };
  charts: FigureData<ExcelChartDefinition>[];
  images: FigureData<Image>[];
  tables: ExcelTableData[];
  cols: { [key: number]: ExcelHeaderData };
  rows: { [key: number]: ExcelHeaderData };
}

export interface ExcelHeaderData extends HeaderData {
  outlineLevel?: number;
  collapsed?: boolean;
}

export interface TableData {
  range: string;
  config?: TableConfig;
  type?: CoreTableType;
}

export interface DataValidationRuleData extends Omit<DataValidationRule, "ranges"> {
  ranges: string[];
}

export interface ExcelTableData {
  range: string;
  filters: ExcelFilterData[];
  config: TableConfig;
}

export interface ExcelFilterData {
  colId: number;
  displayedValues: string[];
  displayBlanks?: boolean;
}

export interface TableStyleData {
  templateName: TableStyleTemplateName;
  primaryColor: string;
  displayName: string;
}
