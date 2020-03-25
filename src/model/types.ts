/**
 * State
 *
 * This file defines the basic types involved in maintaining the running state
 * of a o-spreadsheet.
 *
 * The most important exported values are:
 * - interface GridState: the internal type of the state managed by the model
 */

import { GridPlugin } from "./plugins/grid";
import { ClipboardPlugin } from "./plugins/clipboard";
import { EntityPlugin } from "./plugins/entity";
import { SelectionPlugin } from "./plugins/selection";
import { CorePlugin } from "./plugins/core";
import { ConditionalFormatPlugin } from "./plugins/conditional_format";
import { LayouPlugin } from "./plugins/layout";

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

  activeCol: number;
  activeRow: number;
  activeXc: string;
  selection: Selection;

  isEditing: boolean;
  currentContent: string;

  trackChanges: boolean;
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];
  nextId: number;
  highlights: Highlight[];
  isSelectingRange: boolean;

  loadingCells: number;
  isStale: boolean; // to indicate if we should reevaluate the formulas

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

  clipboard: Zone[];
  highlights: Highlight[];
  isSelectingRange: boolean;

  selectedCell: Cell | null;
  style: Style;
  isMergeDestructive: boolean;
  aggregate: string | null;

  isEditing: boolean;

  canUndo: boolean;
  canRedo: boolean;

  isPaintingFormat: boolean;
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

// -----------------------------------------------------------------------------
// Conditional Formatting
// -----------------------------------------------------------------------------

export interface ConditionalFormat {
  formatRule: ConditionalFormattingRule; // the rules to apply, in order
  ranges: string[]; // the cells/ranges on which to apply this conditional formatting
  style: Style;
}

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
// Getters
// -----------------------------------------------------------------------------
export interface Getters {
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];
  expandZone: CorePlugin["expandZone"];
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  getCellWidth: GridPlugin["getCellWidth"];
  getColSize: GridPlugin["getColSize"];
  getRowSize: GridPlugin["getRowSize"];
  getCol: GridPlugin["getCol"];
  getRow: GridPlugin["getRow"];
  getEntity: EntityPlugin["getEntity"];
  getEntities: EntityPlugin["getEntities"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getSelectionXC: SelectionPlugin["getSelectionXC"];
  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getViewport: LayouPlugin["getViewport"];
}

// -----------------------------------------------------------------------------
// Grid commands
// -----------------------------------------------------------------------------

/**
 * There are two kinds of commands: Primitive and Local
 *
 * - Primitive commands are commands that
 *    1. manipulate the imported/exported spreadsheet state
 *    2. are "low level" => cannot be converted into lower level commands
 *    3. make sense when sent by the network to another user
 *
 * - Local commands: every other command.
 *    1. manipulate the local state (such as the selection, or the clipboard)
 *    2. can often be converted into primitive commands
 *    3. do not make sense to send by network to another user.
 *
 * For example, "RESIZE_COLUMNS" is a primitive command. "AUTORESIZE_COLUMNS"
 * can be (locally) converted into a "RESIZE_COLUMNS", and therefore, is not a
 * primitive command.
 *
 * Primitive commands should be "device agnostic". This means that they should
 * contain all the information necessary to perform their job. Local commands
 * can use inferred information from the local internal state, such as the
 * active sheet.
 */
type Target = Zone[];

// Primitive Commands
// ------------------------------------------------
export interface ResizeColumnsCommand {
  type: "RESIZE_COLUMNS";
  sheet: string;
  cols: number[];
  size: number;
}

export interface ResizeRowsCommand {
  type: "RESIZE_ROWS";
  sheet: string;
  rows: number[];
  size: number;
}

export interface AddEntityCommand {
  type: "ADD_ENTITY";
  kind: string;
  key: string;
  value: any;
}

export interface RemoveEntityCommand {
  type: "REMOVE_ENTITY";
  kind: string;
  key: string;
}

/**
 * Todo: add a string "id" field, and change the code to use internally a uuid.
 */
export interface CreateSheetCommand {
  type: "CREATE_SHEET";
}

export interface DeleteCommand {
  type: "DELETE";
  sheet: string;
  target: Target;
}

/**
 * todo: add sheet argument...
 * todo: use id instead of a list. this is not safe to serialize and send to
 * another user
 */
export interface AddConditionalFormatCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
  replace?: ConditionalFormat;
}

// Local Commands
// ------------------------------------------------
export interface CopyCommand {
  type: "COPY";
  target: Target;
}

export interface CutCommand {
  type: "CUT";
  target: Target;
}

export interface PasteCommand {
  type: "PASTE";
  target: Target;
  onlyFormat?: boolean;
}

export interface ActivatePaintFormatCommand {
  type: "ACTIVATE_PAINT_FORMAT";
  target: Target;
}

export interface PasteFromOSClipboardCommand {
  type: "PASTE_FROM_OS_CLIPBOARD";
  target: Target;
  text: string;
}

export interface AutoresizeColumnsCommand {
  type: "AUTORESIZE_COLUMNS";
  sheet: string;
  cols: number[];
}

export interface AutoresizeRowsCommand {
  type: "AUTORESIZE_ROWS";
  sheet: string;
  rows: number[];
}

export interface MovePositionCommand {
  type: "MOVE_POSITION";
  deltaX: number;
  deltaY: number;
}

export interface ActivateSheetCommand {
  type: "ACTIVATE_SHEET";
  sheet: string;
}

export interface SelectCellCommand {
  type: "SELECT_CELL";
  col: number;
  row: number;
  createNewRange?: boolean;
}

export interface SetSelectionCommand {
  type: "SET_SELECTION";
  anchor: [number, number];
  zones: Zone[];
}

export interface SelectColumnCommand {
  type: "SELECT_COLUMN";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectRowCommand {
  type: "SELECT_ROW";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectAllCommand {
  type: "SELECT_ALL";
}

export interface AlterSelectionCommand {
  type: "ALTER_SELECTION";
  delta?: [number, number];
  cell?: [number, number];
}

export interface EvaluateCellsCommand {
  type: "EVALUATE_CELLS";
  onlyWaiting?: boolean;
}

export interface AddHighlightsCommand {
  type: "ADD_HIGHLIGHTS";
  ranges: { [range: string]: string };
}

export interface RemoveHighlightsCommand {
  type: "REMOVE_HIGHLIGHTS";
}

export interface StartComposerSelectionCommand {
  type: "START_COMPOSER_SELECTION";
}

export interface StopComposerSelectionCommand {
  type: "STOP_COMPOSER_SELECTION";
}

export interface StartEditionCommand {
  type: "START_EDITION";
  text?: string;
}

export interface StopEditionCommand {
  type: "STOP_EDITION";
  cancel?: boolean;
}

export type GridCommand =
  | CopyCommand
  | CutCommand
  | PasteCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
  | AddEntityCommand
  | RemoveEntityCommand
  | ResizeRowsCommand
  | ResizeColumnsCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
  | MovePositionCommand
  | CreateSheetCommand
  | ActivateSheetCommand
  | SelectCellCommand
  | SetSelectionCommand
  | SelectColumnCommand
  | SelectRowCommand
  | SelectAllCommand
  | AlterSelectionCommand
  | DeleteCommand
  | EvaluateCellsCommand
  | AddConditionalFormatCommand
  | AddHighlightsCommand
  | RemoveHighlightsCommand
  | StartComposerSelectionCommand
  | StopComposerSelectionCommand
  | StartEditionCommand
  | StopEditionCommand;

export type CommandResult = "COMPLETED" | "CANCELLED";
