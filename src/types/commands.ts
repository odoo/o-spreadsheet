import { ComposerSelection } from "../plugins/ui/edition";
import { ReplaceOptions, SearchOptions } from "../plugins/ui/find_and_replace";
import { Cell } from "./cells";
import {
  BorderCommand,
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  ConditionalFormat,
  Figure,
  Increment,
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
export interface BaseCommand {
  interactive?: boolean;
}

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

  "START_SELECTION",
  "SET_SELECTION",
  "ALTER_SELECTION",
  "START_SELECTION_EXPANSION",
  "PREPARE_SELECTION_EXPANSION",
  "STOP_SELECTION",

  "RESIZE_VIEWPORT",
  "SET_VIEWPORT_OFFSET",

  "SELECT_ALL",
  "SELECT_CELL",
  "SELECT_COLUMN",
  "SELECT_ROW",

  "MOVE_POSITION",

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

  /** CONDITIONAL FORMAT */
  "ADD_CONDITIONAL_FORMAT",
  "REMOVE_CONDITIONAL_FORMAT",

  /** FIGURES */
  "CREATE_FIGURE",
  "DELETE_FIGURE",
  "UPDATE_FIGURE",

  /** FORMATTING */
  "SET_FORMATTING",
  "CLEAR_FORMATTING",
  "SET_BORDER",

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
export interface UpdateCellCommand
  extends BaseCommand,
    SheetDependentCommand,
    PositionDependentCommand {
  type: "UPDATE_CELL";
  content?: string;
  style?: Style | null;
  format?: string;
}

export interface UpdateCellPositionCommand
  extends BaseCommand,
    SheetDependentCommand,
    PositionDependentCommand {
  type: "UPDATE_CELL_POSITION";
  cell?: Cell;
  cellId: UID;
}

//------------------------------------------------------------------------------
// Grid Shape
//------------------------------------------------------------------------------

export interface AddColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "ADD_COLUMNS_ROWS";
  base: number;
  quantity: number;
  position: "before" | "after";
}

export interface RemoveColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "REMOVE_COLUMNS_ROWS";
  elements: number[];
}

export interface MoveColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "MOVE_COLUMNS_ROWS";
  base: number;
  elements: number[];
}

export interface ResizeColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "RESIZE_COLUMNS_ROWS";
  elements: number[];
  size: number;
}

export interface HideColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "HIDE_COLUMNS_ROWS";
  elements: number[];
}
export interface UnhideColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "UNHIDE_COLUMNS_ROWS";
  elements: number[];
}
export interface SetGridLinesVisibilityCommand extends BaseCommand, SheetDependentCommand {
  type: "SET_GRID_LINES_VISIBILITY";
  areGridLinesVisible: boolean;
}

//------------------------------------------------------------------------------
// Merge
//------------------------------------------------------------------------------

export interface AddMergeCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "ADD_MERGE";
  force?: boolean;
}

export interface RemoveMergeCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "REMOVE_MERGE";
}

//------------------------------------------------------------------------------
// Sheets Manipulation
//------------------------------------------------------------------------------

export interface CreateSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "CREATE_SHEET";
  position: number;
  name?: string; // should be required in master
  cols?: number;
  rows?: number;
}

export interface DeleteSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "DELETE_SHEET";
}

export interface DuplicateSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "DUPLICATE_SHEET";
  sheetIdTo: UID;
}

export interface MoveSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "MOVE_SHEET";
  direction: "left" | "right";
}

export interface RenameSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "RENAME_SHEET";
  name?: string;
}

//------------------------------------------------------------------------------
// Conditional Format
//------------------------------------------------------------------------------

/**
 * todo: use id instead of a list. this is not safe to serialize and send to
 * another user
 */
export interface AddConditionalFormatCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: Omit<ConditionalFormat, "ranges">;
}

export interface RemoveConditionalFormatCommand extends BaseCommand, SheetDependentCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
}

//------------------------------------------------------------------------------
// Figures
//------------------------------------------------------------------------------

export interface CreateFigureCommand extends BaseCommand, SheetDependentCommand {
  type: "CREATE_FIGURE";
  figure: Figure;
}

export interface UpdateFigureCommand extends BaseCommand, Partial<Figure>, SheetDependentCommand {
  type: "UPDATE_FIGURE";
  id: UID;
}

export interface DeleteFigureCommand extends BaseCommand, SheetDependentCommand {
  type: "DELETE_FIGURE";
  id: UID;
}

//------------------------------------------------------------------------------
// Chart
//------------------------------------------------------------------------------

export interface CreateChartCommand extends BaseCommand, SheetDependentCommand {
  type: "CREATE_CHART";
  id: UID;
  position?: { x: number; y: number };
  definition: ChartUIDefinition;
}

export interface UpdateChartCommand extends BaseCommand, SheetDependentCommand {
  type: "UPDATE_CHART";
  id: UID;
  definition: ChartUIDefinitionUpdate;
}

export interface RefreshChartCommand extends BaseCommand {
  type: "REFRESH_CHART";
  id: UID;
}

export interface SetFormattingCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "SET_FORMATTING";
  style?: Style;
  border?: BorderCommand;
  format?: string;
}

export interface SetBorderCommand
  extends BaseCommand,
    SheetDependentCommand,
    PositionDependentCommand {
  type: "SET_BORDER";
  border: Border | undefined;
}

export interface ClearFormattingCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "CLEAR_FORMATTING";
}

export interface SetDecimalCommand
  extends BaseCommand,
    SheetDependentCommand,
    TargetDependentCommand {
  type: "SET_DECIMAL";
  step: number;
}
//#endregion

//#region Local Commands
// ------------------------------------------------
export interface DeleteSheetConfirmationCommand extends BaseCommand {
  type: "DELETE_SHEET_CONFIRMATION";
  sheetId: UID;
}

export interface CopyCommand extends BaseCommand {
  type: "COPY";
  target: Zone[];
}

export interface CutCommand extends BaseCommand {
  type: "CUT";
  target: Zone[];
}

export interface PasteCommand extends BaseCommand {
  type: "PASTE";
  target: Zone[];
  pasteOption?: ClipboardOptions;
  force?: boolean;
}

export interface CutAndPasteCommand extends BaseCommand {
  type: "CUT_AND_PASTE";
  source: Zone;
  target: Zone;
}

export interface AutoFillCellCommand extends BaseCommand {
  type: "AUTOFILL_CELL";
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  content?: string;
  style?: Style | null;
  border?: Border;
  format?: string;
}

export interface ActivatePaintFormatCommand extends BaseCommand {
  type: "ACTIVATE_PAINT_FORMAT";
  target: Zone[];
}

export interface PasteFromOSClipboardCommand extends BaseCommand {
  type: "PASTE_FROM_OS_CLIPBOARD";
  target: Zone[];
  text: string;
}

export interface AutoresizeColumnsCommand extends BaseCommand {
  type: "AUTORESIZE_COLUMNS";
  sheetId: UID;
  cols: number[];
}

export interface AutoresizeRowsCommand extends BaseCommand {
  type: "AUTORESIZE_ROWS";
  sheetId: UID;
  rows: number[];
}

export interface MovePositionCommand extends BaseCommand {
  type: "MOVE_POSITION";
  deltaX: Increment;
  deltaY: Increment;
}

export interface ActivateSheetCommand extends BaseCommand {
  type: "ACTIVATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
}

export interface SelectCellCommand extends BaseCommand {
  type: "SELECT_CELL";
  col: number;
  row: number;
}

export interface SetSelectionCommand extends BaseCommand {
  type: "SET_SELECTION";
  anchor: [number, number];
  zones: Zone[];
  anchorZone: Zone;
  strict?: boolean;
}

/**
 * Set the selection mode to `selecting`.
 * The user is currently selecting some cells.
 */
export interface StartSelectionCommand extends BaseCommand {
  type: "START_SELECTION";
}

/**
 * Set the selection mode to `readyToExpand`.
 * The user is ready to expand the selected zones with a new
 * selection (i.e. add an other zone the to currently selected zones).
 * In other words, the next selection will be added to the
 * current selection if this mode is active.
 */
export interface PrepareExpansionCommand extends BaseCommand {
  type: "PREPARE_SELECTION_EXPANSION";
}

/**
 * Set the selection mode to `expanding`.
 * This mode means that the user is currently selecting
 * a new zone which will be added to the current selection.
 */
export interface StartExpansionCommand extends BaseCommand {
  type: "START_SELECTION_EXPANSION";
}

/**
 * Set the selection mode to `idle`.
 */
export interface StopSelectionCommand extends BaseCommand {
  type: "STOP_SELECTION";
}

/**
 * Set a color to be used for the next selection to highlight.
 * The color is only used when selection highlight is enabled.
 */
export interface SetColorCommand extends BaseCommand {
  type: "SET_HIGHLIGHT_COLOR";
  color: string;
}

export interface SelectColumnCommand extends BaseCommand {
  type: "SELECT_COLUMN";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectRowCommand extends BaseCommand {
  type: "SELECT_ROW";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectAllCommand extends BaseCommand {
  type: "SELECT_ALL";
}

export interface AlterSelectionCommand extends BaseCommand {
  type: "ALTER_SELECTION";
  delta?: [Increment, Increment];
  cell?: [number, number];
}

export interface EvaluateCellsCommand extends BaseCommand {
  type: "EVALUATE_CELLS";
  sheetId: UID;
  onlyWaiting?: boolean;
}

export interface StartChangeHighlightCommand extends BaseCommand {
  type: "START_CHANGE_HIGHLIGHT";
  zone: Zone;
}

export interface ChangeHighlightCommand extends BaseCommand {
  type: "CHANGE_HIGHLIGHT";
  zone: Zone;
}

export interface StopComposerSelectionCommand extends BaseCommand {
  type: "STOP_COMPOSER_RANGE_SELECTION";
}

export interface StartEditionCommand extends BaseCommand {
  type: "START_EDITION";
  text?: string;
  selection?: ComposerSelection;
}

export interface StopEditionCommand extends BaseCommand {
  type: "STOP_EDITION";
  cancel?: boolean;
}

export interface SetCurrentContentCommand extends BaseCommand {
  type: "SET_CURRENT_CONTENT";
  content: string;
  selection?: ComposerSelection;
}

export interface ChangeComposerSelectionCommand extends BaseCommand {
  type: "CHANGE_COMPOSER_CURSOR_SELECTION";
  start: number;
  end: number;
}

export interface ReplaceComposerSelectionCommand extends BaseCommand {
  type: "REPLACE_COMPOSER_CURSOR_SELECTION";
  text: string;
}

export interface ShowFormulaCommand extends BaseCommand {
  type: "SET_FORMULA_VISIBILITY";
  show: boolean;
}

export interface DeleteContentCommand extends BaseCommand {
  type: "DELETE_CONTENT";
  sheetId: UID;
  target: Zone[];
}

export interface ClearCellCommand extends BaseCommand {
  type: "CLEAR_CELL";
  sheetId: UID;
  col: number;
  row: number;
}

export interface UndoCommand extends BaseCommand {
  type: "UNDO";
  commands: readonly CoreCommand[];
}

export interface RedoCommand extends BaseCommand {
  type: "REDO";
  commands: readonly CoreCommand[];
}

export interface RequestUndoCommand extends BaseCommand {
  type: "REQUEST_UNDO";
}

export interface RequestRedoCommand extends BaseCommand {
  type: "REQUEST_REDO";
}

export interface StartCommand extends BaseCommand {
  type: "START";
}

export interface AutofillCommand extends BaseCommand {
  type: "AUTOFILL";
}

export interface AutofillSelectCommand extends BaseCommand {
  type: "AUTOFILL_SELECT";
  col: number;
  row: number;
}

export interface AutofillAutoCommand extends BaseCommand {
  type: "AUTOFILL_AUTO";
}

/**
 * Create a new state for a SelectionInput component
 */
export interface NewInputCommand extends BaseCommand {
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
export interface RemoveInputCommand extends BaseCommand {
  type: "DISABLE_SELECTION_INPUT";
  /** SelectionComponent id */
  id: string;
}

export interface UnfocusInputCommand extends BaseCommand {
  type: "UNFOCUS_SELECTION_INPUT";
}

/**
 * Set the focus on a given range of a SelectionComponent state.
 */
export interface FocusInputCommand extends BaseCommand {
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
export interface AddEmptyRangeCommand extends BaseCommand {
  type: "ADD_EMPTY_RANGE";
  /** SelectionComponent id */
  id: string;
}

/**
 * Remove a given range in a SelectionComponent state
 */
export interface RemoveRangeCommand extends BaseCommand {
  type: "REMOVE_RANGE";
  /** SelectionComponent id */
  id: string;
  /** The range to be removed */
  rangeId: string;
}

/**
 * Set a new value for a given range of a SelectionComponent state.
 */
export interface ChangeRangeCommand extends BaseCommand {
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

export interface SelectFigureCommand extends BaseCommand {
  type: "SELECT_FIGURE";
  id: UID;
}

export interface UpdateSearchCommand extends BaseCommand {
  type: "UPDATE_SEARCH";
  toSearch: string;
  searchOptions: SearchOptions;
}

export interface ClearSearchCommand extends BaseCommand {
  type: "CLEAR_SEARCH";
}
export interface RefreshSearchCommand extends BaseCommand {
  type: "REFRESH_SEARCH";
}

export interface SelectSearchPreviousCommand extends BaseCommand {
  type: "SELECT_SEARCH_PREVIOUS_MATCH";
}

export interface SelectSearchNextCommand extends BaseCommand {
  type: "SELECT_SEARCH_NEXT_MATCH";
}

export interface ReplaceSearchCommand extends BaseCommand {
  type: "REPLACE_SEARCH";
  replaceWith: string;
  replaceOptions: ReplaceOptions;
}
export interface ReplaceAllSearchCommand extends BaseCommand {
  type: "REPLACE_ALL_SEARCH";
  replaceWith: string;
  replaceOptions: ReplaceOptions;
}

export interface SortCommand extends BaseCommand {
  type: "SORT_CELLS";
  sheetId: UID;
  anchor: [number, number];
  zone: Zone;
  sortDirection: SortDirection;
}

export type SortDirection = "ascending" | "descending";

export interface ResizeViewportCommand extends BaseCommand {
  type: "RESIZE_VIEWPORT";
  width: number;
  height: number;
}

export interface SetViewportOffsetCommand extends BaseCommand {
  type: "SET_VIEWPORT_OFFSET";
  offsetX: number;
  offsetY: number;
}

/**
 * Sum data according to the selected zone(s) in the appropriated
 * cells.
 */
export interface SumSelectionCommand extends BaseCommand {
  type: "SUM_SELECTION";
}

export interface DeleteCellCommand extends BaseCommand {
  type: "DELETE_CELL";
  shiftDimension: Dimension;
  zone: Zone;
}

export interface InsertCellCommand extends BaseCommand {
  type: "INSERT_CELL";
  shiftDimension: Dimension;
  zone: Zone;
}

export interface PasteCFCommand extends BaseCommand {
  type: "PASTE_CONDITIONAL_FORMAT";
  origin: CellPosition;
  target: CellPosition;
  operation: "CUT" | "COPY";
}

export interface EvaluateAllSheetsCommand extends BaseCommand {
  type: "EVALUATE_ALL_SHEETS";
}
//#endregion

export interface ActivateNextSheetCommand extends BaseCommand {
  type: "ACTIVATE_NEXT_SHEET";
}

export interface ActivatePreviousSheetCommand extends BaseCommand {
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

  /** CONDITIONAL FORMAT */
  | AddConditionalFormatCommand
  | RemoveConditionalFormatCommand

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
  | CutAndPasteCommand
  | AutoFillCellCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
  | PasteCFCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
  | MoveColumnsRowsCommand
  | MovePositionCommand
  | DeleteSheetConfirmationCommand
  | ActivateSheetCommand
  | StartSelectionCommand
  | StartExpansionCommand
  | PrepareExpansionCommand
  | StopSelectionCommand
  | SelectCellCommand
  | SetSelectionCommand
  | SelectColumnCommand
  | SelectRowCommand
  | SelectAllCommand
  | AlterSelectionCommand
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
  | SetDecimalCommand
  | ResizeViewportCommand
  | RefreshChartCommand
  | SumSelectionCommand
  | DeleteCellCommand
  | InsertCellCommand
  | SetViewportOffsetCommand
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
    return SUCCESS;
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

const SUCCESS = new DispatchResult();

export type CancelledReason = Exclude<CommandResult, CommandResult.Success>;

export const enum CommandResult {
  Success,
  CancelledForUnknownReason,
  WillRemoveExistingMerge,
  MergeIsDestructive,
  CellIsMerged,
  InvalidTarget,
  EmptyUndoStack,
  EmptyRedoStack,
  NotEnoughElements,
  NotEnoughSheets,
  MissingSheetName,
  DuplicatedSheetName,
  DuplicatedSheetId,
  ForbiddenCharactersInSheetName,
  WrongSheetMove,
  WrongSheetPosition,
  InvalidAnchorZone,
  SelectionOutOfBound,
  TargetOutOfSheet,
  WrongPasteSelection,
  EmptyClipboard,
  EmptyRange,
  InvalidRange,
  InvalidSheetId,
  InputAlreadyFocused,
  MaximumRangesReached,
  InvalidChartDefinition,
  EmptyDataSet,
  InvalidDataSet,
  InvalidLabelRange,
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
  DuplicatedFigureId,
  DuplicatedChartId,
  ChartDoesNotExist,
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
