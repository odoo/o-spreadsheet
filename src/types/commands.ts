import {
  ConditionalFormat,
  DataValidationRule,
  Figure,
  Format,
  Locale,
  Style,
  Zone,
} from "./index";
import {
  Border,
  BorderData,
  CellPosition,
  Color,
  Dimension,
  HeaderIndex,
  Pixel,
  PixelPosition,
  SetDecimalStep,
  SortDirection,
  SortOptions,
  UID,
} from "./misc";

import { ChartDefinition } from "./chart/chart";
import { ClipboardPasteOptions, ParsedOsClipboardContentWithImageData } from "./clipboard";
import { Carousel, CarouselItem, FigureSize } from "./figure";
import { SearchOptions } from "./find_and_replace";
import { Image } from "./image";
import { PivotCoreDefinition, PivotTableData } from "./pivot";
import { RangeData } from "./range";
import { CoreTableType, DataFilterValue, TableConfig, TableStyleTemplateName } from "./table";

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

export function isSheetDependent(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, SheetDependentCommand> {
  return "sheetId" in cmd;
}

export interface HeadersDependentCommand {
  sheetId: UID;
  dimension: Dimension;
  elements: HeaderIndex[];
}

export function isHeadersDependant(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, HeadersDependentCommand> {
  return "dimension" in cmd && "sheetId" in cmd && "elements" in cmd;
}

export interface SheetEditingCommand {
  sheetName: string;
}

export interface TargetDependentCommand {
  sheetId: UID;
  target: Zone[];
}

export function isTargetDependent(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, TargetDependentCommand> {
  return "target" in cmd && "sheetId" in cmd;
}

export interface RangesDependentCommand {
  ranges: RangeData[];
}

export function isRangeDependant(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, RangesDependentCommand> {
  return "ranges" in cmd;
}

export interface PositionDependentCommand {
  sheetId: UID;
  col: number;
  row: number;
}

export function isPositionDependent(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, PositionDependentCommand> {
  return "col" in cmd && "row" in cmd && "sheetId" in cmd;
}

export interface ZoneDependentCommand {
  sheetId: UID;
  zone: Zone;
}

export function isZoneDependent(
  cmd: CoreCommand
): cmd is Extract<CoreCommand, ZoneDependentCommand> {
  return "sheetId" in cmd && "zone" in cmd;
}

export const invalidateEvaluationCommands = new Set<CommandTypes>([
  "RENAME_SHEET",
  "DELETE_SHEET",
  "CREATE_SHEET",
  "DUPLICATE_SHEET",
  "ADD_COLUMNS_ROWS",
  "REMOVE_COLUMNS_ROWS",
  "UNDO",
  "REDO",
  "ADD_MERGE",
  "REMOVE_MERGE",
  "DUPLICATE_SHEET",
  "UPDATE_LOCALE",
  "ADD_PIVOT",
  "UPDATE_PIVOT",
  "INSERT_PIVOT",
  "RENAME_PIVOT",
  "REMOVE_PIVOT",
  "DUPLICATE_PIVOT",
]);

export const invalidateChartEvaluationCommands = new Set<CommandTypes>([
  "EVALUATE_CELLS",
  "EVALUATE_CHARTS",
  "UPDATE_CELL",
  "UNHIDE_COLUMNS_ROWS",
  "HIDE_COLUMNS_ROWS",
  "GROUP_HEADERS",
  "UNGROUP_HEADERS",
  "FOLD_ALL_HEADER_GROUPS",
  "FOLD_HEADER_GROUP",
  "FOLD_HEADER_GROUPS_IN_ZONE",
  "UNFOLD_ALL_HEADER_GROUPS",
  "UNFOLD_HEADER_GROUP",
  "UNFOLD_HEADER_GROUPS_IN_ZONE",
  "UPDATE_TABLE",
  "UPDATE_FILTER",
  "UNDO",
  "REDO",
]);

export const invalidateDependenciesCommands = new Set<CommandTypes>(["MOVE_RANGES"]);

export const invalidateCFEvaluationCommands = new Set<CommandTypes>([
  "EVALUATE_CELLS",
  "ADD_CONDITIONAL_FORMAT",
  "REMOVE_CONDITIONAL_FORMAT",
  "CHANGE_CONDITIONAL_FORMAT_PRIORITY",
]);

export const invalidateBordersCommands = new Set<CommandTypes>([
  "AUTOFILL_CELL",
  "SET_BORDER",
  "SET_ZONE_BORDERS",
  "SET_BORDERS_ON_TARGET",
]);

export const invalidSubtotalFormulasCommands = new Set<CommandTypes>([
  "UNHIDE_COLUMNS_ROWS",
  "HIDE_COLUMNS_ROWS",
  "GROUP_HEADERS",
  "UNGROUP_HEADERS",
  "FOLD_ALL_HEADER_GROUPS",
  "FOLD_HEADER_GROUP",
  "FOLD_HEADER_GROUPS_IN_ZONE",
  "UNFOLD_ALL_HEADER_GROUPS",
  "UNFOLD_HEADER_GROUP",
  "UNFOLD_HEADER_GROUPS_IN_ZONE",
  "UPDATE_TABLE",
  "UPDATE_FILTER",
]);

export const readonlyAllowedCommands = new Set<CommandTypes>([
  "START",
  "ACTIVATE_SHEET",

  "COPY",

  "RESIZE_SHEETVIEW",
  "SET_VIEWPORT_OFFSET",

  "EVALUATE_CELLS",
  "EVALUATE_CHARTS",

  "SET_FORMULA_VISIBILITY",

  "UPDATE_FILTER",
  "UPDATE_CHART",
  "UPDATE_CAROUSEL_ACTIVE_ITEM",

  "UPDATE_PIVOT",
]);

export const coreTypes = new Set<CoreCommandTypes>([
  /** CELLS */
  "UPDATE_CELL",
  "UPDATE_CELL_POSITION",
  "CLEAR_CELL",
  "CLEAR_CELLS",
  "DELETE_CONTENT",

  /** GRID SHAPE */
  "ADD_COLUMNS_ROWS",
  "REMOVE_COLUMNS_ROWS",
  "RESIZE_COLUMNS_ROWS",
  "HIDE_COLUMNS_ROWS",
  "UNHIDE_COLUMNS_ROWS",
  "SET_GRID_LINES_VISIBILITY",
  "UNFREEZE_COLUMNS",
  "UNFREEZE_ROWS",
  "FREEZE_COLUMNS",
  "FREEZE_ROWS",
  "UNFREEZE_COLUMNS_ROWS",

  /** MERGE */
  "ADD_MERGE",
  "REMOVE_MERGE",

  /** SHEETS MANIPULATION */
  "CREATE_SHEET",
  "DELETE_SHEET",
  "DUPLICATE_SHEET",
  "MOVE_SHEET",
  "RENAME_SHEET",
  "COLOR_SHEET",
  "HIDE_SHEET",
  "SHOW_SHEET",

  /** RANGES MANIPULATION */
  "MOVE_RANGES",

  /** CONDITIONAL FORMAT */
  "ADD_CONDITIONAL_FORMAT",
  "REMOVE_CONDITIONAL_FORMAT",
  "CHANGE_CONDITIONAL_FORMAT_PRIORITY",

  /** FIGURES */
  "CREATE_FIGURE",
  "DELETE_FIGURE",
  "UPDATE_FIGURE",
  "CREATE_CAROUSEL",
  "UPDATE_CAROUSEL",

  /** FORMATTING */
  "SET_FORMATTING",
  "CLEAR_FORMATTING",
  "SET_BORDER",
  "SET_ZONE_BORDERS",
  "SET_BORDERS_ON_TARGET",

  /** CHART */
  "CREATE_CHART",
  "UPDATE_CHART",
  "DELETE_CHART",

  /** FILTERS */
  "CREATE_TABLE",
  "REMOVE_TABLE",
  "UPDATE_TABLE",
  "CREATE_TABLE_STYLE",
  "REMOVE_TABLE_STYLE",

  /** IMAGE */
  "CREATE_IMAGE",

  /** HEADER GROUP */
  "GROUP_HEADERS",
  "UNGROUP_HEADERS",
  "UNFOLD_HEADER_GROUP",
  "FOLD_HEADER_GROUP",
  "FOLD_ALL_HEADER_GROUPS",
  "UNFOLD_ALL_HEADER_GROUPS",
  "UNFOLD_HEADER_GROUPS_IN_ZONE",
  "FOLD_HEADER_GROUPS_IN_ZONE",

  /** DATA VALIDATION */
  "ADD_DATA_VALIDATION_RULE",
  "REMOVE_DATA_VALIDATION_RULE",

  /** MISC */
  "UPDATE_LOCALE",

  /** PIVOT */
  "ADD_PIVOT",
  "UPDATE_PIVOT",
  "INSERT_PIVOT",
  "RENAME_PIVOT",
  "REMOVE_PIVOT",
  "DUPLICATE_PIVOT",
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
export interface UpdateCellCommand extends PositionDependentCommand {
  type: "UPDATE_CELL";
  content?: string;
  style?: Style | null;
  format?: Format;
}

/**
 * Move a cell to a given position or clear the position.
 */
export interface UpdateCellPositionCommand extends PositionDependentCommand {
  type: "UPDATE_CELL_POSITION";
  cellId?: UID;
}

//------------------------------------------------------------------------------
// Grid Shape
//------------------------------------------------------------------------------

export interface AddColumnsRowsCommand extends SheetDependentCommand, SheetEditingCommand {
  type: "ADD_COLUMNS_ROWS";
  dimension: Dimension;
  base: HeaderIndex;
  quantity: number;
  position: "before" | "after";
}

export interface RemoveColumnsRowsCommand extends HeadersDependentCommand, SheetEditingCommand {
  type: "REMOVE_COLUMNS_ROWS";
  elements: HeaderIndex[];
}

export interface MoveColumnsRowsCommand extends HeadersDependentCommand, SheetEditingCommand {
  type: "MOVE_COLUMNS_ROWS";
  base: HeaderIndex;
  elements: HeaderIndex[];
  position: "before" | "after";
}

export interface ResizeColumnsRowsCommand extends HeadersDependentCommand {
  type: "RESIZE_COLUMNS_ROWS";
  elements: number[];
  size: number | null;
}

export interface HideColumnsRowsCommand extends HeadersDependentCommand {
  type: "HIDE_COLUMNS_ROWS";
  elements: HeaderIndex[];
}

export interface UnhideColumnsRowsCommand extends HeadersDependentCommand {
  type: "UNHIDE_COLUMNS_ROWS";
  elements: HeaderIndex[];
}

/**
 * Freeze a given number of columns on top of the sheet
 */
export interface FreezeColumnsCommand extends SheetDependentCommand {
  type: "FREEZE_COLUMNS";
  /** number of columns frozen */
  quantity: number;
}

/**
 * Freeze a given number of rows on top of the sheet
 */
export interface FreezeRowsCommand extends SheetDependentCommand {
  type: "FREEZE_ROWS";
  /** number of frozen rows */
  quantity: number;
}
export interface UnfreezeColumnsRowsCommand {
  type: "UNFREEZE_COLUMNS_ROWS";
  sheetId: UID;
}

export interface UnfreezeColumnsCommand {
  type: "UNFREEZE_COLUMNS";
  sheetId: UID;
}

export interface UnfreezeRowsCommand {
  type: "UNFREEZE_ROWS";
  sheetId: UID;
}
export interface SetGridLinesVisibilityCommand extends SheetDependentCommand {
  type: "SET_GRID_LINES_VISIBILITY";
  areGridLinesVisible: boolean;
}

//------------------------------------------------------------------------------
// Merge
//------------------------------------------------------------------------------

export interface AddMergeCommand extends TargetDependentCommand {
  type: "ADD_MERGE";
  force?: boolean;
}

export interface RemoveMergeCommand extends TargetDependentCommand {
  type: "REMOVE_MERGE";
}

//------------------------------------------------------------------------------
// Sheets Manipulation
//------------------------------------------------------------------------------

export interface CreateSheetCommand extends SheetDependentCommand {
  type: "CREATE_SHEET";
  position: number;
  name: string;
  cols?: number;
  rows?: number;
}

export interface DeleteSheetCommand extends SheetDependentCommand, SheetEditingCommand {
  type: "DELETE_SHEET";
}

export interface DuplicateSheetCommand extends SheetDependentCommand {
  type: "DUPLICATE_SHEET";
  sheetIdTo: UID;
  sheetNameTo: string;
}

export interface MoveSheetCommand extends SheetDependentCommand {
  type: "MOVE_SHEET";
  delta: number;
}

export interface RenameSheetCommand extends SheetDependentCommand {
  type: "RENAME_SHEET";
  newName: string;
  oldName: string;
}

export interface ColorSheetCommand extends SheetDependentCommand {
  type: "COLOR_SHEET";
  color?: Color;
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
  extends PositionDependentCommand,
    TargetDependentCommand,
    SheetEditingCommand {
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
export interface AddConditionalFormatCommand extends SheetDependentCommand, RangesDependentCommand {
  type: "ADD_CONDITIONAL_FORMAT";
  cf: Omit<ConditionalFormat, "ranges">;
}

export interface RemoveConditionalFormatCommand extends SheetDependentCommand {
  type: "REMOVE_CONDITIONAL_FORMAT";
  id: string;
}

export interface MoveConditionalFormatCommand extends SheetDependentCommand {
  type: "CHANGE_CONDITIONAL_FORMAT_PRIORITY";
  cfId: UID;
  delta: number;
}

//------------------------------------------------------------------------------
// Figures
//------------------------------------------------------------------------------

export interface CreateFigureCommand extends BaseFigureCommand {
  type: "CREATE_FIGURE";
  tag: string;
}

export interface UpdateFigureCommand
  extends Omit<Partial<Figure>, "id" | "col" | "row">,
    SheetDependentCommand,
    PositionDependentCommand {
  type: "UPDATE_FIGURE";
  figureId: UID;
}

export interface DeleteFigureCommand extends SheetDependentCommand {
  type: "DELETE_FIGURE";
  figureId: UID;
}

interface BaseFigureCommand extends PositionDependentCommand {
  figureId: UID;
  offset: PixelPosition;
  size: FigureSize;
}

//------------------------------------------------------------------------------
// Chart
//------------------------------------------------------------------------------

export interface CreateChartCommand {
  type: "CREATE_CHART";
  chartId: UID;
  definition: ChartDefinition;
  sheetId: UID;
  figureId: UID;
  offset?: PixelPosition;
  size?: FigureSize;
  col?: number;
  row?: number;
}

export interface UpdateChartCommand extends SheetDependentCommand {
  type: "UPDATE_CHART";
  figureId: UID;
  chartId: UID;
  definition: ChartDefinition;
}

export interface DeleteChartCommand extends SheetDependentCommand {
  type: "DELETE_CHART";
  chartId: UID;
}

export interface CreateCarouselCommand extends BaseFigureCommand {
  type: "CREATE_CAROUSEL";
  definition: Carousel;
}

export interface UpdateCarouselCommand extends SheetDependentCommand {
  type: "UPDATE_CAROUSEL";
  figureId: UID;
  definition: Carousel;
}

export interface AddNewChartToCarouselCommand extends SheetDependentCommand {
  type: "ADD_NEW_CHART_TO_CAROUSEL";
  figureId: UID;
}

export interface AddFigureChartToCarouselCommand extends SheetDependentCommand {
  type: "ADD_FIGURE_CHART_TO_CAROUSEL";
  carouselFigureId: UID;
  chartFigureId: UID;
}

export interface DuplicateCarouselChartCommand extends SheetDependentCommand {
  type: "DUPLICATE_CAROUSEL_CHART";
  carouselId: UID;
  chartId: UID;
  duplicatedChartId: UID;
}

export interface UpdateCarouselActiveItemCommand extends SheetDependentCommand {
  type: "UPDATE_CAROUSEL_ACTIVE_ITEM";
  figureId: UID;
  item: CarouselItem;
}

export interface PopOutChartFromCarouselCommand extends SheetDependentCommand {
  type: "POPOUT_CHART_FROM_CAROUSEL";
  carouselId: UID;
  chartId: UID;
}

//------------------------------------------------------------------------------
// Image
//------------------------------------------------------------------------------

export interface CreateImageOverCommand extends BaseFigureCommand {
  type: "CREATE_IMAGE";
  definition: Image;
}

//------------------------------------------------------------------------------
// Filters
//------------------------------------------------------------------------------

export interface CreateTableCommand extends RangesDependentCommand {
  type: "CREATE_TABLE";
  sheetId: UID;
  config: TableConfig;
  tableType: CoreTableType;
}

export interface RemoveTableCommand extends TargetDependentCommand {
  type: "REMOVE_TABLE";
}

export interface UpdateTableCommand {
  type: "UPDATE_TABLE";
  zone: Zone;
  sheetId: UID;
  newTableRange?: RangeData;
  tableType?: CoreTableType;
  config?: Partial<TableConfig>;
}

export interface ResizeTableCommand {
  type: "RESIZE_TABLE";
  zone: Zone;
  sheetId: UID;
  newTableRange: RangeData;
  tableType?: CoreTableType;
}

export interface AutofillTableCommand extends PositionDependentCommand {
  type: "AUTOFILL_TABLE_COLUMN";

  /** The row to start the autofill in. If undefined, it will autofill from the top of the table column */
  autofillRowStart?: number;
  /** The row to end the autofill in. If undefined, it will autofill to the bottom of the table column */
  autofillRowEnd?: number;
}

export interface CreateTableStyleCommand {
  type: "CREATE_TABLE_STYLE";
  tableStyleId: string;
  tableStyleName: string;
  templateName: TableStyleTemplateName;
  primaryColor: Color;
}

export interface RemoveTableStyleCommand {
  type: "REMOVE_TABLE_STYLE";
  tableStyleId: string;
}

export interface UpdateFilterCommand extends PositionDependentCommand {
  type: "UPDATE_FILTER";
  value: DataFilterValue;
}

export interface SetFormattingCommand extends TargetDependentCommand {
  type: "SET_FORMATTING";
  style?: Style;
  format?: Format;
}

export interface SetZoneBordersCommand extends TargetDependentCommand {
  type: "SET_ZONE_BORDERS";
  border: BorderData;
}

export interface SetBorderCommand extends PositionDependentCommand {
  type: "SET_BORDER";
  border: Border | undefined;
}

export interface SetBorderTargetCommand extends TargetDependentCommand {
  type: "SET_BORDERS_ON_TARGET";
  border: Border | undefined;
}

export interface ClearFormattingCommand extends TargetDependentCommand {
  type: "CLEAR_FORMATTING";
}

export interface SetDecimalCommand extends TargetDependentCommand {
  type: "SET_DECIMAL";
  step: SetDecimalStep;
}

export interface SetContextualFormatCommand extends TargetDependentCommand {
  type: "SET_FORMATTING_WITH_PIVOT";
  format: Format;
}

export interface UpdateLocaleCommand {
  type: "UPDATE_LOCALE";
  locale: Locale;
}

// ------------------------------------------------
// PIVOT
// ------------------------------------------------
export interface AddPivotCommand {
  type: "ADD_PIVOT";
  pivotId: UID;
  pivot: PivotCoreDefinition;
}

export interface UpdatePivotCommand {
  type: "UPDATE_PIVOT";
  pivotId: UID;
  pivot: PivotCoreDefinition;
}

export interface InsertPivotCommand extends PositionDependentCommand {
  type: "INSERT_PIVOT";
  pivotId: UID;
  table: PivotTableData;
}

export interface RenamePivotCommand {
  type: "RENAME_PIVOT";
  pivotId: UID;
  name: string;
}

export interface RemovePivotCommand {
  type: "REMOVE_PIVOT";
  pivotId: UID;
}

export interface DuplicatePivotCommand {
  type: "DUPLICATE_PIVOT";
  pivotId: UID;
  newPivotId: string;
  // an early version of the command did not include the duplicatedPivotName
  duplicatedPivotName?: string;
}

// ------------------------------------------------
// DATA CLEANUP
// ------------------------------------------------

export interface RemoveDuplicatesCommand {
  type: "REMOVE_DUPLICATES";
  columns: HeaderIndex[];
  hasHeader: boolean;
}

export interface TrimWhitespaceCommand {
  type: "TRIM_WHITESPACE";
}

export interface GroupHeadersCommand extends SheetDependentCommand {
  type: "GROUP_HEADERS";
  dimension: Dimension;
  start: HeaderIndex;
  end: HeaderIndex;
}

export interface UnGroupHeadersCommand extends SheetDependentCommand {
  type: "UNGROUP_HEADERS";
  dimension: Dimension;
  start: HeaderIndex;
  end: HeaderIndex;
}

export interface FoldHeaderGroupCommand extends SheetDependentCommand {
  type: "FOLD_HEADER_GROUP";
  dimension: Dimension;
  start: HeaderIndex;
  end: HeaderIndex;
}

export interface UnfoldHeaderGroupCommand extends SheetDependentCommand {
  type: "UNFOLD_HEADER_GROUP";
  dimension: Dimension;
  start: HeaderIndex;
  end: HeaderIndex;
}

export interface FoldAllHeaderGroupsCommand extends SheetDependentCommand {
  type: "FOLD_ALL_HEADER_GROUPS";
  dimension: Dimension;
}

export interface UnfoldAllHeaderGroupsCommand extends SheetDependentCommand {
  type: "UNFOLD_ALL_HEADER_GROUPS";
  dimension: Dimension;
}

export interface UnfoldHeaderGroupsInZoneCommand extends ZoneDependentCommand {
  type: "UNFOLD_HEADER_GROUPS_IN_ZONE";
  dimension: Dimension;
}

export interface FoldHeaderGroupsInZoneCommand extends ZoneDependentCommand {
  type: "FOLD_HEADER_GROUPS_IN_ZONE";
  dimension: Dimension;
}

export interface AddDataValidationCommand extends SheetDependentCommand, RangesDependentCommand {
  type: "ADD_DATA_VALIDATION_RULE";
  rule: Omit<DataValidationRule, "ranges">;
}

export interface RemoveDataValidationCommand extends SheetDependentCommand {
  type: "REMOVE_DATA_VALIDATION_RULE";
  id: string;
}

//#endregion

//#region Local Commands
// ------------------------------------------------
export interface CopyCommand {
  type: "COPY";
}

export interface CutCommand {
  type: "CUT";
}

export interface PasteCommand {
  type: "PASTE";
  target: Zone[];
  pasteOption?: ClipboardPasteOptions;
}

export interface CopyPasteCellsAboveCommand {
  type: "COPY_PASTE_CELLS_ABOVE";
}

export interface CopyPasteCellsOnLeftCommand {
  type: "COPY_PASTE_CELLS_ON_LEFT";
}

export interface RepeatPasteCommand {
  type: "REPEAT_PASTE";
  target: Zone[];
  pasteOption?: ClipboardPasteOptions;
}

export interface CleanClipBoardHighlightCommand {
  type: "CLEAN_CLIPBOARD_HIGHLIGHT";
}

export interface AutoFillCellCommand {
  type: "AUTOFILL_CELL";
  originCol: number;
  originRow: number;
  col: HeaderIndex;
  row: HeaderIndex;
  content?: string;
  style?: Style | null;
  border?: Border;
  format?: Format;
}

export interface PasteFromOSClipboardCommand {
  type: "PASTE_FROM_OS_CLIPBOARD";
  target: Zone[];
  clipboardContent: ParsedOsClipboardContentWithImageData;
  pasteOption?: ClipboardPasteOptions;
}

export interface AutoresizeColumnsCommand {
  type: "AUTORESIZE_COLUMNS";
  sheetId: UID;
  cols: HeaderIndex[];
}

export interface AutoresizeRowsCommand {
  type: "AUTORESIZE_ROWS";
  sheetId: UID;
  rows: HeaderIndex[];
}

export interface ActivateSheetCommand {
  type: "ACTIVATE_SHEET";
  sheetIdFrom: UID;
  sheetIdTo: UID;
}

export interface EvaluateCellsCommand {
  type: "EVALUATE_CELLS";
  cellIds?: UID[];
}

export interface EvaluateChartsCommand {
  type: "EVALUATE_CHARTS";
}

export interface StartChangeHighlightCommand {
  type: "START_CHANGE_HIGHLIGHT";
  zone: Zone;
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

export interface ClearCellCommand extends PositionDependentCommand {
  type: "CLEAR_CELL";
}

export interface ClearCellsCommand extends TargetDependentCommand {
  type: "CLEAR_CELLS";
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
  col: HeaderIndex;
  row: HeaderIndex;
}

export interface AutofillAutoCommand {
  type: "AUTOFILL_AUTO";
}

export interface SelectFigureCommand {
  type: "SELECT_FIGURE";
  figureId: UID | null;
}

export interface ReplaceSearchCommand {
  type: "REPLACE_SEARCH";
  searchString: string;
  replaceWith: string;
  searchOptions: SearchOptions;
  matches: CellPosition[];
}

export interface SortCommand {
  type: "SORT_CELLS";
  sheetId: UID;
  col: number;
  row: number;
  zone: Zone;
  sortDirection: SortDirection;
  sortOptions?: SortOptions;
}

export interface ResizeViewportCommand {
  type: "RESIZE_SHEETVIEW";
  width: Pixel;
  height: Pixel;
  gridOffsetX?: Pixel;
  gridOffsetY?: Pixel;
}

export interface SetViewportOffsetCommand {
  type: "SET_VIEWPORT_OFFSET";
  offsetX: Pixel;
  offsetY: Pixel;
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

export interface MoveViewportToCellCommand {
  type: "SCROLL_TO_CELL";
  col: HeaderIndex;
  row: HeaderIndex;
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

//#endregion

export interface ActivateNextSheetCommand {
  type: "ACTIVATE_NEXT_SHEET";
}

export interface ActivatePreviousSheetCommand {
  type: "ACTIVATE_PREVIOUS_SHEET";
}

export interface SplitTextIntoColumnsCommand {
  type: "SPLIT_TEXT_INTO_COLUMNS";
  separator: string;
  addNewColumns: boolean;
  force?: boolean;
}

export interface RefreshPivotCommand {
  type: "REFRESH_PIVOT";
  id: UID;
}

export interface InsertNewPivotCommand {
  type: "INSERT_NEW_PIVOT";
  pivotId: UID;
  newSheetId: UID;
}

export interface DuplicatePivotInNewSheetCommand {
  type: "DUPLICATE_PIVOT_IN_NEW_SHEET";
  pivotId: UID;
  newPivotId: UID;
  newSheetId: UID;
}

export interface InsertPivotWithTableCommand extends PositionDependentCommand {
  type: "INSERT_PIVOT_WITH_TABLE";
  pivotId: UID;
  table: PivotTableData;
  pivotMode: "static" | "dynamic";
}

export interface SplitPivotFormulaCommand extends PositionDependentCommand {
  type: "SPLIT_PIVOT_FORMULA";
  pivotId: UID;
}

export interface PaintFormat extends TargetDependentCommand {
  type: "PAINT_FORMAT";
}

export interface DeleteUnfilteredContentCommand extends TargetDependentCommand {
  type: "DELETE_UNFILTERED_CONTENT";
}

export interface PivotStartPresenceTracking {
  type: "PIVOT_START_PRESENCE_TRACKING";
  pivotId: UID;
}

export interface PivotStopPresenceTracking {
  type: "PIVOT_STOP_PRESENCE_TRACKING";
}

export interface ToggleCheckboxCommand extends TargetDependentCommand {
  type: "TOGGLE_CHECKBOX";
}

export type CoreCommand =
  // /** History */
  // | SelectiveUndoCommand
  // | SelectiveRedoCommand

  /** CELLS */
  | UpdateCellCommand
  | UpdateCellPositionCommand
  | ClearCellCommand
  | ClearCellsCommand
  | DeleteContentCommand

  /** GRID SHAPE */
  | AddColumnsRowsCommand
  | RemoveColumnsRowsCommand
  | ResizeColumnsRowsCommand
  | HideColumnsRowsCommand
  | UnhideColumnsRowsCommand
  | SetGridLinesVisibilityCommand
  | FreezeColumnsCommand
  | FreezeRowsCommand
  | UnfreezeColumnsRowsCommand
  | UnfreezeColumnsCommand
  | UnfreezeRowsCommand

  /** MERGE */
  | AddMergeCommand
  | RemoveMergeCommand

  /** SHEETS MANIPULATION */
  | CreateSheetCommand
  | DeleteSheetCommand
  | DuplicateSheetCommand
  | MoveSheetCommand
  | RenameSheetCommand
  | ColorSheetCommand
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
  | CreateCarouselCommand
  | UpdateCarouselCommand

  /** FORMATTING */
  | SetFormattingCommand
  | ClearFormattingCommand
  | SetZoneBordersCommand
  | SetBorderCommand
  | SetBorderTargetCommand

  /** CHART */
  | CreateChartCommand
  | UpdateChartCommand
  | DeleteChartCommand

  /** IMAGE */
  | CreateImageOverCommand

  /** FILTERS */
  | CreateTableCommand
  | RemoveTableCommand
  | UpdateTableCommand
  | CreateTableStyleCommand
  | RemoveTableStyleCommand

  /** HEADER GROUP */
  | GroupHeadersCommand
  | UnGroupHeadersCommand
  | UnfoldHeaderGroupCommand
  | FoldHeaderGroupCommand
  | FoldAllHeaderGroupsCommand
  | UnfoldAllHeaderGroupsCommand
  | UnfoldHeaderGroupsInZoneCommand
  | FoldHeaderGroupsInZoneCommand

  /** DATA VALIDATION */
  | AddDataValidationCommand
  | RemoveDataValidationCommand

  /** MISC */
  | UpdateLocaleCommand

  /** PIVOT */
  | AddPivotCommand
  | UpdatePivotCommand
  | InsertPivotCommand
  | RenamePivotCommand
  | RemovePivotCommand
  | DuplicatePivotCommand;

export type LocalCommand =
  | RequestUndoCommand
  | RequestRedoCommand
  | UndoCommand
  | RedoCommand
  | CopyCommand
  | CutCommand
  | PasteCommand
  | CopyPasteCellsAboveCommand
  | CopyPasteCellsOnLeftCommand
  | RepeatPasteCommand
  | CleanClipBoardHighlightCommand
  | AutoFillCellCommand
  | PasteFromOSClipboardCommand
  | AutoresizeColumnsCommand
  | AutoresizeRowsCommand
  | MoveColumnsRowsCommand
  | ActivateSheetCommand
  | EvaluateCellsCommand
  | EvaluateChartsCommand
  | StartChangeHighlightCommand
  | StartCommand
  | AutofillCommand
  | AutofillSelectCommand
  | AutofillTableCommand
  | ShowFormulaCommand
  | AutofillAutoCommand
  | SelectFigureCommand
  | ReplaceSearchCommand
  | SortCommand
  | SetDecimalCommand
  | SetContextualFormatCommand
  | ResizeViewportCommand
  | SumSelectionCommand
  | DeleteCellCommand
  | InsertCellCommand
  | SetViewportOffsetCommand
  | MoveViewportDownCommand
  | MoveViewportUpCommand
  | MoveViewportToCellCommand
  | ActivateNextSheetCommand
  | ActivatePreviousSheetCommand
  | UpdateFilterCommand
  | SplitTextIntoColumnsCommand
  | RemoveDuplicatesCommand
  | TrimWhitespaceCommand
  | ResizeTableCommand
  | RefreshPivotCommand
  | InsertNewPivotCommand
  | DuplicatePivotInNewSheetCommand
  | InsertPivotWithTableCommand
  | SplitPivotFormulaCommand
  | PaintFormat
  | DeleteUnfilteredContentCommand
  | PivotStartPresenceTracking
  | PivotStopPresenceTracking
  | ToggleCheckboxCommand
  | AddNewChartToCarouselCommand
  | AddFigureChartToCarouselCommand
  | DuplicateCarouselChartCommand
  | UpdateCarouselActiveItemCommand
  | PopOutChartFromCarouselCommand;

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
  Success = "Success",
  CancelledForUnknownReason = "CancelledForUnknownReason",
  WillRemoveExistingMerge = "WillRemoveExistingMerge",
  CannotMoveTableHeader = "CannotMoveTableHeader",
  MergeIsDestructive = "MergeIsDestructive",
  CellIsMerged = "CellIsMerged",
  InvalidTarget = "InvalidTarget",
  EmptyUndoStack = "EmptyUndoStack",
  EmptyRedoStack = "EmptyRedoStack",
  NotEnoughElements = "NotEnoughElements",
  NotEnoughSheets = "NotEnoughSheets",
  MissingSheetName = "MissingSheetName",
  UnchangedSheetName = "UnchangedSheetName",
  DuplicatedSheetName = "DuplicatedSheetName",
  DuplicatedSheetId = "DuplicatedSheetId",
  ForbiddenCharactersInSheetName = "ForbiddenCharactersInSheetName",
  WrongSheetMove = "WrongSheetMove",
  WrongSheetPosition = "WrongSheetPosition",
  InvalidAnchorZone = "InvalidAnchorZone",
  SelectionOutOfBound = "SelectionOutOfBound",
  TargetOutOfSheet = "TargetOutOfSheet",
  WrongCutSelection = "WrongCutSelection",
  WrongPasteSelection = "WrongPasteSelection",
  WrongPasteOption = "WrongPasteOption",
  WrongFigurePasteOption = "WrongFigurePasteOption",
  EmptyClipboard = "EmptyClipboard",
  EmptyRange = "EmptyRange",
  InvalidRange = "InvalidRange",
  InvalidZones = "InvalidZones",
  InvalidSheetId = "InvalidSheetId",
  InvalidCellId = "InvalidCellId",
  InvalidFigureId = "InvalidFigureId",
  InputAlreadyFocused = "InputAlreadyFocused",
  MaximumRangesReached = "MaximumRangesReached",
  MinimumRangesReached = "MinimumRangesReached",
  InvalidChartDefinition = "InvalidChartDefinition",
  InvalidDataSet = "InvalidDataSet",
  InvalidLabelRange = "InvalidLabelRange",
  InvalidScorecardKeyValue = "InvalidScorecardKeyValue",
  InvalidScorecardBaseline = "InvalidScorecardBaseline",
  InvalidGaugeDataRange = "InvalidGaugeDataRange",
  EmptyGaugeRangeMin = "EmptyGaugeRangeMin",
  GaugeRangeMinNaN = "GaugeRangeMinNaN",
  EmptyGaugeRangeMax = "EmptyGaugeRangeMax",
  GaugeRangeMaxNaN = "GaugeRangeMaxNaN",
  GaugeLowerInflectionPointNaN = "GaugeLowerInflectionPointNaN",
  GaugeUpperInflectionPointNaN = "GaugeUpperInflectionPointNaN",
  InvalidAutofillSelection = "InvalidAutofillSelection",
  MinBiggerThanMax = "MinBiggerThanMax",
  LowerBiggerThanUpper = "LowerBiggerThanUpper",
  MidBiggerThanMax = "MidBiggerThanMax",
  MinBiggerThanMid = "MinBiggerThanMid",
  FirstArgMissing = "FirstArgMissing",
  SecondArgMissing = "SecondArgMissing",
  MinNaN = "MinNaN",
  MidNaN = "MidNaN",
  MaxNaN = "MaxNaN",
  ValueUpperInflectionNaN = "ValueUpperInflectionNaN",
  ValueLowerInflectionNaN = "ValueLowerInflectionNaN",
  MinInvalidFormula = "MinInvalidFormula",
  MidInvalidFormula = "MidInvalidFormula",
  MaxInvalidFormula = "MaxInvalidFormula",
  ValueUpperInvalidFormula = "ValueUpperInvalidFormula",
  ValueLowerInvalidFormula = "ValueLowerInvalidFormula",
  InvalidSortAnchor = "InvalidSortAnchor",
  InvalidSortZone = "InvalidSortZone",
  SortZoneWithArrayFormulas = "SortZoneWithArrayFormulas",
  WaitingSessionConfirmation = "WaitingSessionConfirmation",
  MergeOverlap = "MergeOverlap",
  TooManyHiddenElements = "TooManyHiddenElements",
  Readonly = "Readonly",
  InvalidViewportSize = "InvalidViewportSize",
  InvalidScrollingDirection = "InvalidScrollingDirection",
  ViewportScrollLimitsReached = "ViewportScrollLimitsReached",
  FigureDoesNotExist = "FigureDoesNotExist",
  InvalidConditionalFormatId = "InvalidConditionalFormatId",
  InvalidCellPopover = "InvalidCellPopover",
  EmptyTarget = "EmptyTarget",
  InvalidFreezeQuantity = "InvalidFreezeQuantity",
  FrozenPaneOverlap = "FrozenPaneOverlap",
  ValuesNotChanged = "ValuesNotChanged",
  InvalidFilterZone = "InvalidFilterZone",
  TableNotFound = "TableNotFound",
  TableOverlap = "TableOverlap",
  InvalidTableConfig = "InvalidTableConfig",
  InvalidTableStyle = "InvalidTableStyle",
  FilterNotFound = "FilterNotFound",
  MergeInTable = "MergeInTable",
  NonContinuousTargets = "NonContinuousTargets",
  DuplicatedFigureId = "DuplicatedFigureId",
  InvalidSelectionStep = "InvalidSelectionStep",
  DuplicatedChartId = "DuplicatedChartId",
  ChartDoesNotExist = "ChartDoesNotExist",
  InvalidHeaderIndex = "InvalidHeaderIndex",
  InvalidQuantity = "InvalidQuantity",
  MoreThanOneColumnSelected = "MoreThanOneColumnSelected",
  EmptySplitSeparator = "EmptySplitSeparator",
  SplitWillOverwriteContent = "SplitWillOverwriteContent",
  NoSplitSeparatorInSelection = "NoSplitSeparatorInSelection",
  NoActiveSheet = "NoActiveSheet",
  InvalidLocale = "InvalidLocale",
  MoreThanOneRangeSelected = "MoreThanOneRangeSelected",
  NoColumnsProvided = "NoColumnsProvided",
  ColumnsNotIncludedInZone = "ColumnsNotIncludedInZone",
  DuplicatesColumnsSelected = "DuplicatesColumnsSelected",
  InvalidHeaderGroupStartEnd = "InvalidHeaderGroupStartEnd",
  HeaderGroupAlreadyExists = "HeaderGroupAlreadyExists",
  UnknownHeaderGroup = "UnknownHeaderGroup",
  UnknownDataValidationRule = "UnknownDataValidationRule",
  UnknownDataValidationCriterionType = "UnknownDataValidationCriterionType",
  InvalidDataValidationCriterionValue = "InvalidDataValidationCriterionValue",
  InvalidNumberOfCriterionValues = "InvalidNumberOfCriterionValues",
  InvalidCopyPasteSelection = "InvalidCopyPasteSelection",
  NoChanges = "NoChanges",
  InvalidInputId = "InvalidInputId",
  SheetIsHidden = "SheetIsHidden",
  InvalidTableResize = "InvalidTableResize",
  PivotIdNotFound = "PivotIdNotFound",
  PivotInError = "PivotInError",
  EmptyName = "EmptyName",
  ValueCellIsInvalidFormula = "ValueCellIsInvalidFormula",
  InvalidDefinition = "InvalidDefinition",
  InvalidColor = "InvalidColor",
  InvalidPivotDataSet = "InvalidPivotDataSet",
  InvalidPivotCustomField = "InvalidPivotCustomField",
  MissingFigureArguments = "MissingFigureArguments",
  InvalidCarouselItem = "InvalidCarouselItem",
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

export type CoreViewCommand =
  | CoreCommand
  | EvaluateCellsCommand
  | EvaluateChartsCommand
  | UndoCommand
  | RedoCommand;
export type CoreViewCommandTypes = CoreViewCommand["type"];
