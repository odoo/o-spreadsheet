// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------

export declare type NormalizedFormula = {
  // if the content is a formula (ex. =sum(  a1:b3, 3) + a1, should be stored as
  // {formula: "=sum(  |ref1|, 3) + |ref2|"), ["a1:b3","a1"]
  text: string;
  dependencies: string[];
  value?: any;
};

export type UID = string;

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
  align?: Align;
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
}

export interface UpdateCellData {
  content?: string;
  formula?: NormalizedFormula;
  style?: Style | null;
  format?: string;
}

export interface Sheet {
  id: UID;
  name: string;
  cols: Col[];
  rows: Row[];
  hiddenColsGroups: ConsecutiveIndexes[];
  hiddenRowsGroups: ConsecutiveIndexes[];
  areGridLinesVisible: boolean;
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

export type _CompiledFormula = (
  deps: Range[],
  sheetId: UID,
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  ctx: {}
) => any;

export interface CompiledFormula extends _CompiledFormula {
  async: boolean;
  dependenciesFormat: (string | number)[];
}

export enum CellType {
  text = "text",
  number = "number",
  formula = "formula",
  empty = "empty",
  invalidFormula = "invalidFormula",
}

export type CellValue = string | number | boolean;
export interface CellBase {
  id: UID;
  style?: Style;
  format?: string;
  error?: string;
  value: CellValue;
}

export type ArgValue = CellValue | undefined;
export type ArgRange = ArgValue[][];
export type Argument = ArgValue | ArgRange;

export interface OtherCell extends CellBase {
  type: CellType.number | CellType.text | CellType.invalidFormula;
  content: string;
}

export interface FormulaCell extends CellBase {
  type: CellType.formula;
  formula: {
    text: string;
    compiledFormula: CompiledFormula;
    format?: string;
  };
  dependencies: Range[];
}

export interface EmptyCell extends CellBase {
  type: CellType.empty;
}

export type Cell = FormulaCell | EmptyCell | OtherCell;

export interface ClipboardCell {
  cell?: Cell;
  border?: Border;
  position: CellPosition;
}

export interface Header {
  start: number;
  end: number;
  name: string;
  size: number;
  isHidden?: boolean;
}

export interface Row extends Header {
  cells: Record<number, Cell | undefined>;
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

export type ClipboardOptions = "onlyFormat" | "onlyValue";

export type Increment = 1 | -1 | 0;

export type Mode = "normal" | "headless" | "readonly";

export interface ComposerSelection {
  start: number;
  end: number;
}

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
}

export interface ReplaceOptions {
  modifyFormulas: boolean;
}

export interface Selection {
  anchor: [number, number];
  zones: Zone[];
  anchorZone: Zone;
}

export enum SelectionMode {
  idle,
  selecting,
  readyToExpand, //The next selection will add another zone to the current selection
  expanding,
}

export type EditionMode =
  | "editing"
  | "waitingForRangeSelection"
  | "rangeSelected" // should tell if you need to underline the current range selected.
  | "inactive"
  | "resettingPosition";

export interface RangeInputValue {
  id: UID;
  xc: string;
  color?: string | null;
}

export interface SearchMatch {
  selected: boolean;
  col: number;
  row: number;
}

export interface AutomaticSum {
  position: [number, number];
  zone: Zone;
}

export type HtmlContent = {
  value: string;
  color: string;
  class?: string;
};

export interface ComposerDimension {
  width: number;
  height: number;
}
