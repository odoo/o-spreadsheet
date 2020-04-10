// -----------------------------------------------------------------------------
// WorkBook
// -----------------------------------------------------------------------------
export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Selection {
  anchor: [number, number];
  zones: Zone[];
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
  error?: boolean;
  value: any;
  formula?: CompiledFormula;
  async?: boolean;
  type: "formula" | "text" | "number";
}

export interface Row {
  cells: { [col: number]: Cell };
  bottom: number;
  top: number;
  name: string;
  size: number;
}

export interface Col {
  left: number;
  right: number;
  name: string;
  size: number;
}

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
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  // sheets
  sheets: Sheet[];
  activeSheet: Sheet;
}

export type EditionMode = "editing" | "selecting" | "inactive";

// -----------------------------------------------------------------------------
// UIState
// -----------------------------------------------------------------------------
export type Rect = [number, number, number, number];

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textWidth: number;
  style: Style | null;
  border: Border | null;
  align: "left" | "right" | "center" | null;
  clipRect: Rect | null;
  isError?: boolean;
}

export interface UI {
  activeXc: string;
  sheets: string[];
  activeSheet: string;

  // to remove someday
  rows: Row[];
  cols: Col[];
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };
}

export interface Viewport extends Zone {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}
