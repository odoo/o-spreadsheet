import { Cell, CellValue, EvaluatedCell } from "./cells";

import { CommandResult } from "./commands";
// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------
import { ComponentConstructor } from "@odoo/owl";
import { Token } from "../formulas";
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
export type TableId = UID & Alias;

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
) => FPayload;

export type EnsureRange = (range: Range) => Matrix<FPayload>;

export type FormulaToExecute = (
  deps: Range[],
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  ctx: {}
) => Matrix<FPayload> | FPayload;

export interface CompiledFormula {
  execute: FormulaToExecute;
  tokens: Token[];
  dependencies: string[];
}

export interface RangeCompiledFormula extends Omit<CompiledFormula, "dependencies"> {
  dependencies: Range[];
}

export type Matrix<T = unknown> = T[][];
export type FPayload = { value: CellValue; format?: Format; message?: string };
export type FPayloadNumber = { value: number; format?: string };

// FORMULA FUNCTION VALUE AND FORMAT INPUT
export type Arg = Maybe<FPayload> | Matrix<FPayload>; // undefined corresponds to the lack of argument, e.g. =SUM(1,2,,4)

export function isMatrix(x: any): x is Matrix<any> {
  return Array.isArray(x) && Array.isArray(x[0]);
}

export interface ClipboardCell {
  cell?: Cell;
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
}

export interface Highlight {
  zone: Zone;
  sheetId: UID;
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

export type Maybe<T> = T | undefined;

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

// https://github.com/Microsoft/TypeScript/issues/13923#issuecomment-557509399
// prettier-ignore
export type Immutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? ImmutableArray<U> :
    T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
    T extends Set<infer M> ? ImmutableSet<M> :
    ImmutableObject<T>;

type ImmutablePrimitive = undefined | null | boolean | string | number | Function;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export interface HeaderGroup {
  start: HeaderIndex;
  end: HeaderIndex;
  isFolded?: boolean;
}

export type Direction = "up" | "down" | "left" | "right";

export type SelectionStep = number | "end";

export interface Offset {
  col: number;
  row: number;
}

export type DebouncedFunction<T> = T & {
  stopDebounce: () => void;
  isDebouncePending: () => boolean;
};

export interface GridClickModifiers {
  addZone: boolean;
  expandZone: boolean;
  closePopover: boolean;
}
