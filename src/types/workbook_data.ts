import { ConditionalFormat } from "./conditional_formatting";
import { Border, Style, UID } from "./misc";

export type NormalizedFormula = {
  // if the content is a formula (ex. =sum(  a1:b3, 3) + a1, should be stored as
  // {formula: "=sum(  |ref1|, 3) + |ref2|"), ["a1:b3","a1"]
  text: string;
  dependencies: string[];
};

export interface CellData {
  content?: string;
  formula?: NormalizedFormula;
  style?: number;
  border?: number;
  format?: string;
}

export interface HeaderData {
  size?: number;
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
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
}
