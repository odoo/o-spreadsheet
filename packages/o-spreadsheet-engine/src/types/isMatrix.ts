/**
 * The following type is meant to be used in union with other aliases to prevent
 * Intellisense from resolving it.
 * See https://github.com/microsoft/TypeScript/issues/31940#issuecomment-841712377
 */
export type Alias = {} & {};
// Col/row Index
export type HeaderIndex = number & Alias;
// any DOM pixel value
export type Pixel = number & Alias;
// Unique identifier
export type UID = string & Alias;
export type FilterId = UID & Alias;
export type TableId = UID & Alias;
/**
 * CSS style color string
 * e.g. "#ABC", "#AAAFFF", "rgb(30, 80, 16)"
 */
export type Color = string & Alias;

export interface Zone {
  left: HeaderIndex;
  right: HeaderIndex;
  top: HeaderIndex;
  bottom: HeaderIndex;
}

export interface AnchorZone {
  zone: Zone;
  cell: Position;
}

export interface Selection {
  anchor: AnchorZone;
  zones: Zone[];
}

export type AdjacentEdge = {
  position: "left" | "top" | "bottom" | "right";
  start: HeaderIndex;
  stop: HeaderIndex;
};

export interface UnboundedZone {
  top: HeaderIndex;
  bottom: HeaderIndex | undefined;
  left: HeaderIndex;
  right: HeaderIndex | undefined;
  /**
   * The hasHeader flag is used to determine if the zone has a header (eg. A2:A or C3:3).
   *
   * The main issue is that the zone A1:A and A:A have different behavior. The "correct" way to handle this would be to
   * allow the top/left to be undefined, but this make typing and using unbounded zones VERY annoying. So we use this
   * boolean instead.
   */
  hasHeader?: boolean;
}

export interface ZoneDimension {
  numberOfRows: HeaderIndex;
  numberOfCols: HeaderIndex;
}

export type Align = "left" | "right" | "center" | undefined;
export type VerticalAlign = "top" | "middle" | "bottom" | undefined;
export type Wrapping = "overflow" | "wrap" | "clip" | undefined;

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  align?: Align;
  wrapping?: Wrapping;
  verticalAlign?: VerticalAlign;
  fillColor?: Color;
  textColor?: Color;
  fontSize?: number; // in pt, not in px!
}

export interface DataBarFill {
  color: Color;
  percentage: number;
}

export interface UpdateCellData {
  content?: string;
  formula?: string;
  style?: Style | null;
  format?: Format;
}

export interface Sheet {
  id: UID;
  name: string;
  numberOfCols: number;
  rows: Row[];
  areGridLinesVisible: boolean;
  isVisible: boolean;
  panes: PaneDivision;
  color?: Color;
}

export interface CellPosition {
  col: HeaderIndex;
  row: HeaderIndex;
  sheetId: UID;
}

export const borderStyles = ["thin", "medium", "thick", "dashed", "dotted"] as const;
export type BorderStyle = (typeof borderStyles)[number];
// A complete border description is a pair [style, color]
export type BorderDescr = { style: BorderStyle; color: Color };
/**
 * A complete border(s) data is a set of position-color-style information
 */
export type BorderData = {
  position: BorderPosition;
  color?: Color;
  style?: BorderStyle;
};

export interface Border {
  top?: BorderDescr;
  left?: BorderDescr;
  bottom?: BorderDescr;
  right?: BorderDescr;
}

export type ReferenceDenormalizer = (
  range: Range,
  isMeta: boolean,
  functionName: string,
  paramNumber: number
) => FunctionResultObject;
export type EnsureRange = (range: Range, isMeta: boolean) => Matrix<FunctionResultObject>;
export type GetSymbolValue = (symbolName: string) => Arg;
export type FormulaToExecute = (
  deps: Range[],
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  getSymbolValue: GetSymbolValue,
  ctx: object
) => Matrix<FunctionResultObject> | FunctionResultObject;

export interface CompiledFormula {
  execute: FormulaToExecute;
  tokens: Token[];
  dependencies: string[];
  isBadExpression: boolean;
  normalizedFormula: string;
}

export interface RangeCompiledFormula extends Omit<CompiledFormula, "dependencies"> {
  dependencies: Range[];
}

export type Matrix<T = unknown> = T[][];
export type FunctionResultObject = {
  value: CellValue;
  format?: Format;
  errorOriginPosition?: CellPosition;
  message?: string;
  origin?: CellPosition;
};
// FORMULA FUNCTION VALUE AND FORMAT INPUT
export type Arg = Maybe<FunctionResultObject> | Matrix<FunctionResultObject>; // undefined corresponds to the lack of argument, e.g. =SUM(1,2,,4)
export function isMatrix(x: any): x is Matrix<any> {
  return Array.isArray(x) && Array.isArray(x[0]);
}

export interface ClipboardCell {
  evaluatedCell: EvaluatedCell;
  position: CellPosition;
  content: string;
  style?: Style | undefined;
  format?: Format | undefined;
  tokens?: Token[];
  border?: Border;
}

export interface HeaderDimensions {
  start: Pixel;
  size: Pixel;
  end: Pixel;
}

export interface Row {
  cells: Record<number, UID | undefined>; // number is a column index
}

export interface Position {
  col: HeaderIndex;
  row: HeaderIndex;
}

export interface PixelPosition {
  x: Pixel;
  y: Pixel;
}

export interface Merge extends Zone {
  id: number;
}

export interface Highlight {
  range: Range;
  color: Color;
  interactive?: boolean;
  thinLine?: boolean;
  noFill?: boolean;
  /** transparency of the fill color (0-1) */
  fillAlpha?: number;
  noBorder?: boolean;
  dashed?: boolean;
}

export interface PaneDivision {
  /** Represents the number of frozen columns */
  xSplit: number;
  /** Represents the number of frozen rows */
  ySplit: number;
}

export type BorderPosition =
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
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}

export type ChangeType = "REMOVE" | "RESIZE" | "MOVE" | "CHANGE" | "NONE";
export type ApplyRangeChangeResult =
  | { changeType: Exclude<ChangeType, "NONE">; range: Range }
  | { changeType: "NONE" };
export type ApplyRangeChange = (range: Range) => ApplyRangeChangeResult;
export type AdaptSheetName = { old: string; current: string };
export type RangeAdapter = {
  sheetId: UID;
  sheetName: AdaptSheetName;
  applyChange: ApplyRangeChange;
};
export type ConsecutiveIndexes = HeaderIndex[];

export interface RangeProvider {
  adaptRanges: (applyChange: ApplyRangeChange, sheetId: UID, sheetName: AdaptSheetName) => void;
}

export type Maybe<T> = T | undefined;

export interface MenuMouseEvent extends MouseEvent {
  closedMenuId?: UID;
}

export interface HeaderGroup {
  start: HeaderIndex;
  end: HeaderIndex;
  isFolded?: boolean;
}
