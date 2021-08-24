import { ExcelChartDefinition } from "./chart";
import { ConditionalFormat } from "./conditional_formatting";
import { Border, NormalizedFormula, Style, UID } from "./misc";

export interface CellData {
  content?: string;
  formula?: NormalizedFormula;
  style?: number;
  border?: number;
  format?: string;
}

export interface HeaderData {
  size?: number;
  isHidden?: boolean;
}

export interface FigureData<T> {
  id: UID;
  x: number;
  y: number;
  width: number;
  height: number;
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
  areGridLinesVisible?: boolean;
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
  revisionId: UID;
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

export interface ExcelSheetData extends SheetData {
  charts: FigureData<ExcelChartDefinition>[];
}
