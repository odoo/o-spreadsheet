import { FORBIDDEN_IN_EXCEL_REGEX } from "../../constants";
import {
  createCols,
  createDefaultCols,
  createDefaultRows,
  createRows,
  exportCols,
  exportRows,
  getUnquotedSheetName,
  groupConsecutive,
  isDefined,
  isZoneInside,
  isZoneValid,
  numberToLetters,
  positions,
  toCartesian,
} from "../../helpers/index";
import { _lt, _t } from "../../translation";
import {
  Cell,
  CellPosition,
  Col,
  Command,
  CommandResult,
  ConsecutiveIndexes,
  CoreCommand,
  CreateSheetCommand,
  ExcelWorkbookData,
  RenameSheetCommand,
  Row,
  Sheet,
  SheetData,
  UID,
  UpdateCellPositionCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

export interface SheetState {
  readonly sheets: Record<UID, Sheet | undefined>;
  readonly orderedSheetIds: UID[];
  readonly sheetIdsMapName: Record<string, UID | undefined>;
  readonly cellPosition: Record<UID, CellPosition | undefined>;
}

export class SheetPlugin extends CorePlugin<SheetState> implements SheetState {
  static getters = [
    "getSheetName",
    "tryGetSheetName",
    "getSheet",
    "tryGetSheet",
    "getSheetIdByName",
    "getSheetIds",
    "getVisibleSheetIds",
    "isSheetVisible",
    "getEvaluationSheets",
    "tryGetCol",
    "getCol",
    "tryGetRow",
    "getRow",
    "getCell",
    "getCellsInZone",
    "getCellPosition",
    "tryGetCellPosition",
    "getColCells",
    "getRowCells",
    "getColsZone",
    "getRowsZone",
    "getNumberCols",
    "getNumberRows",
    "getHiddenColsGroups",
    "getHiddenRowsGroups",
    "getGridLinesVisibility",
    "getNextSheetName",
    "isEmpty",
    "isRowHidden",
    "isColHidden",
  ] as const;

  readonly sheetIdsMapName: Record<string, UID | undefined> = {};
  readonly orderedSheetIds: UID[] = [];
  readonly sheets: Record<UID, Sheet | undefined> = {};
  readonly cellPosition: Record<UID, CellPosition | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    const genericChecks = this.chainValidations(this.checkSheetExists, this.checkZones)(cmd);
    if (genericChecks !== CommandResult.Success) {
      return genericChecks;
    }
    switch (cmd.type) {
      case "HIDE_SHEET": {
        if (this.getVisibleSheetIds().length === 1) {
          return CommandResult.NotEnoughSheets;
        }
        return CommandResult.Success;
      }
      case "CREATE_SHEET": {
        return this.checkValidations(cmd, this.checkSheetName, this.checkSheetPosition);
      }
      case "MOVE_SHEET":
        const currentIndex = this.orderedSheetIds.indexOf(cmd.sheetId);
        if (cmd.direction === "left") {
          const leftSheets = this.orderedSheetIds
            .slice(0, currentIndex)
            .map((id) => !this.isSheetVisible(id));
          return leftSheets.every((isHidden) => isHidden)
            ? CommandResult.WrongSheetMove
            : CommandResult.Success;
        } else {
          const rightSheets = this.orderedSheetIds
            .slice(currentIndex + 1)
            .map((id) => !this.isSheetVisible(id));
          return rightSheets.every((isHidden) => isHidden)
            ? CommandResult.WrongSheetMove
            : CommandResult.Success;
        }
      case "RENAME_SHEET":
        return this.isRenameAllowed(cmd);
      case "DELETE_SHEET":
        return this.orderedSheetIds.length > 1
          ? CommandResult.Success
          : CommandResult.NotEnoughSheets;
      case "REMOVE_COLUMNS_ROWS":
        const sheet = this.getSheet(cmd.sheetId);
        const length = cmd.dimension === "COL" ? sheet.cols.length : sheet.rows.length;
        return length > cmd.elements.length
          ? CommandResult.Success
          : CommandResult.NotEnoughElements;
      case "HIDE_COLUMNS_ROWS": {
        const sheet = this.sheets[cmd.sheetId]!;
        const hiddenGroup =
          cmd.dimension === "COL" ? sheet.hiddenColsGroups : sheet.hiddenRowsGroups;
        const elements = cmd.dimension === "COL" ? sheet.cols : sheet.rows;
        return (hiddenGroup || []).flat().concat(cmd.elements).length < elements.length
          ? CommandResult.Success
          : CommandResult.TooManyHiddenElements;
      }
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_GRID_LINES_VISIBILITY":
        this.setGridLinesVisibility(cmd.sheetId, cmd.areGridLinesVisible);
        break;
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.sheetId,
          cmd.name || this.getNextSheetName(),
          cmd.cols || 26,
          cmd.rows || 100,
          cmd.position
        );
        this.history.update("sheetIdsMapName", sheet.name, sheet.id);
        break;
      case "MOVE_SHEET":
        this.moveSheet(cmd.sheetId, cmd.direction);
        break;
      case "RENAME_SHEET":
        this.renameSheet(this.sheets[cmd.sheetId]!, cmd.name!);
        break;
      case "HIDE_SHEET":
        this.hideSheet(cmd.sheetId);
        break;
      case "SHOW_SHEET":
        this.showSheet(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetId, cmd.sheetIdTo);
        break;
      case "DELETE_SHEET":
        this.deleteSheet(this.sheets[cmd.sheetId]!);
        break;

      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.removeColumns(this.sheets[cmd.sheetId]!, [...cmd.elements]);
        } else {
          this.removeRows(this.sheets[cmd.sheetId]!, [...cmd.elements]);
        }
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.addColumns(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
        } else {
          this.addRows(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
        }
        break;
      case "HIDE_COLUMNS_ROWS": {
        if (cmd.dimension === "COL") {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "cols", "hide");
        } else {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "rows", "hide");
        }
        break;
      }
      case "UNHIDE_COLUMNS_ROWS": {
        if (cmd.dimension === "COL") {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "cols", "show");
        } else {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "rows", "show");
        }
        break;
      }
      case "UPDATE_CELL_POSITION":
        this.updateCellPosition(cmd);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (let sheet of data.sheets) {
      this.sheetIdsMapName[sheet.name] = sheet.id;
    }

    for (let sheetData of data.sheets) {
      const name = sheetData.name || _t("Sheet") + (Object.keys(this.sheets).length + 1);
      const { colNumber, rowNumber } = this.getImportedSheetSize(sheetData);
      const sheet: Sheet = {
        id: sheetData.id,
        name: name,
        cols: createCols(sheetData.cols || {}, colNumber),
        rows: createRows(sheetData.rows || {}, rowNumber),
        hiddenColsGroups: [],
        hiddenRowsGroups: [],
        areGridLinesVisible:
          sheetData.areGridLinesVisible === undefined ? true : sheetData.areGridLinesVisible,
        isVisible: sheetData.isVisible,
      };
      this.orderedSheetIds.push(sheet.id);
      this.sheets[sheet.id] = sheet;
      this.updateHiddenElementsGroups(sheet.id, "cols");
      this.updateHiddenElementsGroups(sheet.id, "rows");
    }
  }

  private exportSheets(data: WorkbookData) {
    data.sheets = this.orderedSheetIds.filter(isDefined).map((id) => {
      const sheet = this.sheets[id]!;
      return {
        id: sheet.id,
        name: sheet.name,
        colNumber: sheet.cols.length,
        rowNumber: sheet.rows.length,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: [],
        cells: {},
        conditionalFormats: [],
        figures: [],
        areGridLinesVisible:
          sheet.areGridLinesVisible === undefined ? true : sheet.areGridLinesVisible,
        isVisible: sheet.isVisible,
      };
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

  getCellsInZone(sheetId: UID, zone: Zone): (Cell | undefined)[] {
    return positions(zone).map(({ col, row }) => this.getCell(sheetId, col, row));
  }

  /**
   * Return the sheet name or undefined if the sheet doesn't exist.
   */
  tryGetSheetName(sheetId: UID): string | undefined {
    return this.tryGetSheet(sheetId)?.name;
  }

  getSheetIdByName(name: string | undefined): UID | undefined {
    if (name) {
      const unquotedName = getUnquotedSheetName(name);
      for (const key in this.sheetIdsMapName) {
        if (key.toUpperCase() === unquotedName.toUpperCase()) {
          return this.sheetIdsMapName[key];
        }
      }
    }
    return undefined;
  }

  getSheetIds(): UID[] {
    return this.orderedSheetIds;
  }

  getVisibleSheetIds(): UID[] {
    return this.orderedSheetIds.filter(this.isSheetVisible.bind(this));
  }

  getEvaluationSheets(): Record<UID, Sheet | undefined> {
    return this.sheets;
  }

  tryGetCol(sheetId: UID, index: number): Col | undefined {
    return this.sheets[sheetId]?.cols[index];
  }

  getCol(sheetId: UID, index: number): Col {
    const col = this.getSheet(sheetId).cols[index];
    if (!col) {
      throw new Error(`Col ${col} not found.`);
    }
    return col;
  }

  tryGetRow(sheetId: UID, index: number): Row | undefined {
    return this.sheets[sheetId]?.rows[index];
  }

  getRow(sheetId: UID, index: number): Row {
    const row = this.getSheet(sheetId).rows[index];
    if (!row) {
      throw new Error(`Row ${row} not found.`);
    }
    return row;
  }

  getCell(sheetId: UID, col: number, row: number): Cell | undefined {
    const sheet = this.tryGetSheet(sheetId);
    const cellId = sheet?.rows[row]?.cells[col];
    if (cellId === undefined) {
      return undefined;
    }
    return this.getters.getCellById(cellId);
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(sheetId: UID, col: number): Cell[] {
    return this.getSheet(sheetId)
      .rows.map((row) => row.cells[col])
      .filter(isDefined)
      .map((cellId) => this.getters.getCellById(cellId))
      .filter(isDefined);
  }

  /**
   * Returns all the cells of a row
   */
  getRowCells(sheetId: UID, row: number): Cell[] {
    const cells: Cell[] = [];
    const cellIds = Object.values(this.getSheet(sheetId).rows[row]?.cells || {});
    for (let i = 0, l = cellIds.length; i < l; i++) {
      const cellId = cellIds[i];
      if (cellId) {
        const cell = this.getters.getCellById(cellId);
        if (cell) {
          cells.push(cell);
        }
      }
    }
    return cells;
  }

  getColsZone(sheetId: UID, start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.getSheet(sheetId).rows.length - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(sheetId: UID, start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.getSheet(sheetId).cols.length - 1,
    };
  }

  getCellPosition(cellId: UID): CellPosition {
    const cell = this.cellPosition[cellId];
    if (!cell) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return cell;
  }

  tryGetCellPosition(cellId: UID): CellPosition | undefined {
    return this.cellPosition[cellId];
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    return this.sheets[sheetId]?.hiddenColsGroups || [];
  }

  getHiddenRowsGroups(sheetId: UID): ConsecutiveIndexes[] {
    return this.sheets[sheetId]?.hiddenRowsGroups || [];
  }

  isRowHidden(sheetId: UID, index: number) {
    return this.sheets[sheetId]?.rows[index]?.isHidden;
  }

  isColHidden(sheetId: UID, index: number) {
    return this.sheets[sheetId]?.cols[index]?.isHidden;
  }

  getNumberCols(sheetId: UID) {
    return this.getSheet(sheetId).cols.length;
  }

  getNumberRows(sheetId: UID) {
    return this.getSheet(sheetId).rows.length;
  }

  getNextSheetName(baseName = "Sheet"): string {
    let i = 1;
    const names = this.orderedSheetIds.map(this.getSheetName.bind(this));
    let name = `${baseName}${i}`;
    while (names.includes(name)) {
      name = `${baseName}${i}`;
      i++;
    }
    return name;
  }

  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  /**
   * Check if a zone only contains empty cells
   */
  isEmpty(sheetId: UID, zone: Zone): boolean {
    return this.getCellsInZone(sheetId, zone)
      .flat()
      .every((cell) => !cell || cell.isEmpty());
  }

  private updateCellPosition(cmd: UpdateCellPositionCommand) {
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
  private setNewPosition(cellId: UID, sheetId: UID, col: number, row: number) {
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
  private clearPosition(sheetId: UID, col: number, row: number) {
    const cellId = this.sheets[sheetId]?.rows[row].cells[col];
    if (cellId) {
      this.history.update("cellPosition", cellId, undefined);
      this.history.update("sheets", sheetId, "rows", row, "cells", col, undefined);
    }
  }

  private setGridLinesVisibility(sheetId: UID, areGridLinesVisible: boolean) {
    this.history.update("sheets", sheetId, "areGridLinesVisible", areGridLinesVisible);
  }

  private clearZones(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.sheets[sheetId]!.rows[row].cells[col];
          if (cell) {
            this.dispatch("UPDATE_CELL", {
              sheetId: sheetId,
              content: "",
              col,
              row,
            });
          }
        }
      }
    }
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
      cols: createDefaultCols(colNumber),
      rows: createDefaultRows(rowNumber),
      hiddenColsGroups: [],
      hiddenRowsGroups: [],
      areGridLinesVisible: true,
      isVisible: true,
    };
    const orderedSheetIds = this.orderedSheetIds.slice();
    orderedSheetIds.splice(position, 0, sheet.id);
    const sheets = this.sheets;
    this.history.update("orderedSheetIds", orderedSheetIds);
    this.history.update("sheets", Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet;
  }

  private moveSheet(sheetId: UID, direction: "left" | "right") {
    const orderedSheetIds = this.orderedSheetIds.slice();
    const currentIndex = orderedSheetIds.findIndex((id) => id === sheetId);
    const sheet = orderedSheetIds.splice(currentIndex, 1);
    let index =
      direction === "left"
        ? this.findIndexOfPreviousVisibleSheet(currentIndex - 1, orderedSheetIds)
        : this.findIndexOfNextVisibleSheet(currentIndex + 1, orderedSheetIds);
    if (index === undefined) {
      index = orderedSheetIds.length;
    }
    orderedSheetIds.splice(index, 0, sheet[0]);
    this.history.update("orderedSheetIds", orderedSheetIds);
  }

  private findIndexOfPreviousVisibleSheet(current: number, orderedSheetIds: UID[]) {
    while (current >= 0 && !this.isSheetVisible(orderedSheetIds[current])) {
      current--;
    }
    if (current === -1) {
      throw new Error("There is no previous visible sheet");
    }
    return current;
  }

  private findIndexOfNextVisibleSheet(current: number, orderedSheetIds: UID[]) {
    while (current < orderedSheetIds.length && !this.isSheetVisible(orderedSheetIds[current])) {
      current++;
    }
    if (
      current === orderedSheetIds.length - 1 &&
      !this.isSheetVisible(orderedSheetIds[current - 1])
    ) {
      return undefined;
    }
    return current;
  }

  private checkSheetName(cmd: RenameSheetCommand | CreateSheetCommand): CommandResult {
    const { orderedSheetIds, sheets } = this;
    const name = cmd.name && cmd.name.trim().toLowerCase();

    if (orderedSheetIds.find((id) => sheets[id]?.name.toLowerCase() === name)) {
      return CommandResult.DuplicatedSheetName;
    }
    if (FORBIDDEN_IN_EXCEL_REGEX.test(name!)) {
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

  private isRenameAllowed(cmd: RenameSheetCommand): CommandResult {
    const name = cmd.name && cmd.name.trim().toLowerCase();
    if (!name) {
      return CommandResult.MissingSheetName;
    }
    return this.checkSheetName(cmd);
  }

  private renameSheet(sheet: Sheet, name: string) {
    const oldName = sheet.name;
    this.history.update("sheets", sheet.id, "name", name.trim());
    const sheetIdsMapName = Object.assign({}, this.sheetIdsMapName);
    sheetIdsMapName[name] = sheet.id;
    delete sheetIdsMapName[oldName];
    this.history.update("sheetIdsMapName", sheetIdsMapName);
  }

  private hideSheet(sheetId: UID) {
    this.history.update("sheets", sheetId, "isVisible", false);
  }

  private showSheet(sheetId: UID) {
    this.history.update("sheets", sheetId, "isVisible", true);
  }

  private duplicateSheet(fromId: UID, toId: UID) {
    const sheet = this.getSheet(fromId);
    const toName = this.getDuplicateSheetName(sheet.name);
    const newSheet: Sheet = JSON.parse(JSON.stringify(sheet));
    newSheet.id = toId;
    newSheet.name = toName;
    for (let col = 0; col <= newSheet.cols.length; col++) {
      for (let row = 0; row <= newSheet.rows.length; row++) {
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

    for (const cell of Object.values(this.getters.getCells(fromId))) {
      const { col, row } = this.getCellPosition(cell.id);
      this.dispatch("UPDATE_CELL", {
        sheetId: newSheet.id,
        col,
        row,
        content: cell.content,
        format: cell.format,
        style: cell.style,
      });
    }

    const sheetIdsMapName = Object.assign({}, this.sheetIdsMapName);
    sheetIdsMapName[newSheet.name] = newSheet.id;
    this.history.update("sheetIdsMapName", sheetIdsMapName);
  }

  private getDuplicateSheetName(sheetName: string) {
    let i = 1;
    const names = this.orderedSheetIds.map(this.getSheetName.bind(this));
    const baseName = _lt("Copy of %s", sheetName);
    let name = baseName.toString();
    while (names.includes(name)) {
      name = `${baseName} (${i})`;
      i++;
    }
    return name;
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
    delete sheetIdsMapName[name];
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
  private removeColumns(sheet: Sheet, columns: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (let column of columns) {
      // Move the cells.
      this.moveCellOnColumnsDeletion(sheet, column);
    }
    // Effectively delete the element and recompute the left-right.
    this.updateColumnsStructureOnDeletion(sheet, columns);
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
  private removeRows(sheet: Sheet, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    for (let group of groupConsecutive(rows)) {
      // Move the cells.
      this.moveCellOnRowsDeletion(sheet, group[group.length - 1], group[0]);

      // Effectively delete the element and recompute the left-right/top-bottom.
      group.map((row) => this.updateRowsStructureOnDeletion(row, sheet));
    }
  }

  private addColumns(sheet: Sheet, column: number, position: "before" | "after", quantity: number) {
    // Move the cells.
    this.moveCellsOnAddition(
      sheet,
      position === "before" ? column : column + 1,
      quantity,
      "columns"
    );

    // Recompute the left-right/top-bottom.
    this.updateColumnsStructureOnAddition(sheet, column, quantity);
  }

  private addRows(sheet: Sheet, row: number, position: "before" | "after", quantity: number) {
    this.addEmptyRows(sheet, quantity);

    // Move the cells.
    this.moveCellsOnAddition(sheet, position === "before" ? row : row + 1, quantity, "rows");

    // Recompute the left-right/top-bottom.
    this.updateRowsStructureOnAddition(sheet, row, quantity);
  }

  private moveCellOnColumnsDeletion(sheet: Sheet, deletedColumn: number) {
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      for (let i in row.cells) {
        const colIndex = parseInt(i, 10);
        const cellId = row.cells[i];
        if (cellId) {
          if (colIndex === deletedColumn) {
            this.dispatch("CLEAR_CELL", {
              sheetId: sheet.id,
              col: colIndex,
              row: rowIndex,
            });
          }
          if (colIndex > deletedColumn) {
            this.dispatch("UPDATE_CELL_POSITION", {
              sheetId: sheet.id,
              cellId: cellId,
              col: colIndex - 1,
              row: rowIndex,
            });
          }
        }
      }
    }
  }

  /**
   * Move the cells after a column or rows insertion
   */
  private moveCellsOnAddition(
    sheet: Sheet,
    addedElement: number,
    quantity: number,
    dimension: "rows" | "columns"
  ) {
    const commands: UpdateCellPositionCommand[] = [];
    for (const [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      if (dimension !== "rows" || rowIndex >= addedElement) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cellId = row.cells[i];
          if (cellId) {
            if (dimension === "rows" || colIndex >= addedElement) {
              commands.push({
                type: "UPDATE_CELL_POSITION",
                sheetId: sheet.id,
                cellId: cellId,
                col: colIndex + (dimension === "columns" ? quantity : 0),
                row: rowIndex + (dimension === "rows" ? quantity : 0),
              });
            }
          }
        }
      }
    }
    for (let cmd of commands.reverse()) {
      this.dispatch(cmd.type, cmd);
    }
  }

  /**
   * Move all the cells that are from the row under `deleteToRow` up to `deleteFromRow`
   *
   * b.e.
   * move vertically with delete from 3 and delete to 5 will first clear all the cells from lines 3 to 5,
   * then take all the row starting at index 6 and add them back at index 3
   *
   */
  private moveCellOnRowsDeletion(sheet: Sheet, deleteFromRow: number, deleteToRow: number) {
    const numberRows = deleteToRow - deleteFromRow + 1;
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      if (rowIndex >= deleteFromRow && rowIndex <= deleteToRow) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cellId = row.cells[i];
          if (cellId) {
            this.dispatch("CLEAR_CELL", {
              sheetId: sheet.id,
              col: colIndex,
              row: rowIndex,
            });
          }
        }
      }
      if (rowIndex > deleteToRow) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cellId = row.cells[i];
          if (cellId) {
            this.dispatch("UPDATE_CELL_POSITION", {
              sheetId: sheet.id,
              cellId: cellId,
              col: colIndex,
              row: rowIndex - numberRows,
            });
          }
        }
      }
    }
  }

  /**
   * Update the cols of the sheet after a deletion:
   * - Rename the cols
   *
   * @param sheet Sheet on which the deletion occurs
   * @param deletedColumns Indexes of the deleted columns
   */
  private updateColumnsStructureOnDeletion(sheet: Sheet, deletedColumns: number[]) {
    const cols: Col[] = [];
    let colSizeIndex = 0;
    for (let index in sheet.cols) {
      if (deletedColumns.includes(parseInt(index, 10))) {
        continue;
      }
      const { isHidden } = sheet.cols[index];
      cols.push({
        name: numberToLetters(colSizeIndex),
        isHidden,
      });
      colSizeIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
    this.updateHiddenElementsGroups(sheet.id, "cols");
  }

  /**
   * Update the cols of the sheet after an addition:
   * - Rename the cols
   *
   * @param sheet Sheet on which the deletion occurs
   * @param addedColumn Index of the added columns
   * @param columnsToAdd Number of the columns to add
   */
  private updateColumnsStructureOnAddition(
    sheet: Sheet,
    addedColumn: number,
    columnsToAdd: number
  ) {
    const cols: Col[] = [];
    let colIndex = 0;
    for (let i in sheet.cols) {
      if (parseInt(i, 10) === addedColumn) {
        for (let a = 0; a < columnsToAdd; a++) {
          cols.push({
            name: numberToLetters(colIndex),
          });
          colIndex++;
        }
      }
      const { isHidden } = sheet.cols[i];
      cols.push({
        name: numberToLetters(colIndex),
        isHidden,
      });
      colIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
    this.updateHiddenElementsGroups(sheet.id, "cols");
  }

  private updateRowsStructureOnDeletion(index: number, sheet: Sheet) {
    const rows: Row[] = [];
    let rowIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const row = sheet.rows[i];
      const { isHidden } = row;
      if (parseInt(i, 10) === index) {
        continue;
      }
      rowIndex++;
      rows.push({
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
        isHidden,
      });
    }
    this.history.update("sheets", sheet.id, "rows", rows);
    this.updateHiddenElementsGroups(sheet.id, "rows");
  }

  /**
   * Update the rows of the sheet after an addition:
   * - Rename the rows
   *
   * @param sheet Sheet on which the deletion occurs
   * @param addedRow Index of the added row
   * @param rowsToAdd Number of the rows to add
   */
  private updateRowsStructureOnAddition(sheet: Sheet, addedRow: number, rowsToAdd: number) {
    const rows: Row[] = [];
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const { isHidden } = sheet.rows[sizeIndex];
      if (parseInt(i, 10) < addedRow || parseInt(i, 10) >= addedRow + rowsToAdd) {
        sizeIndex++;
      }
      rowIndex++;
      rows.push({
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
        isHidden,
      });
    }
    this.history.update("sheets", sheet.id, "rows", rows);
    this.updateHiddenElementsGroups(sheet.id, "rows");
  }

  /**
   * Add empty rows at the end of the rows
   *
   * @param sheet Sheet
   * @param quantity Number of rows to add
   */
  private addEmptyRows(sheet: Sheet, quantity: number) {
    const rows: Row[] = sheet.rows.slice();
    for (let i = 0; i < quantity; i++) {
      rows.push({
        name: (rows.length + 1).toString(),
        cells: {},
      });
    }
    this.history.update("sheets", sheet.id, "rows", rows);
  }

  private getImportedSheetSize(data: SheetData): { rowNumber: number; colNumber: number } {
    const positions = Object.keys(data.cells).map(toCartesian);

    let rowNumber = data.rowNumber;
    let colNumber = data.colNumber;
    for (let { col, row } of positions) {
      rowNumber = Math.max(rowNumber, row + 1);
      colNumber = Math.max(colNumber, col + 1);
    }
    return { rowNumber, colNumber };
  }

  // ----------------------------------------------------
  //  HIDE / SHOW
  // ----------------------------------------------------

  private setElementsVisibility(
    sheet: Sheet,
    elements: number[],
    direction: "cols" | "rows",
    visibility: "hide" | "show"
  ) {
    const hide = visibility === "hide";
    for (let index = 0; index < sheet[direction].length; index++) {
      const { isHidden } = sheet[direction][index];
      const newIsHidden: boolean = elements.includes(index) ? hide : isHidden || false;
      this.history.update("sheets", sheet.id, direction, index, "isHidden", newIsHidden);
    }
    this.updateHiddenElementsGroups(sheet.id, direction);
  }

  private updateHiddenElementsGroups(sheetId: UID, dimension: "cols" | "rows") {
    const elements = this.sheets[sheetId]?.[dimension] || [];
    const elementsRef = dimension === "cols" ? "hiddenColsGroups" : "hiddenRowsGroups";
    const hiddenEltsGroups = elements.reduce((acc, currentElt, index) => {
      if (!currentElt.isHidden) {
        return acc;
      }
      const currentGroup = acc[acc.length - 1];
      if (!currentGroup || currentGroup[currentGroup.length - 1] != index - 1) {
        acc.push([]);
      }
      acc[acc.length - 1].push(index);
      return acc;
    }, [] as ConsecutiveIndexes[]);
    this.history.update("sheets", sheetId, elementsRef, hiddenEltsGroups);
  }

  /**
   * Check that any "sheetId" in the command matches an existing
   * sheet.
   */
  private checkSheetExists(cmd: Command): CommandResult {
    if (cmd.type !== "CREATE_SHEET" && "sheetId" in cmd && this.sheets[cmd.sheetId] === undefined) {
      return CommandResult.InvalidSheetId;
    }
    return CommandResult.Success;
  }

  /**
   * Check if zones in the command are well formed and
   * not outside the sheet.
   */
  private checkZones(cmd: Command): CommandResult {
    const zones: Zone[] = [];
    if ("zone" in cmd) {
      zones.push(cmd.zone);
    }
    if ("target" in cmd && Array.isArray(cmd.target)) {
      zones.push(...cmd.target);
    }
    if (!zones.every(isZoneValid)) {
      return CommandResult.InvalidRange;
    } else if (zones.length && "sheetId" in cmd) {
      const sheet = this.getSheet(cmd.sheetId);
      const sheetZone = {
        top: 0,
        left: 0,
        bottom: sheet.rows.length - 1,
        right: sheet.cols.length - 1,
      };
      return zones.every((zone) => isZoneInside(zone, sheetZone))
        ? CommandResult.Success
        : CommandResult.TargetOutOfSheet;
    }
    return CommandResult.Success;
  }
}
