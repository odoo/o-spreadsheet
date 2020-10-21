import { ConditionalFormat } from "./conditional_formatting";
import { Border, Style } from "./misc";

export interface CellData {
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface HeaderData {
  size?: number;
}

export interface Figure<T> {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
  data: T;
}

export interface ImportSheetData {
  id: string;
  name: string;
  colNumber: number;
  rowNumber: number;
  cells: { [key: string]: CellData };
  merges: string[];
  figures: Figure<any>[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
}

export interface WorkbookData {
  version: number;
  sheets: ImportSheetData[];
  activeSheet: string;
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
}
