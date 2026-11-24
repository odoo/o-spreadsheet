import { FORBIDDEN_SHEETNAME_CHARS_IN_EXCEL_REGEX } from "../../constants";
import { iterateOverPosition } from "../../helpers/cells/cell_evaluation";
import { isColorValid } from "../../helpers/color";
import {
  deepCopy,
  groupConsecutive,
  includesAll,
  isDefined,
  largeMax,
  largeMin,
  range,
} from "../../helpers/misc";
import { recomputeZones } from "../../helpers/recompute_zones";
import {
  createDefaultRows,
  getDuplicateSheetName,
  getNextSheetName,
  isSheetNameEqual,
  toStandardizedSheetName,
} from "../../helpers/sheet";
import { isZoneInside, isZoneValid, toZone } from "../../helpers/zones";
import {
  AddColumnsRowsCommand,
  ColorSheetBackgroundCommand,
  ColorSheetCommand,
  Command,
  CommandResult,
  CoreCommand,
  CreateSheetCommand,
  DuplicateSheetCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
  HideSheetCommand,
  LockSheetCommand,
  MoveSheetCommand,
  RemoveColumnsRowsCommand,
  RenameSheetCommand,
  SetGridLinesVisibilityCommand,
  ShowSheetCommand,
  UnfreezeColumnsCommand,
  UnfreezeColumnsRowsCommand,
  UnfreezeRowsCommand,
  UnlockSheetCommand,
  UpdateCellPositionCommand,
  isRangeDependant,
  isTargetDependent,
} from "../../types/commands";
import {
  CellPosition,
  Dimension,
  HeaderIndex,
  PaneDivision,
  Row,
  Sheet,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../../types/misc";
import type { BoundedRange } from "../../types/range";
import { ExcelWorkbookData, SheetData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface SheetState {
  readonly sheets: Record<UID, Sheet | undefined>;
  readonly orderedSheetIds: UID[];
  readonly sheetIdsMapName: Record<string, UID | undefined>;
  readonly cellPosition: Record<number, CellPosition | undefined>;
}

export class SheetPlugin extends CorePlugin<typeof SheetPlugin, SheetState> implements SheetState {
  static readonly dependencies = [] as const;
  static getters = [
    "getSheetName",
    "tryGetSheetName",
    "getSheet",
    "tryGetSheet",
    "getSheetIdByName",
    "getSheetIds",
    "getVisibleSheetIds",
    "getInvisibleSheetIds",
    "isSheetVisible",
    "doesHeaderExist",
    "doesHeadersExist",
    "getCellPosition",
    "getColsZone",
    "getRowCellIds",
    "getColCellIds",
    "getZoneCellIds",
    "getZonesCellIds",
    "getRowsZone",
    "getNumberCols",
    "getNumberRows",
    "getNumberHeaders",
    "getGridLinesVisibility",
    "getNextSheetName",
    "getSheetSize",
    "getSheetZone",
    "getPaneDivisions",
    "getUnboundedZone",
    "getCommandBoundedRange",
    "checkElementsIncludeAllNonFrozenHeaders",
    "getDuplicateSheetName",
    "tryGetCellPosition",
    "isSheetLocked",
    "checkRangesExistInSheet",
  ] as const;

  readonly sheetIdsMapName: Record<string, UID | undefined> = {};
  readonly orderedSheetIds: UID[] = [];
  readonly sheets: Record<UID, Sheet | undefined> = {};
  readonly cellPosition: Record<number, CellPosition | undefined> = {};

  /**
   * `checkSheetIsValid` applies to every core command. Command specific validators
   * chain it first, so a command is never rejected for a specific reason while the
   * sheet it targets does not even exist.
   */
  validators = {
    "*allCommands": this.chainValidations(
      this.warnDeprecatedMissingSheetName,
      this.checkSheetIsValid
    ),
    HIDE_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkEnoughVisibleSheets),
    CREATE_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkCreateSheet),
    DUPLICATE_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkDuplicateSheet),
    MOVE_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkMoveSheet),
    RENAME_SHEET: this.chainValidations(this.checkSheetIsValid, this.isRenameAllowed),
    COLOR_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkSheetColor),
    SET_SHEET_BACKGROUND_COLOR: this.chainValidations(this.checkSheetIsValid, this.checkSheetColor),
    DELETE_SHEET: this.chainValidations(this.checkSheetIsValid, this.checkEnoughVisibleSheets),
    ADD_COLUMNS_ROWS: this.chainValidations(this.checkSheetIsValid, this.checkAddHeaders),
    REMOVE_COLUMNS_ROWS: this.chainValidations(this.checkSheetIsValid, this.checkRemoveHeaders),
    FREEZE_ROWS: this.chainValidations(this.checkSheetIsValid, this.checkRowFreezeQuantity),
    FREEZE_COLUMNS: this.chainValidations(this.checkSheetIsValid, this.checkColFreezeQuantity),
  };

  private checkSheetIsValid(cmd: CoreCommand) {
    return this.chainValidations(this.checkSheetExists, this.checkRangesAreInSheet)(cmd);
  }

  private warnDeprecatedMissingSheetName(cmd: CoreCommand) {
    let sheetNameMissing = false;
    switch (cmd.type) {
      case "CREATE_SHEET":
        if (cmd.name === undefined) {
          sheetNameMissing = true;
        }
        break;
      case "DELETE_SHEET":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "MOVE_RANGES":
        if (cmd.sheetName === undefined) {
          sheetNameMissing = true;
        }
        break;
    }
    if (sheetNameMissing) {
      console.warn(
        "Deprecation Warning: Sheet name is missing in the command %s payload.",
        cmd.type
      );
    }
    return CommandResult.Success;
  }

  private checkEnoughVisibleSheets() {
    return this.getVisibleSheetIds().length > 1
      ? CommandResult.Success
      : CommandResult.NotEnoughSheets;
  }

  private checkCreateSheet(cmd: CreateSheetCommand) {
    return this.checkValidations(
      cmd,
      this.createSheetHasName,
      this.checkSheetName,
      this.checkSheetPosition
    );
  }

  private checkDuplicateSheet(cmd: DuplicateSheetCommand) {
    if (this.sheets[cmd.sheetIdTo]) {
      return CommandResult.DuplicatedSheetId;
    }
    if (this.orderedSheetIds.map(this.getSheetName.bind(this)).includes(cmd.sheetNameTo)) {
      return CommandResult.DuplicatedSheetName;
    }
    return CommandResult.Success;
  }

  private checkMoveSheet(cmd: MoveSheetCommand) {
    try {
      const currentIndex = this.orderedSheetIds.findIndex((id) => id === cmd.sheetId);
      this.findIndexOfTargetSheet(currentIndex, cmd.delta);
      return CommandResult.Success;
    } catch (e) {
      return CommandResult.WrongSheetMove;
    }
  }

  private checkSheetColor(cmd: ColorSheetCommand | ColorSheetBackgroundCommand) {
    return !cmd.color || isColorValid(cmd.color)
      ? CommandResult.Success
      : CommandResult.InvalidColor;
  }

  private checkAddHeaders(cmd: AddColumnsRowsCommand) {
    if (!this.doesHeaderExist(cmd.sheetId, cmd.dimension, cmd.base)) {
      return CommandResult.InvalidHeaderIndex;
    }
    return cmd.quantity <= 0 ? CommandResult.InvalidQuantity : CommandResult.Success;
  }

  private checkRemoveHeaders(cmd: RemoveColumnsRowsCommand) {
    const min = largeMin(cmd.elements);
    const max = largeMax(cmd.elements);
    if (min < 0 || !this.doesHeaderExist(cmd.sheetId, cmd.dimension, max)) {
      return CommandResult.InvalidHeaderIndex;
    }
    return this.checkElementsIncludeAllNonFrozenHeaders(cmd.sheetId, cmd.dimension, cmd.elements)
      ? CommandResult.NotEnoughElements
      : CommandResult.Success;
  }

  handlers = {
    SET_SHEET_BACKGROUND_COLOR: this.onSetSheetBackgroundColor,
    SET_GRID_LINES_VISIBILITY: this.onSetGridLinesVisibility,
    MOVE_SHEET: this.onMoveSheet,
    LOCK_SHEET: this.onLockSheet,
    UNLOCK_SHEET: this.onUnlockSheet,
    FREEZE_COLUMNS: this.onFreezeColumns,
    FREEZE_ROWS: this.onFreezeRows,
    UNFREEZE_ROWS: this.onUnfreezeRows,
    UNFREEZE_COLUMNS: this.onUnfreezeColumns,
    UNFREEZE_COLUMNS_ROWS: this.onUnfreezeColumnsRows,
    SHOW_SHEET: this.onShowSheet,
    HIDE_SHEET: this.onHideSheet,
    COLOR_SHEET: this.onColorSheet,
    UPDATE_CELL_POSITION: this.onUpdateCellPosition,
    RENAME_SHEET: this.onRenameSheet,
    CREATE_SHEET: this.onCreateSheet,
    DUPLICATE_SHEET: this.onDuplicateSheet,
    DELETE_SHEET: this.onDeleteSheet,
    ADD_COLUMNS_ROWS: this.onAddColumnsRows,
    REMOVE_COLUMNS_ROWS: this.onRemoveColumnsRows,
  };

  private onRemoveColumnsRows(cmd: RemoveColumnsRowsCommand) {
    if (cmd.dimension === "COL") {
      this.removeColumns(this.sheets[cmd.sheetId]!, [...cmd.elements]);
    } else {
      this.removeRows(this.sheets[cmd.sheetId]!, [...cmd.elements]);
    }
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    if (cmd.dimension === "COL") {
      this.addColumns(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
    } else {
      this.addRows(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
    }
  }

  private onDeleteSheet(cmd: { sheetId: UID }) {
    this.deleteSheet(this.sheets[cmd.sheetId]!);
  }

  private onDuplicateSheet(cmd: DuplicateSheetCommand) {
    this.duplicateSheet(cmd.sheetId, cmd.sheetIdTo, cmd.sheetNameTo);
  }

  private onSetGridLinesVisibility(cmd: SetGridLinesVisibilityCommand) {
    this.setGridLinesVisibility(cmd.sheetId, cmd.areGridLinesVisible);
  }

  private onSetSheetBackgroundColor(cmd: ColorSheetBackgroundCommand) {
    this.history.update("sheets", cmd.sheetId, "backgroundColor", cmd.color);
  }

  private onMoveSheet(cmd: MoveSheetCommand) {
    this.moveSheet(cmd.sheetId, cmd.delta);
  }

  private onLockSheet(cmd: LockSheetCommand) {
    this.history.update("sheets", cmd.sheetId, "isLocked", true);
  }

  private onUnlockSheet(cmd: UnlockSheetCommand) {
    this.history.update("sheets", cmd.sheetId, "isLocked", false);
  }

  private onFreezeColumns(cmd: FreezeColumnsCommand) {
    this.setPaneDivisions(cmd.sheetId, cmd.quantity, "COL");
  }

  private onFreezeRows(cmd: FreezeRowsCommand) {
    this.setPaneDivisions(cmd.sheetId, cmd.quantity, "ROW");
  }

  private onUnfreezeRows(cmd: UnfreezeRowsCommand) {
    this.setPaneDivisions(cmd.sheetId, 0, "ROW");
  }

  private onUnfreezeColumns(cmd: UnfreezeColumnsCommand) {
    this.setPaneDivisions(cmd.sheetId, 0, "COL");
  }

  private onUnfreezeColumnsRows(cmd: UnfreezeColumnsRowsCommand) {
    this.setPaneDivisions(cmd.sheetId, 0, "COL");
    this.setPaneDivisions(cmd.sheetId, 0, "ROW");
  }

  private onShowSheet(cmd: ShowSheetCommand) {
    this.showSheet(cmd.sheetId);
  }

  private onHideSheet(cmd: HideSheetCommand) {
    this.hideSheet(cmd.sheetId);
  }

  private onCreateSheet(cmd: CreateSheetCommand) {
    const sheet = this.createSheet(
      cmd.sheetId,
      cmd.name || this.getNextSheetName(),
      cmd.cols || 26,
      cmd.rows || 100,
      cmd.position
    );
    this.history.update("sheetIdsMapName", toStandardizedSheetName(sheet.name), sheet.id);
  }

  private onRenameSheet(cmd: RenameSheetCommand) {
    this.renameSheet(this.sheets[cmd.sheetId]!, cmd.newName);
  }

  private onColorSheet(cmd: ColorSheetCommand) {
    this.history.update("sheets", cmd.sheetId, "color", cmd.color);
  }

  private onUpdateCellPosition(cmd: UpdateCellPositionCommand) {
    this.updateCellPosition(cmd);
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (const sheet of data.sheets) {
      this.sheetIdsMapName[toStandardizedSheetName(sheet.name)] = sheet.id;
    }

    for (const sheetData of data.sheets) {
      const name = sheetData.name || "Sheet" + (Object.keys(this.sheets).length + 1);
      const { colNumber, rowNumber } = this.getImportedSheetSize(sheetData);
      const sheet: Sheet = {
        id: sheetData.id,
        name: name,
        numberOfCols: colNumber,
        numberOfRows: rowNumber,
        rows: createDefaultRows(rowNumber),
        areGridLinesVisible:
          sheetData.areGridLinesVisible === undefined ? true : sheetData.areGridLinesVisible,
        isVisible: sheetData.isVisible,
        panes: {
          xSplit: sheetData.panes?.xSplit || 0,
          ySplit: sheetData.panes?.ySplit || 0,
        },
        color: sheetData.color,
        backgroundColor: sheetData.backgroundColor,
        isLocked: sheetData.isLocked,
      };
      this.orderedSheetIds.push(sheet.id);
      this.sheets[sheet.id] = sheet;
    }
  }

  private exportSheets(data: WorkbookData) {
    data.sheets = this.orderedSheetIds.filter(isDefined).map((id) => {
      const sheet = this.sheets[id]!;
      const sheetData: SheetData = {
        id: sheet.id,
        name: sheet.name,
        colNumber: sheet.numberOfCols,
        rowNumber: this.getters.getNumberRows(sheet.id),
        rows: {},
        cols: {},
        merges: [],
        cells: {},
        styles: {},
        formats: {},
        borders: {},
        conditionalFormats: [],
        dataValidationRules: [],
        figures: [],
        tables: [],
        areGridLinesVisible:
          sheet.areGridLinesVisible === undefined ? true : sheet.areGridLinesVisible,
        isVisible: sheet.isVisible,
        isLocked: sheet.isLocked,
        color: sheet.color,
        backgroundColor: sheet.backgroundColor,
      };
      if (sheet.panes.xSplit || sheet.panes.ySplit) {
        sheetData.panes = sheet.panes;
      }
      return sheetData;
    });
  }

  export(data: WorkbookData) {
    this.exportSheets(data);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.exportSheets(data);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getGridLinesVisibility(sheetId: UID): boolean {
    return this.getSheet(sheetId).areGridLinesVisible;
  }

  isSheetLocked(sheetId: UID): boolean {
    return this.tryGetSheet(sheetId)?.isLocked || false;
  }

  tryGetSheet(sheetId: UID): Sheet | undefined {
    return this.sheets[sheetId];
  }

  getSheet(sheetId: UID): Sheet {
    const sheet = this.sheets[sheetId];
    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found.`);
    }
    return sheet;
  }

  isSheetVisible(sheetId: UID): boolean {
    return this.getSheet(sheetId).isVisible;
  }

  /**
   * Return the sheet name. Throw if the sheet is not found.
   */
  getSheetName(sheetId: UID): string {
    return this.getSheet(sheetId).name;
  }

  /**
   * Return the sheet name or undefined if the sheet doesn't exist.
   */
  tryGetSheetName(sheetId: UID): string | undefined {
    return this.tryGetSheet(sheetId)?.name;
  }

  getSheetIdByName(name: string | undefined): UID | undefined {
    if (name) {
      return this.sheetIdsMapName[toStandardizedSheetName(name)];
    }
    return undefined;
  }

  getSheetIds(): UID[] {
    return this.orderedSheetIds;
  }

  getVisibleSheetIds(): UID[] {
    return this.orderedSheetIds.filter(this.isSheetVisible.bind(this));
  }

  getInvisibleSheetIds(): UID[] {
    return this.orderedSheetIds.filter((id) => !this.isSheetVisible(id));
  }

  doesHeaderExist(sheetId: UID, dimension: Dimension, index: number) {
    return dimension === "COL"
      ? index >= 0 && index < this.getNumberCols(sheetId)
      : index >= 0 && index < this.getNumberRows(sheetId);
  }

  doesHeadersExist(sheetId: UID, dimension: Dimension, headerIndexes: HeaderIndex[]): boolean {
    return headerIndexes.every((index) => this.doesHeaderExist(sheetId, dimension, index));
  }

  getColsZone(sheetId: UID, start: HeaderIndex, end: HeaderIndex): Zone {
    return {
      top: 0,
      bottom: this.getNumberRows(sheetId) - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(sheetId: UID, start: HeaderIndex, end: HeaderIndex): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.getSheet(sheetId).numberOfCols - 1,
    };
  }

  getZonesCellIds(
    sheetId: UID,
    zones: UnboundedZone[],
    options: { rowsOrder?: number; colOrder?: number } = {}
  ): number[] {
    return recomputeZones(zones)
      .map((zone) => this.getZoneCellIds(sheetId, zone, options))
      .flat();
  }

  getZoneCellIds(
    sheetId: UID,
    zone: UnboundedZone,
    options: { rowsOrder?: number; colOrder?: number } = {}
  ): number[] {
    const sheet = this.tryGetSheet(sheetId);
    if (!sheet) {
      return [];
    }

    if (iterateOverPosition(zone)) {
      const cellIds: number[] = [];
      const [colStart, colAdd] = (options.colOrder ?? 1) > 0 ? [zone.left, 1] : [zone.right, -1];
      const [rowStart, rowAdd] = (options.rowsOrder ?? 1) > 0 ? [zone.top, 1] : [zone.bottom, -1];
      for (let col = colStart; zone.left <= col && col <= zone.right; col += colAdd) {
        for (let row = rowStart; zone.top <= row && row <= zone.bottom; row += rowAdd) {
          const id = this.sheets[sheetId]?.rows[row]?.cells[col];
          if (id !== undefined) {
            cellIds.push(id);
          }
        }
      }
      return cellIds;
    }

    const ids: number[] = [];
    const rows: [number, Row | undefined][] = Object.entries(sheet.rows).map((x) => [
      parseInt(x[0]),
      x[1],
    ]);
    const rowOrder = options.rowsOrder;
    const colOrder = options.colOrder;
    if (rowOrder) {
      rows.sort((a, b) => (b[0] > a[0] ? rowOrder : -rowOrder));
    }
    for (const [rowIndex, row] of rows) {
      if (!row || !this.indexInRange(rowIndex, zone.top, zone.bottom)) {
        continue;
      }
      const cols: [number, number | undefined][] = Object.entries(row.cells).map((x) => [
        parseInt(x[0]),
        x[1],
      ]);
      if (colOrder) {
        cols.sort((a, b) => (b[0] > a[0] ? colOrder : -colOrder));
      }
      for (const [colIndex, cellId] of cols) {
        if (cellId === undefined || !this.indexInRange(colIndex, zone.left, zone.right)) {
          continue;
        }
        ids.push(cellId);
      }
    }
    return ids;
  }

  private indexInRange(index: HeaderIndex, start: HeaderIndex, end: HeaderIndex | undefined) {
    return start <= index && (end === undefined || index <= end);
  }

  getColCellIds(sheetId: UID, col: HeaderIndex): number[] {
    return this.getZoneCellIds(sheetId, this.getColsZone(sheetId, col, col));
  }

  getRowCellIds(sheetId: UID, row: HeaderIndex): number[] {
    return Object.values(this.getSheet(sheetId).rows[row]?.cells ?? []).filter(isDefined);
  }

  getCellPosition(cellId: number): CellPosition {
    const cell = this.cellPosition[cellId];
    if (!cell) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return cell;
  }

  tryGetCellPosition(cellId: number): CellPosition | undefined {
    return this.cellPosition[cellId];
  }

  getNumberCols(sheetId: UID) {
    return this.getSheet(sheetId).numberOfCols;
  }

  getNumberRows(sheetId: UID) {
    return this.getSheet(sheetId).numberOfRows;
  }

  getNumberHeaders(sheetId: UID, dimension: Dimension): HeaderIndex {
    return dimension === "COL" ? this.getNumberCols(sheetId) : this.getNumberRows(sheetId);
  }

  getNextSheetName(baseName = "Sheet"): string {
    const names = this.orderedSheetIds.map(this.getSheetName.bind(this));
    return getNextSheetName(names, baseName);
  }

  getSheetSize(sheetId: UID): ZoneDimension {
    return {
      numberOfRows: this.getNumberRows(sheetId),
      numberOfCols: this.getNumberCols(sheetId),
    };
  }

  getSheetZone(sheetId: UID): Zone {
    return {
      top: 0,
      left: 0,
      bottom: this.getNumberRows(sheetId) - 1,
      right: this.getNumberCols(sheetId) - 1,
    };
  }

  /**
   * Return the zone with unbounded bottom and/or right if the zone takes the whole sheet in that dimension.
   *
   * @param allowUnboundedHeader if true, the zone will be considered unbounded if it reaches the last row/column,
   * even if it doesn't start at the first row/column (eg. A5:A100 -> A5:A).
   */
  getUnboundedZone(
    sheetId: UID,
    zone: Zone | UnboundedZone,
    allowUnboundedHeader = false
  ): UnboundedZone {
    if (zone.bottom === undefined || zone.right === undefined) {
      return zone;
    }
    const isFullRow = allowUnboundedHeader
      ? zone.right === this.getNumberCols(sheetId) - 1
      : zone.left === 0 && zone.right === this.getNumberCols(sheetId) - 1;
    const isFullCol = allowUnboundedHeader
      ? zone.bottom === this.getNumberRows(sheetId) - 1
      : zone.top === 0 && zone.bottom === this.getNumberRows(sheetId) - 1;
    return {
      ...zone,
      bottom: isFullCol ? undefined : zone.bottom,
      // cannot be unbounded in the 2 dimensions at once
      right: isFullRow && !isFullCol ? undefined : zone.right,
    };
  }

  getPaneDivisions(sheetId: UID): Readonly<PaneDivision> {
    return this.getSheet(sheetId).panes;
  }

  private setPaneDivisions(sheetId: UID, base: HeaderIndex, dimension: Dimension) {
    const panes = { ...this.getPaneDivisions(sheetId) };
    if (dimension === "COL") {
      panes.xSplit = base;
    } else if (dimension === "ROW") {
      panes.ySplit = base;
    }
    this.history.update("sheets", sheetId, "panes", panes);
  }

  /**
   * Checks if all non-frozen header indices are present in the provided elements of selected rows/columns.
   * This validation ensures that all rows or columns cannot be deleted when frozen panes exist.
   */
  checkElementsIncludeAllNonFrozenHeaders(
    sheetId: UID,
    dimension: Dimension,
    elements: HeaderIndex[]
  ): boolean {
    const paneDivisions = this.getters.getPaneDivisions(sheetId);
    const startIndex = dimension === "ROW" ? paneDivisions.ySplit : paneDivisions.xSplit;
    const endIndex = this.getters.getNumberHeaders(sheetId, dimension);

    if (!startIndex) {
      return false;
    }

    const indicesToCheck = range(startIndex, endIndex);
    return includesAll(elements, indicesToCheck);
  }

  getCommandBoundedRange(defaultSheetId: UID, cmd: Command): BoundedRange[] {
    defaultSheetId = "sheetId" in cmd ? cmd.sheetId : defaultSheetId;
    const ranges: BoundedRange[] = [];
    if ("zone" in cmd) {
      ranges.push({ zone: cmd.zone, sheetId: defaultSheetId });
    }
    if ("target" in cmd) {
      ranges.push(...cmd.target.map((zone) => ({ zone, sheetId: defaultSheetId })));
    }
    if ("ranges" in cmd) {
      ranges.push(
        ...cmd.ranges.map((rangeData) => {
          const range = this.getters.getRangeFromRangeData(rangeData);
          return {
            zone: range.zone,
            sheetId: range.sheetId,
          };
        })
      );
    }
    if ("col" in cmd && cmd.col !== undefined && "row" in cmd && cmd.row !== undefined) {
      ranges.push({
        zone: {
          top: cmd.row,
          left: cmd.col,
          bottom: cmd.row,
          right: cmd.col,
        },
        sheetId: defaultSheetId,
      });
    }
    return ranges;
  }

  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  /**
   * Check if { zone, sheetId } combinations are well formed and
   * not outside the sheet.
   */
  checkRangesExistInSheet(ranges: BoundedRange[]): CommandResult {
    if (!ranges.every((r) => isZoneValid(r.zone))) {
      return CommandResult.InvalidRange;
    }

    if (ranges.length) {
      const res = ranges.every((range) => {
        const { zone, sheetId } = range;
        const sheetZone = this.getSheetZone(sheetId);
        return isZoneInside(zone, sheetZone);
      })
        ? CommandResult.Success
        : CommandResult.TargetOutOfSheet;
      return res;
    }
    return CommandResult.Success;
  }

  private updateCellPosition(cmd: Omit<UpdateCellPositionCommand, "type">) {
    const { sheetId, cellId, col, row } = cmd;
    if (cellId) {
      this.setNewPosition(cellId, sheetId, col, row);
    } else {
      this.clearPosition(sheetId, col, row);
    }
  }

  /**
   * Set the cell at a new position and clear its previous position.
   */
  private setNewPosition(cellId: number, sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    const currentPosition = this.cellPosition[cellId];
    if (currentPosition) {
      this.clearPosition(sheetId, currentPosition.col, currentPosition.row);
    }
    this.history.update("cellPosition", cellId, {
      row: row,
      col: col,
      sheetId: sheetId,
    });
    this.history.update("sheets", sheetId, "rows", row, "cells", col, cellId);
  }

  /**
   * Remove the cell at the given position (if there's one)
   */
  private clearPosition(sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    const cellId = this.sheets[sheetId]?.rows[row].cells[col];
    if (cellId) {
      this.history.update("cellPosition", cellId, undefined);
      this.history.update("sheets", sheetId, "rows", row, "cells", col, undefined);
    }
  }

  private setGridLinesVisibility(sheetId: UID, areGridLinesVisible: boolean) {
    this.history.update("sheets", sheetId, "areGridLinesVisible", areGridLinesVisible);
  }

  private createSheet(
    id: UID,
    name: string,
    colNumber: number,
    rowNumber: number,
    position: number
  ): Sheet {
    const sheet: Sheet = {
      id,
      name,
      numberOfCols: colNumber,
      numberOfRows: rowNumber,
      rows: createDefaultRows(rowNumber),
      areGridLinesVisible: true,
      isVisible: true,
      panes: {
        xSplit: 0,
        ySplit: 0,
      },
      isLocked: false,
    };
    const orderedSheetIds = this.orderedSheetIds.slice();
    orderedSheetIds.splice(position, 0, sheet.id);
    const sheets = this.sheets;
    this.history.update("orderedSheetIds", orderedSheetIds);
    this.history.update("sheets", Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet;
  }

  private moveSheet(sheetId: UID, delta: number) {
    const orderedSheetIds = this.orderedSheetIds.slice();
    const currentIndex = orderedSheetIds.findIndex((id) => id === sheetId);
    const sheet = orderedSheetIds.splice(currentIndex, 1);
    const index = this.findIndexOfTargetSheet(currentIndex, delta);
    orderedSheetIds.splice(index, 0, sheet[0]);
    this.history.update("orderedSheetIds", orderedSheetIds);
  }

  private findIndexOfTargetSheet(currentIndex: HeaderIndex, deltaIndex: number): number {
    while (deltaIndex !== 0 && 0 <= currentIndex && currentIndex <= this.orderedSheetIds.length) {
      if (deltaIndex > 0) {
        currentIndex++;
        if (this.isSheetVisible(this.orderedSheetIds[currentIndex])) {
          deltaIndex--;
        }
      } else if (deltaIndex < 0) {
        currentIndex--;
        if (this.isSheetVisible(this.orderedSheetIds[currentIndex])) {
          deltaIndex++;
        }
      }
    }
    if (deltaIndex === 0) {
      return currentIndex;
    }
    throw new Error("There is not enough visible sheets");
  }

  private createSheetHasName(cmd: CreateSheetCommand): CommandResult {
    if (cmd.name !== undefined && !cmd.name.trim()) {
      return CommandResult.MissingSheetName;
    }
    return CommandResult.Success;
  }

  private checkSheetName(cmd: RenameSheetCommand | CreateSheetCommand): CommandResult {
    const originalSheetName = this.getters.tryGetSheetName(cmd.sheetId);
    const sheetName = cmd.type === "RENAME_SHEET" ? cmd.newName : cmd.name;
    if (originalSheetName !== undefined && sheetName === originalSheetName) {
      return CommandResult.UnchangedSheetName;
    }

    const { orderedSheetIds, sheets } = this;
    const name = sheetName && sheetName.trim().toLowerCase();
    if (
      orderedSheetIds.find((id) => isSheetNameEqual(sheets[id]?.name, name) && id !== cmd.sheetId)
    ) {
      return CommandResult.DuplicatedSheetName;
    }
    if (FORBIDDEN_SHEETNAME_CHARS_IN_EXCEL_REGEX.test(name!)) {
      return CommandResult.ForbiddenCharactersInSheetName;
    }
    return CommandResult.Success;
  }

  private checkSheetPosition(cmd: CreateSheetCommand) {
    const { orderedSheetIds } = this;
    if (cmd.position > orderedSheetIds.length || cmd.position < 0) {
      return CommandResult.WrongSheetPosition;
    }
    return CommandResult.Success;
  }

  private checkRowFreezeQuantity(cmd: FreezeRowsCommand): CommandResult {
    return cmd.quantity >= 1 && cmd.quantity < this.getNumberRows(cmd.sheetId)
      ? CommandResult.Success
      : CommandResult.InvalidFreezeQuantity;
  }

  private checkColFreezeQuantity(cmd: FreezeColumnsCommand): CommandResult {
    return cmd.quantity >= 1 && cmd.quantity < this.getNumberCols(cmd.sheetId)
      ? CommandResult.Success
      : CommandResult.InvalidFreezeQuantity;
  }

  private isRenameAllowed(cmd: RenameSheetCommand): CommandResult {
    const name = cmd.newName && cmd.newName.trim().toLowerCase();
    if (!name) {
      return CommandResult.MissingSheetName;
    }
    return this.checkSheetName(cmd);
  }

  private renameSheet(sheet: Sheet, name: string) {
    const oldName = sheet.name;
    this.history.update("sheets", sheet.id, "name", name.trim());
    const sheetIdsMapName = Object.assign({}, this.sheetIdsMapName);
    delete sheetIdsMapName[toStandardizedSheetName(oldName)];
    sheetIdsMapName[toStandardizedSheetName(name)] = sheet.id;
    this.history.update("sheetIdsMapName", sheetIdsMapName);
  }

  private hideSheet(sheetId: UID) {
    this.history.update("sheets", sheetId, "isVisible", false);
  }

  private showSheet(sheetId: UID) {
    this.history.update("sheets", sheetId, "isVisible", true);
  }

  private duplicateSheet(fromId: UID, toId: UID, toName: string) {
    const sheet = this.getSheet(fromId);
    const newSheet: Sheet = deepCopy(sheet);
    newSheet.id = toId;
    newSheet.name = toName;
    newSheet.isLocked = false;
    for (let col = 0; col <= newSheet.numberOfCols; col++) {
      for (let row = 0; row <= newSheet.numberOfRows; row++) {
        if (newSheet.rows[row]) {
          newSheet.rows[row].cells[col] = undefined;
        }
      }
    }
    const orderedSheetIds = this.orderedSheetIds.slice();
    const currentIndex = orderedSheetIds.indexOf(fromId);
    orderedSheetIds.splice(currentIndex + 1, 0, newSheet.id);
    this.history.update("orderedSheetIds", orderedSheetIds);
    this.history.update("sheets", Object.assign({}, this.sheets, { [newSheet.id]: newSheet }));

    const sheetIdsMapName = Object.assign({}, this.sheetIdsMapName);
    sheetIdsMapName[toStandardizedSheetName(newSheet.name)] = newSheet.id;
    this.history.update("sheetIdsMapName", sheetIdsMapName);
  }

  getDuplicateSheetName(sheetName: string) {
    const names = this.orderedSheetIds.map(this.getSheetName.bind(this));
    return getDuplicateSheetName(sheetName, names);
  }

  private deleteSheet(sheet: Sheet) {
    const name = sheet.name;
    const sheets = Object.assign({}, this.sheets);
    delete sheets[sheet.id];
    this.history.update("sheets", sheets);

    const orderedSheetIds = this.orderedSheetIds.slice();
    const currentIndex = orderedSheetIds.indexOf(sheet.id);
    orderedSheetIds.splice(currentIndex, 1);

    this.history.update("orderedSheetIds", orderedSheetIds);
    const sheetIdsMapName = Object.assign({}, this.sheetIdsMapName);
    delete sheetIdsMapName[toStandardizedSheetName(name)];
    this.history.update("sheetIdsMapName", sheetIdsMapName);
  }

  /**
   * Delete column. This requires a lot of handling:
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheet ID of the sheet on which deletion should be applied
   * @param columns Columns to delete
   */
  private removeColumns(sheet: Sheet, columns: HeaderIndex[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (const group of groupConsecutive(columns)) {
      const from = group[group.length - 1];
      const to = group[0];
      // Move the cells.
      this.moveCellOnColumnsDeletion(sheet, from, to);
    }
    const numberOfCols = this.sheets[sheet.id]!.numberOfCols;
    this.history.update("sheets", sheet.id, "numberOfCols", numberOfCols - columns.length);
    const count = columns.filter((col) => col < sheet.panes.xSplit).length;
    if (count) {
      this.setPaneDivisions(sheet.id, sheet.panes.xSplit - count, "COL");
    }
  }

  /**
   * Delete row. This requires a lot of handling:
   * - Update the merges
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheet ID of the sheet on which deletion should be applied
   * @param rows Rows to delete
   */
  private removeRows(sheet: Sheet, rows: HeaderIndex[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    for (const group of groupConsecutive(rows)) {
      // indexes are sorted in the descending order
      const from = group[group.length - 1];
      const to = group[0];
      // Move the cells.
      this.moveCellOnRowsDeletion(sheet, from, to);
    }
    const count = rows.filter((row) => row < sheet.panes.ySplit).length;
    if (count) {
      this.setPaneDivisions(sheet.id, sheet.panes.ySplit - count, "ROW");
    }
    const numberOfRows = this.sheets[sheet.id]!.numberOfRows;
    this.history.update("sheets", sheet.id, "numberOfRows", numberOfRows - rows.length);
  }

  private addColumns(
    sheet: Sheet,
    column: HeaderIndex,
    position: "before" | "after",
    quantity: number
  ) {
    const index = position === "before" ? column : column + 1;
    // Move the cells.
    this.shiftZone(
      sheet.id,
      {
        left: index,
        right: undefined,
        top: 0,
        bottom: undefined,
      },
      quantity,
      0
    );

    const numberOfCols = this.sheets[sheet.id]!.numberOfCols;
    this.history.update("sheets", sheet.id, "numberOfCols", numberOfCols + quantity);
    if (index < sheet.panes.xSplit) {
      this.setPaneDivisions(sheet.id, sheet.panes.xSplit + quantity, "COL");
    }
  }

  private addRows(sheet: Sheet, row: HeaderIndex, position: "before" | "after", quantity: number) {
    const index = position === "before" ? row : row + 1;
    // Move the cells.
    this.shiftZone(
      sheet.id,
      {
        left: 0,
        right: undefined,
        top: index,
        bottom: undefined,
      },
      0,
      quantity
    );

    const numberOfRows = this.sheets[sheet.id]!.numberOfRows;
    this.history.update("sheets", sheet.id, "numberOfRows", numberOfRows + quantity);
    if (index < sheet.panes.ySplit) {
      this.setPaneDivisions(sheet.id, sheet.panes.ySplit + quantity, "ROW");
    }
  }

  private moveCellOnColumnsDeletion(
    sheet: Sheet,
    deletedColumnFrom: number,
    deletedColumnTo: number
  ) {
    this.dispatch("CLEAR_CELLS", {
      sheetId: sheet.id,
      target: [
        {
          left: deletedColumnFrom,
          top: 0,
          right: deletedColumnTo,
          bottom: sheet.numberOfRows,
        },
      ],
    });
    this.shiftZone(
      sheet.id,
      {
        left: deletedColumnTo + 1,
        right: undefined,
        top: 0,
        bottom: undefined,
      },
      deletedColumnFrom - deletedColumnTo - 1,
      0
    );
  }

  /**
   * Move all the cells that are from the row under `deleteToRow` up to `deleteFromRow`
   *
   * b.e.
   * move vertically with delete from 3 and delete to 5 will first clear all the cells from lines 3 to 5,
   * then take all the row starting at index 6 and add them back at index 3
   *
   */
  private moveCellOnRowsDeletion(
    sheet: Sheet,
    deleteFromRow: HeaderIndex,
    deleteToRow: HeaderIndex
  ) {
    this.dispatch("CLEAR_CELLS", {
      sheetId: sheet.id,
      target: [
        {
          left: 0,
          top: deleteFromRow,
          right: this.getters.getNumberCols(sheet.id),
          bottom: deleteToRow,
        },
      ],
    });

    const numberRows = deleteToRow - deleteFromRow + 1;
    for (let rowIndex = 0; rowIndex < sheet.numberOfRows; rowIndex++) {
      const row = sheet.rows[rowIndex];
      if (row && rowIndex > deleteToRow) {
        for (const i in row.cells) {
          const colIndex = Number(i);
          const cellId = row.cells[i];
          if (cellId) {
            this.setNewPosition(cellId, sheet.id, colIndex, rowIndex - numberRows);
          }
        }
      }
    }
  }

  private shiftZone(sheetId: UID, zone: UnboundedZone, shiftCol: number, shiftRow: number) {
    for (const cellId of this.getZoneCellIds(sheetId, zone, {
      rowsOrder: shiftRow,
      colOrder: shiftCol,
    })) {
      const { sheetId, col, row } = this.getCellPosition(cellId);
      this.setNewPosition(cellId, sheetId, col + shiftCol, row + shiftRow);
    }
  }

  private getImportedSheetSize(data: SheetData): { rowNumber: number; colNumber: number } {
    const positions = Object.keys(data.cells).map(toZone);

    let rowNumber = data.rowNumber;
    let colNumber = data.colNumber;
    for (const { right, bottom } of positions) {
      rowNumber = Math.max(rowNumber, bottom + 1);
      colNumber = Math.max(colNumber, right + 1);
    }
    return { rowNumber, colNumber };
  }

  /**
   * Check that any "sheetId" in the command matches an existing
   * sheet.
   */
  private checkSheetExists(cmd: CoreCommand): CommandResult {
    if (cmd.type !== "CREATE_SHEET" && "sheetId" in cmd && this.sheets[cmd.sheetId] === undefined) {
      return CommandResult.InvalidSheetId;
    } else if (cmd.type === "CREATE_SHEET" && this.sheets[cmd.sheetId] !== undefined) {
      return CommandResult.DuplicatedSheetId;
    }
    return CommandResult.Success;
  }

  /**
   * Check if zones in the command are well formed and
   * not outside the sheet.
   */
  private checkRangesAreInSheet(cmd: CoreCommand): CommandResult {
    if (isRangeDependant(cmd) && cmd.ranges.length === 0) {
      return CommandResult.EmptyRange;
    }
    if (!("sheetId" in cmd)) {
      return CommandResult.Success;
    }
    if (
      "ranges" in cmd &&
      cmd.ranges.some(
        (rangeData) => rangeData._sheetId !== "" && !this.getters.tryGetSheet(rangeData._sheetId)
      )
    ) {
      return CommandResult.InvalidSheetId;
    }
    if (isTargetDependent(cmd) && cmd.target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    return this.checkRangesExistInSheet(this.getters.getCommandBoundedRange(cmd.sheetId, cmd));
  }
}
