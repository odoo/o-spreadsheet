export interface GridState {
  rows: Row[];
  cols: Col[];
  cells: { [key: string]: Cell };
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number;
  height: number;
  clientWidth: number;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX: number;
  offsetY: number;
  scrollTop: number;
  scrollLeft: number;

  viewport: Zone;
  selection: Selection;

  activeCol: number;
  activeRow: number;
  activeXc: string;
  activeSheet: string;

  isEditing: boolean;
  currentContent: string;

  clipboard: ClipBoard;
  nextId: number;
  highlights: Highlight[];
  isSilent: boolean; // rename into isDirty
  isSelectingRange: boolean;
}

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Selection {
  anchor: {
    col: number;
    row: number;
  };
  zones: Zone[];
}

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
}

export interface CellData {
  content?: string;
  style?: number;
  border?: number;
}

interface HeaderData {
  size?: number;
}

export interface Sheet {
  name?: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
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

export interface GridData {
  sheets: Sheet[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
}

export interface Cell extends CellData {
  col: number;
  row: number;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
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

export interface ClipBoard {
  zone?: Zone;
  cells?: (Cell | null)[][];
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
