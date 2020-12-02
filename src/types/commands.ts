import { Zone, Style, BorderCommand, ConditionalFormat, CreateChartDefinition } from "./index";
import { Border, Cell, UID } from "./misc";
import { Figure } from "./workbook_data";
import { ComposerSelection } from "../plugins/ui/edition";
import { SearchOptions, ReplaceOptions } from "../plugins/ui/find_and_replace";

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

export interface BaseCommand {
  interactive?: boolean;
}

// Primitive Commands
// ------------------------------------------------
export interface UpdateCellCommand extends BaseCommand {
  type: "UPDATE_CELL";
  sheetId: UID;
  col: number;
  row: number;
  content?: string;
  style?: Style;
  format?: string;
}

export interface UpdateCellPositionCommand extends BaseCommand {
  type: "UPDATE_CELL_POSITION";
  sheetId: UID;
  col: number;
  row: number;
  cell?: Cell;
  cellId: UID;
}

export interface ResizeColumnsCommand extends BaseCommand {
  type: "RESIZE_COLUMNS";
  sheetId: UID;
  cols: number[];
  size: number;
}

export interface ResizeRowsCommand extends BaseCommand {
  type: "RESIZE_ROWS";
  sheetId: UID;
  rows: number[];
  size: number;
}

/**
 * Todo: add a string "id" field, and change the code to use internally a uuid.
 */
export interface CreateSheetCommand extends BaseCommand {
  type: "CREATE_SHEET";
  sheetId: UID;
  position: number;
  name?: string;
  cols?: number;
  rows?: number;
  activate?: boolean;
}

export interface MoveSheetCommand extends BaseCommand {
  type: "MOVE_SHEET";
  sheetId: UID;
  direction: "left" | "right";
}

export interface RenameSheetCommand extends BaseCommand {
  type: "RENAME_SHEET";
  sheetId: UID;
  name?: string;
}

export interface DuplicateSheetCommand extends BaseCommand {
  type: "DUPLICATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
  name: string;
}

export interface DeleteSheetCommand extends BaseCommand {
  type: "DELETE_SHEET";
  sheetId: UID;
}

export interface DeleteSheetConfirmationCommand extends BaseCommand {
  type: "DELETE_SHEET_CONFIRMATION";
  sheetId: UID;
}

export interface AddMergeCommand extends BaseCommand {
  type: "ADD_MERGE";
  sheetId: UID;
  zone: Zone;
  force?: boolean;
}

export interface RemoveMergeCommand extends BaseCommand {
  type: "REMOVE_MERGE";
  sheetId: UID;
  zone: Zone;
}

export interface AddFormattingCommand extends BaseCommand {
  type: "SET_FORMATTING";
  sheetId: UID;
  target: Zone[];
  style?: Style;
  border?: BorderCommand;
}

export interface SetBorderCommand extends BaseCommand {
  type: "SET_BORDER";
  sheetId: UID;
  col: number;
  row: number;
  border: Border | undefined;
}

export interface ClearFormattingCommand extends BaseCommand {
  type: "CLEAR_FORMATTING";
  sheetId: UID;
  target: Zone[];
}

export interface SetFormatterCommand extends BaseCommand {
  type: "SET_FORMATTER";
  sheetId: UID;
  target: Zone[];
  formatter: string;
}

export interface SetDecimalCommand extends BaseCommand {
  type: "SET_DECIMAL";
  sheetId: UID;
  target: Zone[];
  step: number;
}

/**
 * todo: add sheet argument...
 * todo: use id instead of a list. this is not safe to serialize and send to
 * another user
 */
export interface AddConditionalFormatCommand extends BaseCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
  sheetId: UID;
}

export interface RemoveConditionalFormatCommand extends BaseCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
  sheetId: UID;
}

export interface RemoveColumnsCommand extends BaseCommand {
  type: "REMOVE_COLUMNS";
  columns: number[];
  sheetId: UID;
}

export interface RemoveRowsCommand extends BaseCommand {
  type: "REMOVE_ROWS";
  rows: number[];
  sheetId: UID;
}

export interface AddColumnsCommand extends BaseCommand {
  type: "ADD_COLUMNS";
  column: number;
  sheetId: UID;
  quantity: number;
  position: "before" | "after";
}

export interface AddRowsCommand extends BaseCommand {
  type: "ADD_ROWS";
  row: number;
  sheetId: UID;
  quantity: number;
  position: "before" | "after";
}

// Local Commands
// ------------------------------------------------
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
  style?: Style;
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
}

export interface RedoCommand extends BaseCommand {
  type: "REDO";
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

export interface CreateFigureCommand extends BaseCommand {
  type: "CREATE_FIGURE";
  figure: Figure<any>;
  sheetId: UID;
}

export interface SelectFigureCommand extends BaseCommand {
  type: "SELECT_FIGURE";
  id: string;
}

export interface UpdateFigureCommand extends BaseCommand, Partial<Figure<any>> {
  type: "UPDATE_FIGURE";
  id: string;
}

export interface DeleteFigureCommand extends BaseCommand {
  type: "DELETE_FIGURE";
  id: string;
}

export interface CreateChartCommand extends BaseCommand {
  type: "CREATE_CHART";
  id: string;
  sheetId: string;
  definition: CreateChartDefinition;
}

export interface UpdateChartCommand extends BaseCommand {
  type: "UPDATE_CHART";
  id: string;
  definition: CreateChartDefinition;
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

export type Command =
  | NewInputCommand
  | RemoveInputCommand
  | FocusInputCommand
  | AddEmptyRangeCommand
  | RemoveRangeCommand
  | ChangeRangeCommand
  | UpdateCellCommand
  | CopyCommand
  | CutCommand
  | PasteCommand
  | PasteCellCommand
  | AutoFillCellCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
  | ResizeRowsCommand
  | ResizeColumnsCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
  | MovePositionCommand
  | CreateSheetCommand
  | MoveSheetCommand
  | RenameSheetCommand
  | DuplicateSheetCommand
  | DeleteSheetCommand
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
  | DeleteContentCommand
  | EvaluateCellsCommand
  | AddConditionalFormatCommand
  | RemoveConditionalFormatCommand
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
  | AddMergeCommand
  | RemoveMergeCommand
  | SetCurrentContentCommand
  | ChangeComposerSelectionCommand
  | ReplaceComposerSelectionCommand
  | SetBorderCommand
  | AddFormattingCommand
  | ClearFormattingCommand
  | SetFormatterCommand
  | SetDecimalCommand
  | ClearCellCommand
  | UndoCommand
  | RedoCommand
  | StartCommand
  | RemoveRowsCommand
  | RemoveColumnsCommand
  | AddRowsCommand
  | CreateChartCommand
  | UpdateChartCommand
  | AddColumnsCommand
  | AutofillCommand
  | AutofillSelectCommand
  | ShowFormulaCommand
  | AutofillAutoCommand
  | CreateFigureCommand
  | SelectFigureCommand
  | UpdateFigureCommand
  | DeleteFigureCommand
  | UpdateCellPositionCommand
  | UpdateSearchCommand
  | RefreshSearchCommand
  | ClearSearchCommand
  | SelectSearchPreviousCommand
  | SelectSearchNextCommand
  | ReplaceSearchCommand
  | ReplaceAllSearchCommand;

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
  InvalidAutofillSelection,
  WrongComposerSelection,
}

export type CommandResult = CommandSuccess | CommandCancelled;

export interface CommandHandler {
  allowDispatch(command: Command): CommandResult;
  beforeHandle(command: Command): void;
  handle(command: Command): void;
  finalize(command: Command): void;
}

export interface CommandDispatcher {
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: {} extends Omit<C, "type"> ? T : never
  ): CommandResult;
  dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
    type: T,
    r: Omit<C, "type">
  ): CommandResult;
}

export type CommandTypes = Command["type"];
