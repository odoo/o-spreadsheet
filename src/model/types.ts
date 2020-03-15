/**
 * State
 *
 * This file defines the basic types involved in maintaining the running state
 * of a o-spreadsheet.
 *
 * The most important exported values are:
 * - interface GridState: the internal type of the state managed by the model
 */

// -----------------------------------------------------------------------------
// WorkBook
// -----------------------------------------------------------------------------
export interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

export interface HistoryStep {
  batch: HistoryChange[];
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

export interface Sheet {
  name: string;
  cells: { [key: string]: Cell };
  colNumber: number;
  rowNumber: number;
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };
  cols: Col[];
  rows: Row[];
  conditionalFormats: ConditionalFormat[];
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

export interface Cell extends NewCell {
  col: number;
  row: number;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
  async?: boolean;
  type: "formula" | "text" | "number";
  width?: number;
  conditionalStyle?: Style;
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
  status: "empty" | "visible" | "invisible";
  shouldCut?: boolean;
  zones: Zone[];
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

export interface Workbook {
  rows: Row[];
  cols: Col[];
  cells: { [key: string]: Cell };
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number;
  height: number;
  // actual size of the visible grid, in pixel
  clientWidth: number;
  clientHeight: number;

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

  isEditing: boolean;
  currentContent: string;

  clipboard: ClipBoard;
  trackChanges: boolean;
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];
  nextId: number;
  highlights: Highlight[];
  isSelectingRange: boolean;
  isCopyingFormat: boolean;

  loadingCells: number;

  // sheets
  sheets: Sheet[];
  activeSheet: Sheet;
}

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
  align: "left" | "right" | null;
  clipRect: Rect | null;
  isError?: boolean;
}

export interface UI {
  selection: Selection;

  activeCol: number;
  activeRow: number;
  activeXc: string;
  sheets: string[];
  activeSheet: string;

  clipboard: ClipBoard;
  highlights: Highlight[];
  isSelectingRange: boolean;

  selectedCell: Cell | null;
  style: Style;
  isMergeDestructive: boolean;
  aggregate: string | null;

  isCopyingFormat: boolean;
  isEditing: boolean;

  canUndo: boolean;
  canRedo: boolean;

  // to remove someday
  currentContent: string;
  rows: Row[];
  cols: Col[];
  styles: { [key: number]: Style };
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  width: number;
  height: number;

  offsetX: number;
  offsetY: number;
  scrollTop: number;
  scrollLeft: number;

  viewport: Zone;
}

export interface Viewport {
  boxes: Box[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  activeCols: Set<number>;
  activeRows: Set<number>;
}

export interface ConditionalFormat {
  formatRule: ConditionalFormattingRule; // the rules to apply, in order
  ranges: string[]; // the cells/ranges on which to apply this conditional formatting
  style: Style;
}

// -----------------------------------------------------------------------------
// Conditional Formatting
// -----------------------------------------------------------------------------

/**
 * https://docs.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/025ea6e4-ad42-43ea-a016-16f4e4688ac8
 */
export interface ConditionalFormattingRule {
  type: ConditionalFormattingRuleType;
  stopIfTrue?: boolean; // the next rules must not be evaluated/applied if this rule is true
}

export type ConditionalFormattingRuleType =
  | CellIsRule
  | ExpressionRule
  | ColorScaleRule
  | DataBarRule
  | IconSetRule
  | ContainsTextRule
  | NotContainsTextRule
  | BeginsWithRule
  | EndsWithRule
  | containsBlanksRule
  | notContainsBlanksRule
  | containsErrorsRule
  | notContainsErrorsRule
  | TimePeriodRule
  | AboveAverageRule
  | Top10Rule;

export type ConditionalFormattingRuleTypeString =
  | "CellIsRule"
  | "ExpressionRule"
  | "ColorScaleRule"
  | "DataBarRule"
  | "IconSetRule"
  | "ContainsTextRule"
  | "NotContainsTextRule"
  | "BeginsWithRule"
  | "EndsWithRule"
  | "containsBlanksRule"
  | "notContainsBlanksRule"
  | "containsErrorsRule"
  | "notContainsErrorsRule"
  | "TimePeriodRule"
  | "AboveAverageRule"
  | "Top10Rule";

export interface TextRule {
  text: string;
}
export interface CellIsRule {
  kind: "CellIsRule";
  operator: ConditionalFormattingOperatorValues;
  // can be one value for all operator except between, then it is 2 values
  values: string[];
}

export interface ExpressionRule {
  kind: "ExpressionRule";
}
export interface ColorScaleRule {
  kind: "ColorScaleRule";
}
export interface DataBarRule {
  kind: "ColorScaleRule";
}
export interface IconSetRule {
  kind: "IconSetRule";
}
export interface ContainsTextRule extends TextRule {
  kind: "ContainsTextRule";
}
export interface NotContainsTextRule extends TextRule {
  kind: "NotContainsTextRule";
}
export interface BeginsWithRule extends TextRule {
  kind: "BeginsWithRule";
}
export interface EndsWithRule extends TextRule {
  kind: "EndsWithRule";
}
export interface containsBlanksRule {
  kind: "containsBlanksRule";
}
export interface notContainsBlanksRule {
  kind: "notContainsBlanksRule";
}
export interface containsErrorsRule {
  kind: "containsErrorsRule";
}
export interface notContainsErrorsRule {
  kind: "notContainsErrorsRule";
}
export interface TimePeriodRule {
  kind: "TimePeriodRule";
  timePeriod: string;
}
export interface AboveAverageRule {
  kind: "AboveAverageRule";
  /*"true" The conditional formatting rule is applied to cells with values above the average value of all cells in the range.
    "false" The conditional formatting rule is applied to cells with values below the average value of all cells in the range.*/
  aboveAverage: boolean;
  equalAverage: boolean;
}

export interface Top10Rule {
  kind: "Top10Rule";
  percent: boolean;
  bottom: boolean;
  /*  specifies how many cells are formatted by this conditional formatting rule. The value of percent specifies whether
      rank is a percentage or a quantity of cells. When percent is "true", rank MUST be greater than or equal to zero and
      less than or equal to 100. Otherwise, rank MUST be greater than or equal to 1 and less than or equal to 1,000 */
  rank: number;
}
//https://docs.microsoft.com/en-us/dotnet/api/documentformat.openxml.spreadsheet.conditionalformattingoperatorvalues?view=openxml-2.8.1
export type ConditionalFormattingOperatorValues =
  | "BeginsWith"
  | "Between"
  | "ContainsText"
  | "EndsWith"
  | "Equal"
  | "GreaterThan"
  | "GreaterThanOrEqual"
  | "LessThan"
  | "LessThanOrEqual"
  | "NotBetween"
  | "NotContains"
  | "NotEqual";

// -----------------------------------------------------------------------------
// Grid commands
// -----------------------------------------------------------------------------
type Target = Zone[];

export interface CommandCopy {
  type: "COPY";
  target: Target;
  onlyFormat?: boolean;
}

export interface CommandCut {
  type: "CUT";
  target: Target;
}

export type GridCommand = CommandCopy | CommandCut;
