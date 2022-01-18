import { CellValue, ExcelChartDefinition } from ".";
import { ConditionalFormat } from "./conditional_formatting";
import { Border, Style, UID } from "./misc";

export interface Dependencies {
  references: string[];
  numbers: number[];
  strings: string[];
}

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
  value?: any;
};

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
  formats: { [key: number]: string };
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
