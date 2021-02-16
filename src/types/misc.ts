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

export interface Sheet {
  id: UID;
  name: string;
  cols: Col[];
  rows: Row[];
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
  parts: RangePart[];
  prefixSheet: boolean; // true if the user provided the range with the sheet name, so it has to be recomputed with the sheet name too
};
export type ReferenceDenormalizer = (
  position: number,
  references: Range[],
  sheetId: UID,
  isMeta: boolean
) => any | any[][];

export type EnsureRange = (position: number, references: Range[]) => any[][];

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

export interface CellBase {
  id: UID;
  style?: Style;
  border?: number;
  format?: string;
  error?: string;
  value: unknown;
}

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

export interface Header {
  start: number;
  end: number;
  name: string;
  size: number;
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

export interface RangeProvider {
  adaptRanges: (applyChange: ApplyRangeChange, sheetId?: UID) => void;
}
