import { Zone, Style, BorderCommand, ConditionalFormat } from "./index";

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

// Primitive Commands
// ------------------------------------------------
export interface UpdateCellCommand {
  type: "UPDATE_CELL";
  sheet: string;
  col: number;
  row: number;
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

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
  name?: string;
  cols?: number;
  rows?: number;
}

export interface AddMergeCommand {
  type: "ADD_MERGE";
  sheet: string;
  zone: Zone;
}

export interface RemoveMergeCommand {
  type: "REMOVE_MERGE";
  sheet: string;
  zone: Zone;
}

export interface AddFormattingCommand {
  type: "SET_FORMATTING";
  sheet: string;
  target: Zone[];
  style?: Style;
  border?: BorderCommand;
}

export interface ClearFormattingCommand {
  type: "CLEAR_FORMATTING";
  sheet: string;
  target: Zone[];
}

export interface SetFormatterCommand {
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
export interface AddConditionalFormatCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: ConditionalFormat;
}

export interface RemoveColumnsCommand {
  type: "REMOVE_COLUMNS";
  columns: number[];
  sheet: string; //Not used for now
}

export interface RemoveRowsCommand {
  type: "REMOVE_ROWS";
  rows: number[];
  sheet: string; //Not used for now
}

export interface AddColumnsCommand {
  type: "ADD_COLUMNS";
  column: number;
  sheet: string; //Not used for now
  quantity: number;
  position: "before" | "after";
}

export interface AddRowsCommand {
  type: "ADD_ROWS";
  row: number;
  sheet: string; //Not used for now
  quantity: number;
  position: "before" | "after";
}

// Local Commands
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
  onlyFormat?: boolean;
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
  from: string;
  to: string;
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
  strict?: boolean;
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

export interface SetCurrentContentCommand {
  type: "SET_CURRENT_CONTENT";
  content: string;
}

export interface SetValueCommand {
  type: "SET_VALUE";
  xc: string;
  text: string;
  sheet?: string;
}

export interface DeleteContentCommand {
  type: "DELETE_CONTENT";
  sheet: string;
  target: Zone[];
}

export interface ClearCellCommand {
  type: "CLEAR_CELL";
  sheet: string;
  col: number;
  row: number;
}

export interface UndoCommand {
  type: "UNDO";
}

export interface RedoCommand {
  type: "REDO";
}

export interface StartCommand {
  type: "START";
}

export type GridCommand =
  | UpdateCellCommand
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
  | DeleteContentCommand
  | EvaluateCellsCommand
  | AddConditionalFormatCommand
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
  | AddColumnsCommand;

export type CommandResult = "COMPLETED" | "CANCELLED";

export interface CommandHandler {
  canDispatch(command: GridCommand): boolean;
  start(command: GridCommand): void;
  handle(command: GridCommand): void;
  finalize(command: GridCommand): void;
}
