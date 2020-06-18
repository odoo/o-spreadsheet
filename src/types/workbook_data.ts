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

export interface FigureData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export interface SheetData {
  id: string;
  name: string;
  colNumber: number;
  rowNumber: number;
  cells: { [key: string]: CellData };
  merges: string[];
  figures: { [id: string]: FigureData };
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  activeSheet: string;
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
}
