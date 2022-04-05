import { ComposerSelection } from "../plugins/ui/edition";
import { ReplaceOptions, SearchOptions } from "../plugins/ui/find_and_replace";
import { UpDown } from "./conditional_formatting";
import {
  BorderCommand,
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  ConditionalFormat,
  Figure,
  Format,
  Style,
  Zone,
} from "./index";
import { Border, CellPosition, ClipboardOptions, Dimension, UID } from "./misc";

// -----------------------------------------------------------------------------
// Grid commands
// -----------------------------------------------------------------------------

/**
 * There are two kinds of commands: CoreCommands and LocalCommands
 *
 * - CoreCommands are commands that
 *   1. manipulate the imported/exported spreadsheet state
 *   2. are shared in collaborative environment
 *
 * - LocalCommands: every other command
 *   1. manipulate the local state
 *   2. can be converted into CoreCommands
 *   3. are not shared in collaborative environment
 *
 * For example, "RESIZE_COLUMNS_ROWS" is a CoreCommand. "AUTORESIZE_COLUMNS"
 * can be (locally) converted into a "RESIZE_COLUMNS_ROWS", and therefore, is not a
 * CoreCommand.
 *
 * CoreCommands should be "device agnostic". This means that they should
 * contain all the information necessary to perform their job. Local commands
 * can use inferred information from the local internal state, such as the
 * active sheet.
 */
export interface SheetDependentCommand {
  sheetId: UID;
}

export function isSheetDependent(cmd: CoreCommand): boolean {
  return "sheetId" in cmd;
}

export interface GridDependentCommand {
  dimension: Dimension;
}

export function isGridDependent(cmd: CoreCommand): boolean {
  return "dimension" in cmd;
}

export interface TargetDependentCommand {
  target: Zone[];
}

export function isTargetDependent(cmd: CoreCommand): boolean {
  return "target" in cmd;
}

export interface PositionDependentCommand {
  col: number;
  row: number;
}

export function isPositionDependent(cmd: CoreCommand): boolean {
  return "col" in cmd && "row" in cmd;
}

export const invalidateEvaluationCommands = new Set<CommandTypes>([
  "RENAME_SHEET",
  "DELETE_SHEET",
  "CREATE_SHEET",
  "ADD_COLUMNS_ROWS",
  "REMOVE_COLUMNS_ROWS",
  "DELETE_CELL",
  "INSERT_CELL",
  "UNDO",
  "REDO",
]);

export const readonlyAllowedCommands = new Set<CommandTypes>([
  "START",
  "ACTIVATE_SHEET",

  "COPY",

  "PREPARE_SELECTION_INPUT_EXPANSION",
  "STOP_SELECTION_INPUT",

  "RESIZE_VIEWPORT",
  "SET_VIEWPORT_OFFSET",

  "SELECT_SEARCH_NEXT_MATCH",
  "SELECT_SEARCH_PREVIOUS_MATCH",
  "REFRESH_SEARCH",
  "UPDATE_SEARCH",
  "CLEAR_SEARCH",

  "EVALUATE_CELLS",

  "SET_CURRENT_CONTENT",

  "SET_FORMULA_VISIBILITY",
]);

export const coreTypes = new Set<CoreCommandTypes>([
  /** CELLS */
  "UPDATE_CELL",
  "UPDATE_CELL_POSITION",
  "CLEAR_CELL",
  "DELETE_CONTENT",

  /** GRID SHAPE */
  "ADD_COLUMNS_ROWS",
  "REMOVE_COLUMNS_ROWS",
  "RESIZE_COLUMNS_ROWS",
  "HIDE_COLUMNS_ROWS",
  "UNHIDE_COLUMNS_ROWS",
  "SET_GRID_LINES_VISIBILITY",

  /** MERGE */
  "ADD_MERGE",
  "REMOVE_MERGE",

  /** SHEETS MANIPULATION */
  "CREATE_SHEET",
  "DELETE_SHEET",
  "DUPLICATE_SHEET",
  "MOVE_SHEET",
  "RENAME_SHEET",
  "HIDE_SHEET",
  "SHOW_SHEET",

  /** RANGES MANIPULATION */
  "MOVE_RANGES",

  /** CONDITIONAL FORMAT */
  "ADD_CONDITIONAL_FORMAT",
  "REMOVE_CONDITIONAL_FORMAT",
  "MOVE_CONDITIONAL_FORMAT",

  /** FIGURES */
  "CREATE_FIGURE",
  "DELETE_FIGURE",
  "UPDATE_FIGURE",

  /** FORMATTING */
  "SET_FORMATTING",
  "CLEAR_FORMATTING",
  "SET_BORDER",
  "SET_DECIMAL",

  /** CHART */
  "CREATE_CHART",
  "UPDATE_CHART",
]);

export function isCoreCommand(cmd: Command): cmd is CoreCommand {
  return coreTypes.has(cmd.type as any);
}

export function canExecuteInReadonly(cmd: Command): boolean {
  return readonlyAllowedCommands.has(cmd.type);
}

//#region Core Commands
// ------------------------------------------------

//------------------------------------------------------------------------------
// Cells
//------------------------------------------------------------------------------
export interface UpdateCellCommand extends SheetDependentCommand, PositionDependentCommand {
  type: "UPDATE_CELL";
  content?: string;
  style?: Style | null;
  format?: Format;
}

/**
 * Move a cell to a given position or clear the position.
 */
export interface UpdateCellPositionCommand extends SheetDependentCommand, PositionDependentCommand {
  type: "UPDATE_CELL_POSITION";
  cellId?: UID;
}

//------------------------------------------------------------------------------
// Grid Shape
//------------------------------------------------------------------------------

export interface AddColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "ADD_COLUMNS_ROWS";
  base: number;
  quantity: number;
  position: "before" | "after";
}

export interface RemoveColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "REMOVE_COLUMNS_ROWS";
  elements: number[];
}

export interface MoveColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "MOVE_COLUMNS_ROWS";
  base: number;
  elements: number[];
}

export interface ResizeColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "RESIZE_COLUMNS_ROWS";
  elements: number[];
  size: number;
}

export interface HideColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "HIDE_COLUMNS_ROWS";
  elements: number[];
}
export interface UnhideColumnsRowsCommand extends SheetDependentCommand, GridDependentCommand {
  type: "UNHIDE_COLUMNS_ROWS";
  elements: number[];
}
export interface SetGridLinesVisibilityCommand extends SheetDependentCommand {
  type: "SET_GRID_LINES_VISIBILITY";
  areGridLinesVisible: boolean;
}

//------------------------------------------------------------------------------
// Merge
//------------------------------------------------------------------------------

export interface AddMergeCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "ADD_MERGE";
  force?: boolean;
}

export interface RemoveMergeCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "REMOVE_MERGE";
}

//------------------------------------------------------------------------------
// Sheets Manipulation
//------------------------------------------------------------------------------

export interface CreateSheetCommand extends SheetDependentCommand {
  type: "CREATE_SHEET";
  position: number;
  name?: string; // should be required in master
  cols?: number;
  rows?: number;
}

export interface DeleteSheetCommand extends SheetDependentCommand {
  type: "DELETE_SHEET";
}

export interface DuplicateSheetCommand extends SheetDependentCommand {
  type: "DUPLICATE_SHEET";
  sheetIdTo: UID;
}

export interface MoveSheetCommand extends SheetDependentCommand {
  type: "MOVE_SHEET";
  direction: "left" | "right";
}

export interface RenameSheetCommand extends SheetDependentCommand {
  type: "RENAME_SHEET";
  name?: string;
}

export interface HideSheetCommand extends SheetDependentCommand {
  type: "HIDE_SHEET";
}

export interface ShowSheetCommand extends SheetDependentCommand {
  type: "SHOW_SHEET";
}

//------------------------------------------------------------------------------
// Ranges Manipulation
//------------------------------------------------------------------------------

/**
 * Command created in order to apply a translational movement for all references
 * to cells/ranges within a specific zone.
 * Command particularly useful during CUT / PATE.
 */
export interface MoveRangeCommand
  extends SheetDependentCommand,
    PositionDependentCommand,
    TargetDependentCommand {
  type: "MOVE_RANGES";
  targetSheetId: string;
}

//------------------------------------------------------------------------------
// Conditional Format
//------------------------------------------------------------------------------

/**
 * todo: use id instead of a list. this is not safe to serialize and send to
 * another user
 */
export interface AddConditionalFormatCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: Omit<ConditionalFormat, "ranges">;
}

export interface RemoveConditionalFormatCommand extends SheetDependentCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
}

export interface MoveConditionalFormatCommand extends SheetDependentCommand {
  type: "MOVE_CONDITIONAL_FORMAT";
  cfId: UID;
  direction: UpDown;
}

//------------------------------------------------------------------------------
// Figures
//------------------------------------------------------------------------------

export interface CreateFigureCommand extends SheetDependentCommand {
  type: "CREATE_FIGURE";
  figure: Figure;
}

export interface UpdateFigureCommand extends Partial<Figure>, SheetDependentCommand {
  type: "UPDATE_FIGURE";
  id: UID;
}

export interface DeleteFigureCommand extends SheetDependentCommand {
  type: "DELETE_FIGURE";
  id: UID;
}

//------------------------------------------------------------------------------
// Chart
//------------------------------------------------------------------------------

export interface CreateChartCommand extends SheetDependentCommand {
  type: "CREATE_CHART";
  id: UID;
  position?: { x: number; y: number };
  definition: ChartUIDefinition;
}

export interface UpdateChartCommand extends SheetDependentCommand {
  type: "UPDATE_CHART";
  id: UID;
  definition: ChartUIDefinitionUpdate;
}

export interface RefreshChartCommand {
  type: "REFRESH_CHART";
  id: UID;
}

export interface SetFormattingCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "SET_FORMATTING";
  style?: Style;
  border?: BorderCommand;
  format?: Format;
}

export interface SetBorderCommand extends SheetDependentCommand, PositionDependentCommand {
  type: "SET_BORDER";
  border: Border | undefined;
}

export interface ClearFormattingCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "CLEAR_FORMATTING";
}

export interface SetDecimalCommand extends SheetDependentCommand, TargetDependentCommand {
  type: "SET_DECIMAL";
  step: number;
}
//#endregion

//#region Local Commands
// ------------------------------------------------
export interface CopyCommand {
  type: "COPY";
  target: Zone[];
}

export interface CutCommand {
  type: "CUT";
  target: Zone[];
}

export interface PasteCommand {
  type: "PASTE";
  target: Zone[];
  pasteOption?: ClipboardOptions;
  force?: boolean;
}

export interface AutoFillCellCommand {
  type: "AUTOFILL_CELL";
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  content?: string;
  style?: Style | null;
  border?: Border;
  format?: Format;
}

export interface ActivatePaintFormatCommand {
  type: "ACTIVATE_PAINT_FORMAT";
  target: Zone[];
}

export interface PasteFromOSClipboardCommand {
  type: "PASTE_FROM_OS_CLIPBOARD";
  target: Zone[];
  text: string;
}

export interface AutoresizeColumnsCommand {
  type: "AUTORESIZE_COLUMNS";
  sheetId: UID;
  cols: number[];
}

export interface AutoresizeRowsCommand {
  type: "AUTORESIZE_ROWS";
  sheetId: UID;
  rows: number[];
}

export interface ActivateSheetCommand {
  type: "ACTIVATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
}

/**
 * Set the selection mode to `readyToExpand`.
 * The user is ready to expand the selected zones with a new
 * selection (i.e. add an other zone the to currently selected zones).
 * In other words, the next selection will be added to the
 * current selection if this mode is active.
 */
export interface PrepareExpansionCommand {
  type: "PREPARE_SELECTION_INPUT_EXPANSION";
}

/**
 * Set the selection mode to `idle`.
 */
export interface StopSelectionCommand {
  type: "STOP_SELECTION_INPUT";
}

/**
 * Set a color to be used for the next selection to highlight.
 * The color is only used when selection highlight is enabled.
 */
export interface SetColorCommand {
  type: "SET_HIGHLIGHT_COLOR";
  color: string;
}

export interface EvaluateCellsCommand {
  type: "EVALUATE_CELLS";
  sheetId: UID;
  onlyWaiting?: boolean;
}

export interface StartChangeHighlightCommand {
  type: "START_CHANGE_HIGHLIGHT";
  zone: Zone;
}

export interface ChangeHighlightCommand {
  type: "CHANGE_HIGHLIGHT";
  zone: Zone;
}

export interface StopComposerSelectionCommand {
  type: "STOP_COMPOSER_RANGE_SELECTION";
}

export interface StartEditionCommand {
  type: "START_EDITION";
  text?: string;
  selection?: ComposerSelection;
}

export interface StopEditionCommand {
  type: "STOP_EDITION";
  cancel?: boolean;
}

export interface SetCurrentContentCommand {
  type: "SET_CURRENT_CONTENT";
  content: string;
  selection?: ComposerSelection;
}

export interface ChangeComposerSelectionCommand {
  type: "CHANGE_COMPOSER_CURSOR_SELECTION";
  start: number;
  end: number;
}

export interface ReplaceComposerSelectionCommand {
  type: "REPLACE_COMPOSER_CURSOR_SELECTION";
  text: string;
}

export interface CycleEditionReferencesCommand {
  type: "CYCLE_EDITION_REFERENCES";
}

export interface ShowFormulaCommand {
  type: "SET_FORMULA_VISIBILITY";
  show: boolean;
}

export interface DeleteContentCommand {
  type: "DELETE_CONTENT";
  sheetId: UID;
  target: Zone[];
}

export interface ClearCellCommand {
  type: "CLEAR_CELL";
  sheetId: UID;
  col: number;
  row: number;
}

export interface UndoCommand {
  type: "UNDO";
  commands: readonly CoreCommand[];
}

export interface RedoCommand {
  type: "REDO";
  commands: readonly CoreCommand[];
}

export interface RequestUndoCommand {
  type: "REQUEST_UNDO";
}

export interface RequestRedoCommand {
  type: "REQUEST_REDO";
}

export interface StartCommand {
  type: "START";
}

export interface AutofillCommand {
  type: "AUTOFILL";
}

export interface AutofillSelectCommand {
  type: "AUTOFILL_SELECT";
  col: number;
  row: number;
}

export interface AutofillAutoCommand {
  type: "AUTOFILL_AUTO";
}

/**
 * Create a new state for a SelectionInput component
 */
export interface NewInputCommand {
  type: "ENABLE_NEW_SELECTION_INPUT";
  /**
   * Identifier to use to reference this state.
   */
  id: string;
  /**
   * Initial ranges for the state.
   * e.g. ["B4", "A1:A3"]
   */
  initialRanges?: string[];
  /**
   * is the input limited to one range or has no limit ?
   */
  hasSingleRange?: boolean;
}

/**
 * Delete an identified SelectionInput state.
 */
export interface RemoveInputCommand {
  type: "DISABLE_SELECTION_INPUT";
  /** SelectionComponent id */
  id: string;
}

export interface UnfocusInputCommand {
  type: "UNFOCUS_SELECTION_INPUT";
}

/**
 * Set the focus on a given range of a SelectionComponent state.
 */
export interface FocusInputCommand {
  type: "FOCUS_RANGE";
  /** SelectionComponent id */
  id: string;
  /**
   * Range to focus
   */
  rangeId: string;
}

/**
 * Add an empty range at the end of a SelectionComponent state
 * and focus it.
 */
export interface AddEmptyRangeCommand {
  type: "ADD_EMPTY_RANGE";
  /** SelectionComponent id */
  id: string;
}

/**
 * Remove a given range in a SelectionComponent state
 */
export interface RemoveRangeCommand {
  type: "REMOVE_RANGE";
  /** SelectionComponent id */
  id: string;
  /** The range to be removed */
  rangeId: string;
}

/**
 * Set a new value for a given range of a SelectionComponent state.
 */
export interface ChangeRangeCommand {
  type: "CHANGE_RANGE";
  /** SelectionComponent id */
  id: string;
  /** The range to be changed */
  rangeId: string;
  /**
   * Range to set in the input. Invalid ranges are also accepted.
   * e.g. "B2:B3" or the invalid "A5:"
   */
  value: string;
}

export interface SelectFigureCommand {
  type: "SELECT_FIGURE";
  id: UID;
}

export interface UpdateSearchCommand {
  type: "UPDATE_SEARCH";
  toSearch: string;
  searchOptions: SearchOptions;
}

export interface ClearSearchCommand {
  type: "CLEAR_SEARCH";
}
export interface RefreshSearchCommand {
  type: "REFRESH_SEARCH";
}

export interface SelectSearchPreviousCommand {
  type: "SELECT_SEARCH_PREVIOUS_MATCH";
}

export interface SelectSearchNextCommand {
  type: "SELECT_SEARCH_NEXT_MATCH";
}

export interface ReplaceSearchCommand {
  type: "REPLACE_SEARCH";
  replaceWith: string;
  replaceOptions: ReplaceOptions;
}
export interface ReplaceAllSearchCommand {
  type: "REPLACE_ALL_SEARCH";
  replaceWith: string;
  replaceOptions: ReplaceOptions;
}

export interface SortCommand {
  type: "SORT_CELLS";
  sheetId: UID;
  col: number;
  row: number;
  zone: Zone;
  sortDirection: SortDirection;
}

export type SortDirection = "ascending" | "descending";

export interface ResizeViewportCommand {
  type: "RESIZE_VIEWPORT";
  width: number;
  height: number;
}

export interface SetViewportOffsetCommand {
  type: "SET_VIEWPORT_OFFSET";
  offsetX: number;
  offsetY: number;
}

/**
 * Shift the viewport down by the viewport height
 */
export interface MoveViewportDownCommand {
  type: "SHIFT_VIEWPORT_DOWN";
}

/**
 * Shift the viewport up by the viewport height
 */
export interface MoveViewportUpCommand {
  type: "SHIFT_VIEWPORT_UP";
}

/**
 * Sum data according to the selected zone(s) in the appropriated
 * cells.
 */
export interface SumSelectionCommand {
  type: "SUM_SELECTION";
}

export interface DeleteCellCommand {
  type: "DELETE_CELL";
  shiftDimension: Dimension;
  zone: Zone;
}

export interface InsertCellCommand {
  type: "INSERT_CELL";
  shiftDimension: Dimension;
  zone: Zone;
}

export interface PasteCFCommand {
  type: "PASTE_CONDITIONAL_FORMAT";
  origin: CellPosition;
  target: CellPosition;
  operation: "CUT" | "COPY";
}

export interface EvaluateAllSheetsCommand {
  type: "EVALUATE_ALL_SHEETS";
}
//#endregion

export interface ActivateNextSheetCommand {
  type: "ACTIVATE_NEXT_SHEET";
}

export interface ActivatePreviousSheetCommand {
  type: "ACTIVATE_PREVIOUS_SHEET";
}

export type CoreCommand =
  // /** History */
  // | SelectiveUndoCommand
  // | SelectiveRedoCommand

  /** CELLS */
  | UpdateCellCommand
  | UpdateCellPositionCommand
  | ClearCellCommand
  | DeleteContentCommand
  | SetDecimalCommand

  /** GRID SHAPE */
  | AddColumnsRowsCommand
  | RemoveColumnsRowsCommand
  | ResizeColumnsRowsCommand
  | HideColumnsRowsCommand
  | UnhideColumnsRowsCommand
  | SetGridLinesVisibilityCommand

  /** MERGE */
  | AddMergeCommand
  | RemoveMergeCommand

  /** SHEETS MANIPULATION */
  | CreateSheetCommand
  | DeleteSheetCommand
  | DuplicateSheetCommand
  | MoveSheetCommand
  | RenameSheetCommand
  | HideSheetCommand
  | ShowSheetCommand

  /** RANGES MANIPULATION */
  | MoveRangeCommand

  /** CONDITIONAL FORMAT */
  | AddConditionalFormatCommand
  | RemoveConditionalFormatCommand
  | MoveConditionalFormatCommand

  /** FIGURES */
  | CreateFigureCommand
  | DeleteFigureCommand
  | UpdateFigureCommand

  /** FORMATTING */
  | SetFormattingCommand
  | ClearFormattingCommand
  | SetBorderCommand

  /** CHART */
  | CreateChartCommand
  | UpdateChartCommand;

export type LocalCommand =
  | RequestUndoCommand
  | RequestRedoCommand
  | UndoCommand
  | RedoCommand
  | NewInputCommand
  | RemoveInputCommand
  | UnfocusInputCommand
  | FocusInputCommand
  | AddEmptyRangeCommand
  | RemoveRangeCommand
  | ChangeRangeCommand
  | CopyCommand
  | CutCommand
  | PasteCommand
  | AutoFillCellCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
  | PasteCFCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
  | MoveColumnsRowsCommand
  | ActivateSheetCommand
  | PrepareExpansionCommand
  | StopSelectionCommand
  | EvaluateCellsCommand
  | ChangeHighlightCommand
  | StartChangeHighlightCommand
  | SetColorCommand
  | StopComposerSelectionCommand
  | StartEditionCommand
  | StopEditionCommand
  | SetCurrentContentCommand
  | ChangeComposerSelectionCommand
  | ReplaceComposerSelectionCommand
  | CycleEditionReferencesCommand
  | StartCommand
  | AutofillCommand
  | AutofillSelectCommand
  | ShowFormulaCommand
  | AutofillAutoCommand
  | SelectFigureCommand
  | UpdateSearchCommand
  | RefreshSearchCommand
  | ClearSearchCommand
  | SelectSearchPreviousCommand
  | SelectSearchNextCommand
  | ReplaceSearchCommand
  | ReplaceAllSearchCommand
  | SortCommand
  | ResizeViewportCommand
  | RefreshChartCommand
  | SumSelectionCommand
  | DeleteCellCommand
  | InsertCellCommand
  | SetViewportOffsetCommand
  | MoveViewportDownCommand
  | MoveViewportUpCommand
  | EvaluateAllSheetsCommand
  | ActivateNextSheetCommand
  | ActivatePreviousSheetCommand;

export type Command = CoreCommand | LocalCommand;

/**
 * Holds the result of a command dispatch.
 * The command may have been successfully dispatched or cancelled
 * for one or more reasons.
 */
export class DispatchResult {
  public readonly reasons: CancelledReason[];

  constructor(results: CommandResult | CommandResult[] = []) {
    if (!Array.isArray(results)) {
      results = [results];
    }
    results = [...new Set(results)];
    this.reasons = results.filter(
      (result): result is CancelledReason => result !== CommandResult.Success
    );
  }

  /**
   * Static helper which returns a successful DispatchResult
   */
  static get Success() {
    return new DispatchResult();
  }

  get isSuccessful(): boolean {
    return this.reasons.length === 0;
  }

  /**
   * Check if the dispatch has been cancelled because of
   * the given reason.
   */
  isCancelledBecause(reason: CancelledReason): boolean {
    return this.reasons.includes(reason);
  }
}

export type CancelledReason = Exclude<CommandResult, CommandResult.Success>;

export const enum CommandResult {
  Success,
  CancelledForUnknownReason,
  WillRemoveExistingMerge,
  MergeIsDestructive,
  CellIsMerged,
  EmptyUndoStack,
  EmptyRedoStack,
  NotEnoughElements,
  NotEnoughSheets,
  MissingSheetName,
  DuplicatedSheetName,
  ForbiddenCharactersInSheetName,
  WrongSheetMove,
  WrongSheetPosition,
  InvalidAnchorZone,
  SelectionOutOfBound,
  TargetOutOfSheet,
  WrongCutSelection,
  WrongPasteSelection,
  WrongPasteOption,
  EmptyClipboard,
  EmptyRange,
  InvalidRange,
  InvalidZones,
  InvalidSheetId,
  InputAlreadyFocused,
  MaximumRangesReached,
  InvalidChartDefinition,
  EmptyDataSet,
  InvalidDataSet,
  EmptyScorecardKeyValue,
  InvalidLabelRange,
  InvalidScorecardKeyValue,
  InvalidScorecardBaseline,
  InvalidAutofillSelection,
  WrongComposerSelection,
  MinBiggerThanMax,
  LowerBiggerThanUpper,
  MidBiggerThanMax,
  MinBiggerThanMid,
  FirstArgMissing,
  SecondArgMissing,
  MinNaN,
  MidNaN,
  MaxNaN,
  ValueUpperInflectionNaN,
  ValueLowerInflectionNaN,
  MinInvalidFormula,
  MidInvalidFormula,
  MaxInvalidFormula,
  ValueUpperInvalidFormula,
  ValueLowerInvalidFormula,
  InvalidSortZone,
  WaitingSessionConfirmation,
  MergeOverlap,
  TooManyHiddenElements,
  Readonly,
  InvalidOffset,
  InvalidViewportSize,
  FigureDoesNotExist,
  InvalidConditionalFormatId,
}

export interface CommandHandler<T> {
  allowDispatch(command: T): CommandResult | CommandResult[];
  beforeHandle(command: T): void;
  handle(command: T): void;
  finalize(): void;
}

export interface CommandDispatcher {
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: {} extends Omit<C, "type"> ? T : never
  ): DispatchResult;
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: T,
    r: Omit<C, "type">
  ): DispatchResult;
}

export interface CoreCommandDispatcher {
  dispatch<T extends CoreCommandTypes, C extends Extract<CoreCommand, { type: T }>>(
    type: {} extends Omit<C, "type"> ? T : never
  ): DispatchResult;
  dispatch<T extends CoreCommandTypes, C extends Extract<CoreCommand, { type: T }>>(
    type: T,
    r: Omit<C, "type">
  ): DispatchResult;
}

export type CommandTypes = Command["type"];
export type CoreCommandTypes = CoreCommand["type"];
