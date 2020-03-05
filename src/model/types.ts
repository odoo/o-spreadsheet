//------------------------------------------------------------------------------
// Common types
//------------------------------------------------------------------------------
export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
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

//------------------------------------------------------------------------------
// GridData (incoming data)
//------------------------------------------------------------------------------
export interface PartialGridDataWithVersion extends Partial<GridData> {
  version: GridData["version"];
}

interface CellData {
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

interface HeaderData {
  size?: number;
}

export interface SheetData {
  name: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

export interface GridData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
}

//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------
export interface Selection {
  zones: any[];
}

//------------------------------------------------------------------------------
// Commands
//------------------------------------------------------------------------------

export interface AddCellCommand {
  type: "ADD_CELL";
  xc: string;
  sheet: string;
  content: string;
}

export interface DeleteCellCommand {
  type: "DELETE_CELL";
  xc: string;
  sheet: string;
}

export interface SetStyleCommand {
  type: "SET_STYLE";
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!

  selection: Selection;
}

export interface AddSheetCommand {
  type: "ADD_SHEET";
}

export interface ActivateSheetCommand {
  type: "ACTIVATE_SHEET";
  name: string;
}

export type GridCommand =
  | AddCellCommand
  | DeleteCellCommand
  | SetStyleCommand
  | AddSheetCommand
  | ActivateSheetCommand;

//------------------------------------------------------------------------------
// SpreadSheetState
//------------------------------------------------------------------------------
export interface CoreState {
  totalWidth: number;
  totalHeight: number;

  isSelectingRange: boolean;
  sheets: string[];
  activeSheet: string;
  aggregate: null | number;
}

export interface MergeState extends CoreState {
  cannotMerge: boolean;
  inMerge: boolean;
}

export interface StyleState extends MergeState {
  fillColor: string;
  textColor: string;
}

export type SpreadSheetState = StyleState;

//------------------------------------------------------------------------------
// GridState
//------------------------------------------------------------------------------
type Rect = [number, number, number, number];

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textWidth: number;
  style: Style | null;
  border: Border | null;
  align: "left" | "right" | null;
  clipRect: Rect | null;
  isError?: boolean;
}

export interface Header {
  name: string;
  size: number;
  index: number;
  start: number;
  end: number;
}

export interface ViewPort {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface CoreGridState {
  // grid dimensions (so, if viewport is wider than rows, width < viewport.width)
  width: number;
  height: number;

  offsetX: number;
  offsetY: number;

  // visible headers
  cols: Header[];
  rows: Header[];

  // cell or merge boxes
  boxes: Partial<Box>[];
}

export interface GridState extends CoreGridState {
  boxes: Box[];
}
