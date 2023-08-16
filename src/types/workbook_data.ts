import { CellValue, Format, Locale } from ".";
import { ExcelChartDefinition } from "./chart/chart";
import { ConditionalFormat } from "./conditional_formatting";
import { Image } from "./image";
import { Border, PaneDivision, Pixel, Style, UID } from "./misc";

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
  filterTables: FilterTableData[];
  areGridLinesVisible?: boolean;
  isVisible: boolean;
  panes?: PaneDivision;
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
  entities: { [key: string]: { [key: string]: any } };
  revisionId: UID;
  uniqueFigureIds: boolean;
  settings: WorkbookSettings;
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

interface LiteralExcelCellData extends CellData {
  value: CellValue;
  isFormula: false;
}

export interface FormulaExcelCellData extends CellData {
  value: CellValue;
  isFormula: true;
  resultSpanningCells: string;
  computedFormat?: Format;
}

export type ExcelCellData = LiteralExcelCellData | FormulaExcelCellData;

export interface ExcelSheetData extends Omit<SheetData, "figureTables"> {
  cells: { [key: string]: ExcelCellData | undefined };
  charts: FigureData<ExcelChartDefinition>[];
  images: FigureData<Image>[];
  filterTables: ExcelFilterTableData[];
}

export interface FilterTableData {
  range: string;
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
