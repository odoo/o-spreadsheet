import { CellValue, Format } from ".";
import { ExcelChartDefinition } from "./chart/chart";
import { ExportedConditionalFormat } from "./conditional_formatting";
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
  conditionalFormats: ExportedConditionalFormat[];
  filterTables: FilterTableData[];
  areGridLinesVisible?: boolean;
  isVisible: boolean;
  panes?: PaneDivision;
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  formats: { [key: number]: Format };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
  revisionId: UID;
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

export interface ExcelCellData extends CellData {
  value: CellValue;
  isFormula: Boolean;
}
export interface ExcelSheetData extends SheetData {
  cells: { [key: string]: ExcelCellData | undefined };
  charts: FigureData<ExcelChartDefinition>[];
}

export interface FilterTableData {
  range: string;
}
