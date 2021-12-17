// -----------------------------------------------------------------------------

import { Dependencies } from ".";

// -----------------------------------------------------------------------------
export type UID = string;
export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type Align = "left" | "right" | "center" | undefined;

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: Align;
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
}

export interface Sheet {
  id: string;
  name: string;
  cells: { [key: string]: Cell };
  colNumber: number;
  rowNumber: number;
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };
  cols: Col[];
  rows: Row[];
}

// A border description is a pair [style, ]
export type BorderStyle = "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
export type BorderDescr = [BorderStyle, string];

export interface Border {
  top?: BorderDescr;
  left?: BorderDescr;
  bottom?: BorderDescr;
  right?: BorderDescr;
}

export interface NewCell {
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export type ReferenceDenormalizer = (
  position: number,
  references: string[],
  sheetId: UID,
  functionName: string,
  paramNumber: number
) => any | any[][];

export type EnsureRange = (position: number, references: string[], sheetId: UID) => any[][];

export type NumberParser = (str: string) => number;

export type _CompiledFormula = (
  deps: Dependencies,
  sheetId: UID,
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  ctx: {}
) => any;

export interface CompiledFormula extends _CompiledFormula {
  async: boolean;
}

export interface Cell extends NewCell {
  col: number;
  row: number;
  xc: string;
  error?: string;
  pending?: boolean;
  value: any;
  formula?: {
    text: string;
    dependencies: Dependencies;
    compiledFormula: CompiledFormula;
  };
  type: "formula" | "text" | "number" | "date";
}

export interface Header {
  start: number;
  end: number;
  name: string;
  size: number;
}

export interface Row extends Header {
  cells: { [col: number]: Cell };
}

export type Col = Header;

export interface Merge extends Zone {
  id: number;
  topLeft: string;
}

export interface Highlight {
  zone: Zone;
  sheet: string;
  color: string | null;
}

export type BorderCommand =
  | "all"
  | "hv"
  | "h"
  | "v"
  | "external"
  | "left"
  | "top"
  | "right"
  | "bottom"
  | "clear";

export interface Workbook {
  // sheets
  visibleSheets: string[]; // ids of visible sheets
  sheets: { [id: string]: Sheet };
  activeSheet: Sheet;
}

export const enum DIRECTION {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}
