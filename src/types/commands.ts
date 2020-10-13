import { Zone, Style, BorderCommand, ConditionalFormat, CreateChartDefinition } from "./index";
import { Cell, UID } from "./misc";
import { Figure } from "./workbook_data";
import { ComposerSelection } from "../plugins/ui/edition";

// -----------------------------------------------------------------------------
// Grid commands
// -----------------------------------------------------------------------------

interface AbstractCommand {}

interface BaseCommand extends AbstractCommand {}

// interface UICommand extends AbstractCommand {}

export interface NetworkCommand {
  clientId: string;
  timestamp?: number;
  commands: Command[];
}

export interface UpdateCellCommand extends BaseCommand {
  type: "UPDATE_CELL";
  sheetId: UID;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

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

interface OLDBaseCommand {
  interactive?: boolean;
}

export interface MultiuserCommand extends OLDBaseCommand {
  type: "MULTIUSER";
  command: Command;
}

// Primitive Commands
// ------------------------------------------------
export interface UpdateCellCommand extends OLDBaseCommand {
  type: "UPDATE_CELL";
  sheetId: UID;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface ResizeColumnsCommand extends OLDBaseCommand {
  type: "RESIZE_COLUMNS";
  sheetId: UID;
  cols: number[];
  size: number;
}

export interface ResizeRowsCommand extends OLDBaseCommand {
  type: "RESIZE_ROWS";
  sheetId: UID;
  rows: number[];
  size: number;
}

/**
 * Todo: add a string "id" field, and change the code to use internally a uuid.
 */
export interface CreateSheetCommand extends OLDBaseCommand {
  type: "CREATE_SHEET";
  sheetId: UID;
  name?: string;
  cols?: number;
  rows?: number;
  activate?: boolean;
}

export interface MoveSheetCommand extends OLDBaseCommand {
  type: "MOVE_SHEET";
  sheetId: UID;
  direction: "left" | "right";
}

export interface RenameSheetCommand extends OLDBaseCommand {
  type: "RENAME_SHEET";
  sheetId: UID;
  name?: string;
}

export interface DuplicateSheetCommand extends OLDBaseCommand {
  type: "DUPLICATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
  name: string;
}

export interface DeleteSheetCommand extends OLDBaseCommand {
  type: "DELETE_SHEET";
  sheetId: UID;
}

export interface DeleteSheetConfirmationCommand extends OLDBaseCommand {
  type: "DELETE_SHEET_CONFIRMATION";
  sheetId: UID;
}

export interface AddMergeCommand extends OLDBaseCommand {
  type: "ADD_MERGE";
  sheetId: UID;
  zone: Zone;
  force?: boolean;
}

export interface RemoveMergeCommand extends OLDBaseCommand {
  type: "REMOVE_MERGE";
  sheetId: UID;
  zone: Zone;
}

export interface AddFormattingCommand extends OLDBaseCommand {
  type: "SET_FORMATTING";
  sheetId: UID;
  target: Zone[];
  style?: Style;
  border?: BorderCommand;
}

export interface ClearFormattingCommand extends OLDBaseCommand {
  type: "CLEAR_FORMATTING";
  sheetId: UID;
  target: Zone[];
}

export interface SetFormatterCommand extends OLDBaseCommand {
  type: "SET_FORMATTER";
  sheetId: UID;
  target: Zone[];
  formatter: string;
}

export interface SetDecimalCommand extends OLDBaseCommand {
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
export interface AddConditionalFormatCommand extends OLDBaseCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
  sheetId: UID;
}

export interface RemoveConditionalFormatCommand extends OLDBaseCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
  sheetId: UID;
}

export interface RemoveColumnsCommand extends OLDBaseCommand {
  type: "REMOVE_COLUMNS";
  columns: number[];
  sheetId: UID;
}

export interface RemoveRowsCommand extends OLDBaseCommand {
  type: "REMOVE_ROWS";
  rows: number[];
  sheetId: UID;
}

export interface AddColumnsCommand extends OLDBaseCommand {
  type: "ADD_COLUMNS";
  column: number;
  sheetId: UID;
  quantity: number;
  position: "before" | "after";
}

export interface AddRowsCommand extends OLDBaseCommand {
  type: "ADD_ROWS";
  row: number;
  sheetId: UID;
  quantity: number;
  position: "before" | "after";
}

// Local Commands
// ------------------------------------------------
export interface CopyCommand extends OLDBaseCommand {
  type: "COPY";
  target: Zone[];
}

export interface CutCommand extends OLDBaseCommand {
  type: "CUT";
  target: Zone[];
}

export interface PasteCommand extends OLDBaseCommand {
  type: "PASTE";
  target: Zone[];
  onlyValue?: boolean;
  onlyFormat?: boolean;
  force?: boolean;
}

export interface PasteCellCommand extends OLDBaseCommand {
  type: "PASTE_CELL";
  origin: Cell | null;
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  sheetId: UID;
  cut?: boolean;
  onlyValue: boolean;
  onlyFormat: boolean;
}

export interface AutoFillCellCommand extends OLDBaseCommand {
  type: "AUTOFILL_CELL";
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface ActivatePaintFormatCommand extends OLDBaseCommand {
  type: "ACTIVATE_PAINT_FORMAT";
  target: Zone[];
}

export interface PasteFromOSClipboardCommand extends OLDBaseCommand {
  type: "PASTE_FROM_OS_CLIPBOARD";
  target: Zone[];
  text: string;
}

export interface AutoresizeColumnsCommand extends OLDBaseCommand {
  type: "AUTORESIZE_COLUMNS";
  sheetId: UID;
  cols: number[];
}

export interface AutoresizeRowsCommand extends OLDBaseCommand {
  type: "AUTORESIZE_ROWS";
  sheetId: UID;
  rows: number[];
}

export interface MovePositionCommand extends OLDBaseCommand {
  type: "MOVE_POSITION";
  deltaX: number;
  deltaY: number;
}

export interface ActivateSheetCommand extends OLDBaseCommand {
  type: "ACTIVATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
}

export interface SelectCellCommand extends OLDBaseCommand {
  type: "SELECT_CELL";
  col: number;
  row: number;
}

export interface SetSelectionCommand extends OLDBaseCommand {
  type: "SET_SELECTION";
  anchor: [number, number];
  zones: Zone[];
  strict?: boolean;
}

/**
 * Set the selection mode to `selecting`.
 * The user is currently selecting some cells.
 */
export interface StartSelectionCommand extends OLDBaseCommand {
  type: "START_SELECTION";
}

/**
 * Set the selection mode to `readyToExpand`.
 * The user is ready to expand the selected zones with a new
 * selection (i.e. add an other zone the to currently selected zones).
 * In other words, the next selection will be added to the
 * current selection if this mode is active.
 */
export interface PrepareExpansionCommand extends OLDBaseCommand {
  type: "PREPARE_SELECTION_EXPANSION";
}

/**
 * Set the selection mode to `expanding`.
 * This mode means that the user is currently selecting
 * a new zone which will be added to the current selection.
 */
export interface StartExpansionCommand extends OLDBaseCommand {
  type: "START_SELECTION_EXPANSION";
}

/**
 * Set the selection mode to `idle`.
 */
export interface StopSelectionCommand extends OLDBaseCommand {
  type: "STOP_SELECTION";
}

/**
 * When selection highlight is enabled, every selection will
 * be highlighted. Each selected zone have a different color.
 */
export interface HighlightSelectionCommand extends OLDBaseCommand {
  type: "HIGHLIGHT_SELECTION";
  enabled: boolean;
}

/**
 * Add some highlights as pending highlights.
 * When highlight selection is enabled, pending highlights
 * are removed at every new selection.
 */
export interface AddPendingHighlightCommand extends OLDBaseCommand {
  type: "ADD_PENDING_HIGHLIGHTS";
  ranges: { [range: string]: string };
}

/**
 * Removes all pending highlights.
 */
export interface ResetPendingHighlightCommand extends OLDBaseCommand {
  type: "RESET_PENDING_HIGHLIGHT";
}

/**
 * Set a color to be used for the next selection to highlight.
 * The color is only used when selection highlight is enabled.
 */
export interface SetColorCommand extends OLDBaseCommand {
  type: "SET_HIGHLIGHT_COLOR";
  color: string;
}

export interface SelectColumnCommand extends OLDBaseCommand {
  type: "SELECT_COLUMN";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectRowCommand extends OLDBaseCommand {
  type: "SELECT_ROW";
  index: number;
  createRange?: boolean;
  updateRange?: boolean;
}

export interface SelectAllCommand extends OLDBaseCommand {
  type: "SELECT_ALL";
}

export interface AlterSelectionCommand extends OLDBaseCommand {
  type: "ALTER_SELECTION";
  delta?: [number, number];
  cell?: [number, number];
}

export interface EvaluateCellsCommand extends OLDBaseCommand {
  type: "EVALUATE_CELLS";
  onlyWaiting?: boolean;
}

export interface AddHighlightsCommand extends OLDBaseCommand {
  type: "ADD_HIGHLIGHTS";
  ranges: { [range: string]: string };
}

/**
 * Remove the given highlights.
 */
export interface RemoveHighlightsCommand extends OLDBaseCommand {
  type: "REMOVE_HIGHLIGHTS";
  /**
   * Ranges to remove. Keys are ranges in XC format and values
   * are the associated colors.
   * e.g. { B4: "#e2e2e2" }
   */
  ranges: { [range: string]: string };
}
export interface RemoveAllHighlightsCommand extends OLDBaseCommand {
  type: "REMOVE_ALL_HIGHLIGHTS";
}

export interface StartComposerSelectionCommand extends OLDBaseCommand {
  type: "START_COMPOSER_SELECTION";
}

export interface StopComposerSelectionCommand extends OLDBaseCommand {
  type: "STOP_COMPOSER_SELECTION";
}

export interface StartEditionCommand extends OLDBaseCommand {
  type: "START_EDITION";
  text?: string;
}

export interface StopEditionCommand extends OLDBaseCommand {
  type: "STOP_EDITION";
  cancel?: boolean;
}

export interface SetCurrentContentCommand extends OLDBaseCommand {
  type: "SET_CURRENT_CONTENT";
  content: string;
  selection?: ComposerSelection;
}

export interface ChangeComposerSelectionCommand extends OLDBaseCommand {
  type: "CHANGE_COMPOSER_SELECTION";
  start: number;
  end: number;
}

export interface ReplaceComposerSelectionCommand extends OLDBaseCommand {
  type: "REPLACE_COMPOSER_SELECTION";
  text: string;
}

export interface SetValueCommand extends OLDBaseCommand {
  type: "SET_VALUE";
  xc: string;
  text: string;
  sheetId?: UID;
}
export interface ShowFormulaCommand extends OLDBaseCommand {
  type: "SET_FORMULA_VISIBILITY";
  show: boolean;
}

export interface DeleteContentCommand extends OLDBaseCommand {
  type: "DELETE_CONTENT";
  sheetId: UID;
  target: Zone[];
}

export interface ClearCellCommand extends OLDBaseCommand {
  type: "CLEAR_CELL";
  sheetId: UID;
  col: number;
  row: number;
}

export interface UndoCommand extends OLDBaseCommand {
  type: "UNDO";
}

export interface RedoCommand extends OLDBaseCommand {
  type: "REDO";
}

export interface StartCommand extends OLDBaseCommand {
  type: "START";
}

export interface AutofillCommand extends OLDBaseCommand {
  type: "AUTOFILL";
}

export interface AutofillSelectCommand extends OLDBaseCommand {
  type: "AUTOFILL_SELECT";
  col: number;
  row: number;
}

export interface AutofillAutoCommand extends OLDBaseCommand {
  type: "AUTOFILL_AUTO";
}

/**
 * Create a new state for a SelectionInput component
 */
export interface NewInputCommand extends OLDBaseCommand {
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
export interface RemoveInputCommand extends OLDBaseCommand {
  type: "DISABLE_SELECTION_INPUT";
  /** SelectionComponent id */
  id: string;
}

/**
 * Set the focus on a given range of a SelectionComponent state.
 */
export interface FocusInputCommand extends OLDBaseCommand {
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
export interface AddEmptyRangeCommand extends OLDBaseCommand {
  type: "ADD_EMPTY_RANGE";
  /** SelectionComponent id */
  id: string;
}

/**
 * Remove a given range in a SelectionComponent state
 */
export interface RemoveRangeCommand extends OLDBaseCommand {
  type: "REMOVE_RANGE";
  /** SelectionComponent id */
  id: string;
  /** The range to be removed */
  rangeId: string;
}

/**
 * Set a new value for a given range of a SelectionComponent state.
 */
export interface ChangeRangeCommand extends OLDBaseCommand {
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

export interface CreateFigureCommand extends OLDBaseCommand {
  type: "CREATE_FIGURE";
  figure: Figure<any>;
  sheetId: UID;
}

export interface SelectFigureCommand extends OLDBaseCommand {
  type: "SELECT_FIGURE";
  id: string;
}

export interface UpdateFigureCommand extends OLDBaseCommand, Partial<Figure<any>> {
  type: "UPDATE_FIGURE";
  id: string;
}

export interface DeleteFigureCommand extends OLDBaseCommand {
  type: "DELETE_FIGURE";
  id: string;
}

export interface CreateChartCommand extends OLDBaseCommand {
  type: "CREATE_CHART";
  id: string;
  sheetId: string;
  definition: CreateChartDefinition;
}

export interface UpdateChartCommand extends OLDBaseCommand {
  type: "UPDATE_CHART";
  id: string;
  definition: CreateChartDefinition;
}

export type Command =
  | MultiuserCommand
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
  | StartComposerSelectionCommand
  | StopComposerSelectionCommand
  | StartEditionCommand
  | StopEditionCommand
  | AddMergeCommand
  | RemoveMergeCommand
  | SetCurrentContentCommand
  | ChangeComposerSelectionCommand
  | ReplaceComposerSelectionCommand
  | SetValueCommand
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
  | DeleteFigureCommand;

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
  SelectionOutOfBound,
  WrongPasteSelection,
  EmptyClipboard,
  InvalidRange,
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
    r: Omit<C, "type">,
    fromNetwork?: boolean
  ): CommandResult;
}

export type CommandTypes = Command["type"];
