// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------
import { Token } from "../formulas";
import { Cell, CellValue } from "./cells";
import { CommandResult } from "./commands";
import { Format } from "./format";

export type UID = string;
/**
 * CSS style color string
 * e.g. "#ABC", "#AAAFFF", "rgb(30, 80, 16)"
 */
export type Color = string;

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
export type SheetId = UID;

export interface Link {
  label: string;
  url: string;
  /**
   * Specifies if the resource is external and can
   * be opened in a new tab.
   */
  isExternal?: boolean;
}

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface AnchorZone {
  zone: Zone;
  cell: Position;
}

export interface Selection {
  anchor: AnchorZone;
  zones: Zone[];
}

export interface ZoneDimension {
  height: number;
  width: number;
}

export type Align = "left" | "right" | "center" | undefined;
export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  align?: Align;
  fillColor?: string;
  textColor?: string;
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
  cols: Col[];
  rows: Row[];
  hiddenColsGroups: ConsecutiveIndexes[];
  hiddenRowsGroups: ConsecutiveIndexes[];
  areGridLinesVisible: boolean;
  isVisible: boolean;
}

export interface CellPosition {
  col: number;
  row: number;
  sheetId: UID;
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

export interface RangePart {
  colFixed: boolean;
  rowFixed: boolean;
}

export type Range = {
  zone: Zone; // the zone the range actually spans
  sheetId: UID; // the sheet on which the range is defined
  invalidSheetName?: string; // the name of any sheet that is invalid
  invalidXc?: string;
  parts: RangePart[];
  prefixSheet: boolean; // true if the user provided the range with the sheet name, so it has to be recomputed with the sheet name too
};
export type ReferenceDenormalizer = (
  position: number,
  references: Range[],
  sheetId: UID,
  isMeta: boolean,
  functionName: string,
  paramNumber: number
) => any | any[][];

export type EnsureRange = (position: number, references: Range[], sheetId: UID) => any[][];

export type NumberParser = (str: string) => number;

export type _CompiledFormula = (
  deps: Range[],
  sheetId: UID,
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  ctx: {}
) => any;

export interface CompiledFormula {
  execute: _CompiledFormula;
  tokens: Token[];
  dependenciesFormat: (Format | number)[];
  dependencies: string[];
}

export type ArgValue = CellValue | undefined;
export type ArgRange = ArgValue[][];
export type Argument = ArgValue | ArgRange;

export interface ClipboardCell {
  cell?: Cell;
  border?: Border;
  position: CellPosition;
}

export interface HeaderDimensions {
  start: number;
  size: number;
  end: number;
}

export interface Header {
  name: string;
}

export interface Header {
  name: string;
  isHidden?: boolean;
}

export interface Row extends Header {
  cells: Record<number, UID | undefined>;
}

export type Col = Header;

export interface Position {
  col: number;
  row: number;
}
export interface Merge extends Zone {
  id: number;
  topLeft: Position;
}

export interface Highlight {
  zone: Zone;
  sheetId: UID;
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

export type BorderDescription = { vertical?: BorderDescr; horizontal?: BorderDescr } | undefined;

export const enum DIRECTION {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export type ChangeType = "REMOVE" | "RESIZE" | "MOVE" | "CHANGE" | "NONE";
export type ApplyRangeChangeResult =
  | { changeType: Exclude<ChangeType, "NONE">; range: Range }
  | { changeType: "NONE" };
export type ApplyRangeChange = (range: Range) => ApplyRangeChangeResult;

export type Dimension = "COL" | "ROW";

export type ConsecutiveIndexes = number[];

export interface RangeProvider {
  adaptRanges: (applyChange: ApplyRangeChange, sheetId?: UID) => void;
}

export type Validation<T> = (toValidate: T) => CommandResult | CommandResult[];

export type ClipboardOptions = "onlyFormat" | "onlyValue";

export type Increment = 1 | -1 | 0;

export interface Ref<T> {
  el: T | null;
}

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
