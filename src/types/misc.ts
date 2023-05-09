// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------
import { ComponentConstructor } from "@odoo/owl";
import { Token } from "../formulas";
import { Cell, CellValue, EvaluatedCell } from "./cells";
import { CommandResult } from "./commands";
import { Format } from "./format";
import { Range } from "./range";

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

export type SetDecimalStep = 1 | -1;
export type FilterId = UID & Alias;
export type FilterTableId = UID & Alias;

/**
 * CSS style color string
 * e.g. "#ABC", "#AAAFFF", "rgb(30, 80, 16)"
 */
export type Color = string & Alias;

export interface RGBA {
  a: number;
  r: number;
  g: number;
  b: number;
}

export interface HSLA {
  a: number;
  h: number;
  s: number;
  l: number;
}

export interface Link {
  readonly label: string;
  readonly url: string;
  readonly isExternal: boolean;
  /**
   * Specifies if the URL is editable by the end user.
   * Special links might not allow it.
   */
  readonly isUrlEditable: boolean;
}

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

export interface UnboundedZone {
  top: HeaderIndex;
  bottom: HeaderIndex | undefined;
  left: HeaderIndex;
  right: HeaderIndex | undefined;
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
}

export interface CellPosition {
  col: HeaderIndex;
  row: HeaderIndex;
  sheetId: UID;
}

// A border description is a pair [style, ]
export type BorderStyle = "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
export type BorderDescr = [BorderStyle, Color];

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
) => any | any[][];

export type EnsureRange = (range: Range) => MatrixArg;

export type NumberParser = (str: string) => number;

export type _CompiledFormula = (
  deps: Range[],
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  ctx: {}
) => FormulaReturn;

export interface CompiledFormula {
  execute: _CompiledFormula;
  tokens: Token[];
  dependencies: string[];
}

export type Matrix<T = unknown> = T[][];

// FORMULA FUNCTION INPUT

export type Arg = MatrixArg | PrimitiveArg;
export type MatrixArg = { value: MatrixArgValue; format?: MatrixArgFormat };
export type PrimitiveArg = { value: PrimitiveArgValue; format?: PrimitiveFormat };

export type ArgValue = PrimitiveArgValue | MatrixArgValue;

export type MatrixArgValue = Matrix<CellValue | undefined>; // TODO: replace undefined by null for consistency --> MatrixArgValue will be Matrix<PrimitiveArgValue>
export type PrimitiveArgValue = CellValue | null; // null represents an empty cell. We prefer null instead of undefined because undefined could be replaced by a default value when passed to a javascript function

export type MatrixArgFormat = Matrix<PrimitiveFormat>;
export type PrimitiveFormat = Format | undefined;

// FORMULA FUNCTION OUTPUT

export type FunctionReturn = MatrixFunctionReturn | PrimitiveFunctionReturn;
export type FunctionReturnValue = CellValue | Matrix<CellValue>;
export type FunctionReturnFormat = PrimitiveFormat | MatrixArgFormat;

export type MatrixFunctionReturn = { value: Matrix<CellValue>; format?: FunctionReturnFormat }; // why FunctionReturnFormat and not MatrixArgFormat ?: in case of a matrix, format could stay primitive to avoid fill the whole matrix with same format
export type PrimitiveFunctionReturn = { value: CellValue; format?: PrimitiveFormat };

// FORMULA OUTPUT

export type FormulaReturn = MatrixFunctionReturn | PrimitiveFormulaReturn;
type PrimitiveFormulaReturn = { value: CellValue | null; format?: PrimitiveFormat };

export function isMatrix(x: any): x is Matrix<any> {
  return Array.isArray(x) && Array.isArray(x[0]);
}

export interface ClipboardCell {
  cell?: Cell;
  style?: Style;
  evaluatedCell: EvaluatedCell;
  border?: Border;
  position: CellPosition;
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
  topLeft: Position;
}

export interface Highlight {
  zone: Zone;
  sheetId: UID;
  color: Color | null;
}

export interface PaneDivision {
  /** Represents the number of frozen columns */
  xSplit: number;
  /** Represents the number of frozen rows */
  ySplit: number;
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

export type BorderDescription = { vertical?: BorderDescr; horizontal?: BorderDescr } | undefined;

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

export type Dimension = "COL" | "ROW";

export type ConsecutiveIndexes = HeaderIndex[];

export interface RangeProvider {
  adaptRanges: (applyChange: ApplyRangeChange, sheetId?: UID) => void;
}

export type Validation<T> = (toValidate: T) => CommandResult | CommandResult[];

export type Increment = 1 | -1 | 0;

export interface Ref<T> {
  el: T | null;
}

/**
 * Return the prop's type of a component
 */
export type PropsOf<C> = C extends ComponentConstructor<infer Props> ? Props : never;

/**
 * Container for a lazy computed value
 */
export interface Lazy<T> {
  /**
   * Return the computed value.
   * The value is computed only once and memoized.
   */
  (): T;
  /**
   * Map a lazy value to another lazy value.
   *
   * ```ts
   * // neither function is called here
   * const lazyValue = lazy(() => veryExpensive(...)).map((result) => alsoVeryExpensive(result));
   *
   * // both values are computed now
   * const value = lazyValue()
   * ```
   */
  map: <U>(callback: (value: T) => U) => Lazy<U>;
}

export interface Cloneable<T> {
  clone: (args?: Partial<T>) => T;
}

export type CSSProperties<P extends string = string> = Record<P, string | undefined>;

export interface SortOptions {
  /** If true sort the headers of the range along with the rest */
  sortHeaders?: boolean;
  /** If true treat empty cells as "0" instead of undefined */
  emptyCellAsZero?: boolean;
}

export interface MenuMouseEvent extends MouseEvent {
  closedMenuId?: UID;
}
