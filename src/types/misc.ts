// -----------------------------------------------------------------------------
// WorkBook
// -----------------------------------------------------------------------------
export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right" | "center";
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

export type CompiledFormula = (
  readCell: (xc: string, sheet: string) => any,
  range: (v1: string, v2: string, sheetName: string) => any[],
  ctx: {}
) => any;

export interface Cell extends NewCell {
  col: number;
  row: number;
  xc: string;
  error?: string;
  pending?: boolean;
  value: any;
  formula?: CompiledFormula;
  async?: boolean;
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
  rows: Row[];
  cols: Col[];
  cells: { [key: string]: Cell };

  // sheets
  sheets: Sheet[];
  activeSheet: Sheet;
}

export const enum DIRECTION {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}
