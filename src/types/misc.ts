// -----------------------------------------------------------------------------
// MISC
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
  id: UID;
  name: string;
  cells: { [key: string]: Cell };
  colNumber: number;
  rowNumber: number;
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

export type ReadCell = (xc: string, sheet: UID) => any;
export type Range = (v1: string, v2: string, sheetName: string) => any[];
export type _CompiledFormula = (readCell: ReadCell, range: Range, ctx: {}) => any;

export type CellRefs = [string, UID][];
export type RangeRefs = [string, string, UID][];

export interface CompiledFormula extends _CompiledFormula {
  async: boolean;
  cellRefs: CellRefs;
  rangeRefs: RangeRefs;
}

export interface Cell extends NewCell {
  dependencies?: UID[]; // all the cells and ranges this cell with the current formula is depending upon
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

export const enum DIRECTION {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export type ChangeType = "REMOVE" | "RESIZE" | "MOVE";
export type onRangeChange = (changeType: ChangeType) => void;
