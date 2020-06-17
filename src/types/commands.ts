import { Zone, Style, BorderCommand, ConditionalFormat } from "./index";
import { Cell } from "./misc";

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

interface BaseCommand {
  interactive?: boolean;
}

// Primitive Commands
// ------------------------------------------------
export interface UpdateCellCommand extends BaseCommand {
  type: "UPDATE_CELL";
  sheet: string;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface ResizeColumnsCommand extends BaseCommand {
  type: "RESIZE_COLUMNS";
  sheet: string;
  cols: number[];
  size: number;
}

export interface ResizeRowsCommand extends BaseCommand {
  type: "RESIZE_ROWS";
  sheet: string;
  rows: number[];
  size: number;
}

/**
 * Todo: add a string "id" field, and change the code to use internally a uuid.
 */
export interface CreateSheetCommand extends BaseCommand {
  type: "CREATE_SHEET";
  name?: string;
  cols?: number;
  rows?: number;
  activate?: boolean;
}

export interface AddMergeCommand extends BaseCommand {
  type: "ADD_MERGE";
  sheet: string;
  zone: Zone;
  force?: boolean;
}

export interface RemoveMergeCommand extends BaseCommand {
  type: "REMOVE_MERGE";
  sheet: string;
  zone: Zone;
}

export interface AddFormattingCommand extends BaseCommand {
  type: "SET_FORMATTING";
  sheet: string;
  target: Zone[];
  style?: Style;
  border?: BorderCommand;
}

export interface ClearFormattingCommand extends BaseCommand {
  type: "CLEAR_FORMATTING";
  sheet: string;
  target: Zone[];
}

export interface SetFormatterCommand extends BaseCommand {
  type: "SET_FORMATTER";
  sheet: string;
  target: Zone[];
  formatter: string;
}

/**
 * todo: add sheet argument...
 * todo: use id instead of a list. this is not safe to serialize and send to
 * another user
 */
export interface AddConditionalFormatCommand extends BaseCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
  sheet: string;
}

export interface RemoveConditionalFormatCommand extends BaseCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
  sheet: string;
}

export interface RemoveColumnsCommand extends BaseCommand {
  type: "REMOVE_COLUMNS";
  columns: number[];
  sheet: string; //Not used for now
}

export interface RemoveRowsCommand extends BaseCommand {
  type: "REMOVE_ROWS";
  rows: number[];
  sheet: string; //Not used for now
}

export interface AddColumnsCommand extends BaseCommand {
  type: "ADD_COLUMNS";
  column: number;
  sheet: string; //Not used for now
  quantity: number;
  position: "before" | "after";
}

export interface AddRowsCommand extends BaseCommand {
  type: "ADD_ROWS";
  row: number;
  sheet: string; //Not used for now
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
  onlyFormat?: boolean;
  force?: boolean;
}

export interface PasteCellCommand extends BaseCommand {
  type: "PASTE_CELL";
  origin: Cell | null;
  originCol: number;
  originRow: number;
  col: number;
  row: number;
  sheet: string;
  cut?: boolean;
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
  sheet: string;
  cols: number[];
}

export interface AutoresizeRowsCommand extends BaseCommand {
  type: "AUTORESIZE_ROWS";
  sheet: string;
  rows: number[];
}

export interface MovePositionCommand extends BaseCommand {
  type: "MOVE_POSITION";
  deltaX: number;
  deltaY: number;
}

export interface ActivateSheetCommand extends BaseCommand {
  type: "ACTIVATE_SHEET";
  from: string;
  to: string;
}

export interface SelectCellCommand extends BaseCommand {
  type: "SELECT_CELL";
  col: number;
  row: number;
  createNewRange?: boolean;
}

export interface SetSelectionCommand extends BaseCommand {
  type: "SET_SELECTION";
  anchor: [number, number];
  zones: Zone[];
  strict?: boolean;
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

export interface RemoveHighlightsCommand extends BaseCommand {
  type: "REMOVE_HIGHLIGHTS";
}

export interface StartComposerSelectionCommand extends BaseCommand {
  type: "START_COMPOSER_SELECTION";
}

export interface StopComposerSelectionCommand extends BaseCommand {
  type: "STOP_COMPOSER_SELECTION";
}

export interface StartEditionCommand extends BaseCommand {
  type: "START_EDITION";
  text?: string;
}

export interface StopEditionCommand extends BaseCommand {
  type: "STOP_EDITION";
  cancel?: boolean;
}

export interface SetCurrentContentCommand extends BaseCommand {
  type: "SET_CURRENT_CONTENT";
  content: string;
}

export interface SetValueCommand extends BaseCommand {
  type: "SET_VALUE";
  xc: string;
  text: string;
  sheet?: string;
}

export interface DeleteContentCommand extends BaseCommand {
  type: "DELETE_CONTENT";
  sheet: string;
  target: Zone[];
}

export interface ClearCellCommand extends BaseCommand {
  type: "CLEAR_CELL";
  sheet: string;
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

export interface MoveArtifactCommand extends BaseCommand {
  type: "MOVE_ARTIFACT";
}

export interface SelectArtifactCommand extends BaseCommand {
  type: "SELECT_ARTIFACT";
  id: string;
}
export interface ResizeArtifactCommand extends BaseCommand {
  type: "RESIZE_ARTIFACT";
}
export interface DeleteArtifactCommand extends BaseCommand {
  type: "DELETE_ARTIFACT";
}

export interface CreateArtifactCommand extends BaseCommand {
  type: "CREATE_ARTIFACT";
  artifactType: "placeholder";
  details: any;
}

export type Command =
  | UpdateCellCommand
  | CopyCommand
  | CutCommand
  | PasteCommand
  | PasteCellCommand
  | PasteFromOSClipboardCommand
  | ActivatePaintFormatCommand
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
  | DeleteContentCommand
  | EvaluateCellsCommand
  | AddConditionalFormatCommand
  | RemoveConditionalFormatCommand
  | AddHighlightsCommand
  | RemoveHighlightsCommand
  | StartComposerSelectionCommand
  | StopComposerSelectionCommand
  | StartEditionCommand
  | StopEditionCommand
  | AddMergeCommand
  | RemoveMergeCommand
  | SetCurrentContentCommand
  | SetValueCommand
  | AddFormattingCommand
  | ClearFormattingCommand
  | SetFormatterCommand
  | ClearCellCommand
  | UndoCommand
  | RedoCommand
  | StartCommand
  | RemoveRowsCommand
  | RemoveColumnsCommand
  | AddRowsCommand
  | AddColumnsCommand
  | AutofillCommand
  | AutofillSelectCommand
  | AutofillAutoCommand
  | MoveArtifactCommand
  | ResizeArtifactCommand
  | SelectArtifactCommand
  | DeleteArtifactCommand
  | CreateArtifactCommand;

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
  WrongSheetName,
  SelectionOutOfBound,
  WrongPasteSelection,
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
