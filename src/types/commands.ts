import { ComposerSelection } from "../plugins/ui/edition";
import { ReplaceOptions, SearchOptions } from "../plugins/ui/find_and_replace";
import {
  BorderCommand,
  ConditionalFormat,
  CreateChartDefinition,
  Figure,
  Style,
  Zone,
} from "./index";
import { Border, Cell, Dimension, UID } from "./misc";

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
  isPrimaryDispatch?: boolean;
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
  "SET_DECIMAL",

  /** CHART */
  "CREATE_CHART",
  "UPDATE_CHART",
]);

export function isCoreCommand(cmd: Command): cmd is CoreCommand {
  return coreTypes.has(cmd.type as any);
}

// Core Commands
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

export interface ResizeColumnsRowsCommand
  extends BaseCommand,
    SheetDependentCommand,
    GridDependentCommand {
  type: "RESIZE_COLUMNS_ROWS";
  elements: number[];
  size: number;
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
  name?: string;
  cols?: number;
  rows?: number;
}

export interface DeleteSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "DELETE_SHEET";
}

export interface DuplicateSheetCommand extends BaseCommand, SheetDependentCommand {
  type: "DUPLICATE_SHEET";
  sheetIdTo: UID;
  name: string;
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
export interface AddConditionalFormatCommand extends BaseCommand, SheetDependentCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
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
  definition: CreateChartDefinition;
}

export interface UpdateChartCommand extends BaseCommand, SheetDependentCommand {
  type: "UPDATE_CHART";
  id: UID;
  definition: CreateChartDefinition;
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

// Local Commands
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
  onlyValue?: boolean;
  onlyFormat?: boolean;
  force?: boolean;
}

export interface PasteCellCommand extends BaseCommand {
  type: "PASTE_CELL";
  origin: Cell | null;
  originSheet: UID;
  originBorder: Border | null;
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  sheetId: UID;
  cut?: boolean;
  onlyValue: boolean;
  onlyFormat: boolean;
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
  deltaX: number;
  deltaY: number;
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
 * When selection highlight is enabled, every selection will
 * be highlighted. Each selected zone have a different color.
 */
export interface HighlightSelectionCommand extends BaseCommand {
  type: "HIGHLIGHT_SELECTION";
  enabled: boolean;
}

/**
 * Add some highlights as pending highlights.
 * When highlight selection is enabled, pending highlights
 * are removed at every new selection.
 */
export interface AddPendingHighlightCommand extends BaseCommand {
  type: "ADD_PENDING_HIGHLIGHTS";
  ranges: { [range: string]: string };
}

/**
 * Removes all pending highlights.
 */
export interface ResetPendingHighlightCommand extends BaseCommand {
  type: "RESET_PENDING_HIGHLIGHT";
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
  delta?: [number, number];
  cell?: [number, number];
}

export interface EvaluateCellsCommand extends BaseCommand {
  type: "EVALUATE_CELLS";
  onlyWaiting?: boolean;
}

export interface AddHighlightsCommand extends BaseCommand {
  type: "ADD_HIGHLIGHTS";
  ranges: { [range: string]: string };
}

/**
 * Remove the given highlights.
 */
export interface RemoveHighlightsCommand extends BaseCommand {
  type: "REMOVE_HIGHLIGHTS";
  /**
   * Ranges to remove. Keys are ranges in XC format and values
   * are the associated colors.
   * e.g. { B4: "#e2e2e2" }
   */
  ranges: { [range: string]: string };
}
export interface RemoveAllHighlightsCommand extends BaseCommand {
  type: "REMOVE_ALL_HIGHLIGHTS";
}

export interface StopComposerSelectionCommand extends BaseCommand {
  type: "STOP_COMPOSER_SELECTION";
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
  type: "CHANGE_COMPOSER_SELECTION";
  start: number;
  end: number;
}

export interface ReplaceComposerSelectionCommand extends BaseCommand {
  type: "REPLACE_COMPOSER_SELECTION";
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
  isLocal?: boolean;
}

export interface RedoCommand extends BaseCommand {
  type: "REDO";
  isLocal?: boolean;
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
   * Maximum number of ranges allowed
   */
  maximumRanges?: number;
}

/**
 * Delete an identified SelectionInput state.
 */
export interface RemoveInputCommand extends BaseCommand {
  type: "DISABLE_SELECTION_INPUT";
  /** SelectionComponent id */
  id: string;
}

/**
 * Set the focus on a given range of a SelectionComponent state.
 */
export interface FocusInputCommand extends BaseCommand {
  type: "FOCUS_RANGE";
  /** SelectionComponent id */
  id: string;
  /**
   * Range to focus. If `null` is given, removes the focus entirely.
   */
  rangeId: string | null;
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
  | UndoCommand
  | RedoCommand
  | NewInputCommand
  | RemoveInputCommand
  | FocusInputCommand
  | AddEmptyRangeCommand
  | RemoveRangeCommand
  | ChangeRangeCommand
  | CopyCommand
  | CutCommand
  | PasteCommand
  | PasteCellCommand
  | AutoFillCellCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
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
  | AddHighlightsCommand
  | RemoveHighlightsCommand
  | RemoveAllHighlightsCommand
  | HighlightSelectionCommand
  | AddPendingHighlightCommand
  | ResetPendingHighlightCommand
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
  | ResizeViewportCommand
  | SetViewportOffsetCommand;

export type Command = CoreCommand | LocalCommand;
export interface CommandSuccess {
  status: "SUCCESS";
}
export interface CommandCancelled {
  status: "CANCELLED";
  reason: CancelledReason;
}

export const enum CancelledReason {
  Unknown,
  WillRemoveExistingMerge,
  MergeIsDestructive,
  EmptyUndoStack,
  EmptyRedoStack,
  NotEnoughColumns,
  NotEnoughRows,
  NotEnoughSheets,
  WrongSheetName,
  WrongSheetMove,
  WrongSheetPosition,
  SelectionOutOfBound,
  WrongPasteSelection,
  EmptyClipboard,
  InvalidRange,
  InvalidSheetId,
  InputAlreadyFocused,
  MaximumRangesReached,
  InvalidChartDefinition,
  EmptyDataSet,
  EmptyLabelRange,
  InvalidDataSet,
  InvalidLabelRange,
  InvalidAutofillSelection,
  WrongComposerSelection,
  MinBiggerThanMax,
  MidBiggerThanMax,
  MinBiggerThanMid,
  InvalidNumberOfArgs,
  MinNaN,
  MidNaN,
  MaxNaN,
  MinAsyncFormulaNotSupported,
  MidAsyncFormulaNotSupported,
  MaxAsyncFormulaNotSupported,
  MinInvalidFormula,
  MidInvalidFormula,
  MaxInvalidFormula,
  InvalidSortZone,
  WaitingSessionConfirmation,
  MergeOverlap,
}

export type CommandResult = CommandSuccess | CommandCancelled;

export interface CommandHandler<T> {
  allowDispatch(command: T): CommandResult;
  beforeHandle(command: T): void;
  handle(command: T): void;
  finalize(): void;
}

export interface CommandDispatcher {
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: {} extends Omit<C, "type" | "isPrimaryDispatch"> ? T : never
  ): CommandResult;
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: T,
    r: Omit<C, "type" | "isPrimaryDispatch">
  ): CommandResult;
}

export interface CoreCommandDispatcher {
  dispatch<T extends CoreCommandTypes, C extends Extract<CoreCommand, { type: T }>>(
    type: {} extends Omit<C, "type" | "isPrimaryDispatch"> ? T : never
  ): CommandResult;
  dispatch<T extends CoreCommandTypes, C extends Extract<CoreCommand, { type: T }>>(
    type: T,
    r: Omit<C, "type" | "isPrimaryDispatch">
  ): CommandResult;
}

export type CommandTypes = Command["type"];
export type CoreCommandTypes = CoreCommand["type"];
