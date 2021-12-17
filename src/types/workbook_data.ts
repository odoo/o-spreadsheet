import { ConditionalFormat } from "./conditional_formatting";
import { Border, Style } from "./misc";

export type Dependencies = (string | number)[];

/**
 * Represents a string in which all range references, strings and numbers are
 * replaced by dependencies references.
 */
export type NormalizedFormulaString = string;

export type NormalizedFormula = {
  // if the content is a formula (ex. =sum(  a1:b3, 3) + a1, should be stored as
  // {formula: "=sum(  |ref1|, |ref2|) + |ref3|"), ["a1:b3","a1"]
  // This normalization applies to range references, numbers and string values
  text: NormalizedFormulaString;
  dependencies: Dependencies;
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

export interface Figure<T> {
  id: string;
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
  cells: { [key: string]: CellData };
  merges: string[];
  figures: Figure<any>[];
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
