import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, INCORRECT_RANGE_STRING } from "../../constants";
import { cellReference, rangeTokenize } from "../../formulas/index";
import {
  getComposerSheetName,
  groupConsecutive,
  isDefined,
  numberToLetters,
  toCartesian,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  CancelledReason,
  Cell,
  CellPosition,
  Col,
  CommandResult,
  CoreCommand,
  HeaderData,
  RenameSheetCommand,
  Row,
  Sheet,
  UID,
  UpdateCellPositionCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

export interface SheetState {
  readonly sheets: Record<UID, Sheet | undefined>;
  readonly visibleSheets: UID[];
  readonly sheetIds: Record<string, UID | undefined>;
  readonly cellPosition: Record<UID, CellPosition | undefined>;
}

export class SheetPlugin extends CorePlugin<SheetState> implements SheetState {
  static getters = [
    "applyOffset",
    "getSheetName",
    "getSheet",
    "tryGetSheet",
    "getSheetIdByName",
    "getSheets",
    "getVisibleSheets",
    "getEvaluationSheets",
    "getCol",
    "getRow",
    "getCell",
    "getCellPosition",
    "getColCells",
    "getGridSize",
    "getColsZone",
    "getRowsZone",
  ];

  readonly sheetIds: Record<string, UID | undefined> = {};
  readonly visibleSheets: UID[] = []; // ids of visible sheets
  readonly sheets: Record<UID, Sheet | undefined> = {};
  readonly cellPosition: Record<UID, CellPosition | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    if (cmd.type !== "CREATE_SHEET" && "sheetId" in cmd && this.sheets[cmd.sheetId] === undefined) {
      return {
        status: "CANCELLED",
        reason: CancelledReason.InvalidSheetId,
      };
    }
    switch (cmd.type) {
      case "CREATE_SHEET": {
        const { visibleSheets, sheets } = this;
        if (cmd.position > visibleSheets.length || cmd.position < 0) {
          return { status: "CANCELLED", reason: CancelledReason.WrongSheetPosition };
        }
        return !cmd.name || !visibleSheets.find((id) => sheets[id]!.name === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      }
      case "DUPLICATE_SHEET": {
        const { visibleSheets, sheets } = this;
        return !cmd.name || !visibleSheets.find((id) => sheets[id]!.name === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      }
      case "MOVE_SHEET":
        const currentIndex = this.visibleSheets.findIndex((id) => id === cmd.sheetId);
        if (currentIndex === -1) {
          return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
        }
        return (cmd.direction === "left" && currentIndex === 0) ||
          (cmd.direction === "right" && currentIndex === this.visibleSheets.length - 1)
          ? { status: "CANCELLED", reason: CancelledReason.WrongSheetMove }
          : { status: "SUCCESS" };
      case "RENAME_SHEET":
        return this.isRenameAllowed(cmd);
      case "DELETE_SHEET":
        return this.visibleSheets.length > 1
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughSheets };
      case "REMOVE_COLUMNS":
        return this.sheets[cmd.sheetId]!.cols.length > cmd.columns.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughColumns };
      case "REMOVE_ROWS":
        return this.sheets[cmd.sheetId]!.rows.length > cmd.rows.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughRows };

      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.sheetId,
          cmd.name || this.generateSheetName(),
          cmd.cols || 26,
          cmd.rows || 100,
          cmd.position
        );
        this.history.update("sheetIds", sheet.name, sheet.id);
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.columns) {
          this.setHeaderSize(this.sheets[cmd.sheetId]!, "cols", col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setHeaderSize(this.sheets[cmd.sheetId]!, "rows", row, cmd.size);
        }
        break;

      case "MOVE_SHEET":
        this.moveSheet(cmd.sheetId, cmd.direction);
        break;
      case "RENAME_SHEET":
        if (!cmd.interactive) {
          this.renameSheet(this.sheets[cmd.sheetId]!, cmd.name!);
        }
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdFrom, cmd.sheetIdTo, cmd.name);
        break;
      case "DELETE_SHEET":
        this.deleteSheet(this.sheets[cmd.sheetId]!);
        break;

      case "REMOVE_COLUMNS":
        this.removeColumns(this.sheets[cmd.sheetId]!, cmd.columns);
        break;
      case "REMOVE_ROWS":
        this.removeRows(this.sheets[cmd.sheetId]!, cmd.rows);
        break;
      case "ADD_COLUMNS": {
        this.addColumns(this.sheets[cmd.sheetId]!, cmd.column, cmd.position, cmd.quantity);
        break;
      }
      case "ADD_ROWS": {
        this.addRows(this.sheets[cmd.sheetId]!, cmd.row, cmd.position, cmd.quantity);
        break;
      }
      case "UPDATE_CELL_POSITION":
        this.updateCellPosition(cmd);
        break;
    }
  }

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (let sheet of data.sheets) {
      this.sheetIds[sheet.name] = sheet.id;
    }

    for (let sheetData of data.sheets) {
      const name = sheetData.name || `Sheet${Object.keys(this.sheets).length + 1}`;
      const sheet: Sheet = {
        id: sheetData.id,
        name: name,
        cols: createCols(sheetData.cols || {}, sheetData.colNumber),
        rows: createRows(sheetData.rows || {}, sheetData.rowNumber),
      };
      this.visibleSheets.push(sheet.id);
      this.sheets[sheet.id] = sheet;
    }
  }

  export(data: WorkbookData) {
    data.sheets = this.visibleSheets.filter(isDefined).map((id) => {
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
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

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

  getSheetName(sheetId: UID): string | undefined {
    return this.sheets[sheetId]?.name;
  }

  getSheetIdByName(name: string | undefined): UID | undefined {
    return name && this.sheetIds[name];
  }

  getSheets(): Sheet[] {
    const { visibleSheets, sheets } = this;
    return visibleSheets.map((id) => sheets[id]).filter(isDefined);
  }

  getVisibleSheets(): UID[] {
    return this.visibleSheets;
  }

  getEvaluationSheets(): Record<UID, Sheet | undefined> {
    return this.sheets;
  }

  getCol(sheetId: UID, index: number): Col | undefined {
    return this.sheets[sheetId]?.cols[index];
  }

  getRow(sheetId: UID, index: number): Row | undefined {
    return this.sheets[sheetId]?.rows[index];
  }

  applyOffset(sheetId: UID, formula: string, offsetX: number, offsetY: number): string {
    return rangeTokenize(formula)
      .map((t) => {
        if (t.type === "SYMBOL" && cellReference.test(t.value)) {
          const [xcs, sheetName] = t.value.split("!").reverse();
          const refSheetId = this.getSheetIdByName(sheetName);
          if (xcs.includes(":")) {
            return this.updateRange(sheetId, xcs, offsetX, offsetY, refSheetId);
          }
          return this.updateReference(sheetId, xcs, offsetX, offsetY, refSheetId);
        }
        return t.value;
      })
      .join("");
  }

  getCell(sheetId: UID, col: number, row: number): Cell | undefined {
    const sheet = this.tryGetSheet(sheetId);
    return (sheet && sheet.rows[row] && sheet.rows[row].cells[col]) || undefined;
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(sheetId: UID, col: number): Cell[] {
    return this.getSheet(sheetId).rows.reduce((acc: Cell[], cur) => {
      const cell = cur.cells[col];
      return cell !== undefined ? acc.concat(cell) : acc;
    }, []);
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

  getGridSize(sheet: Sheet): [number, number] {
    const height = sheet.rows[sheet.rows.length - 1].end + DEFAULT_CELL_HEIGHT + 5;
    const width = sheet.cols[sheet.cols.length - 1].end + DEFAULT_CELL_WIDTH;
    return [width, height];
  }

  getCellPosition(cellId: UID): CellPosition {
    const cell = this.cellPosition[cellId];
    if (!cell) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return cell;
  }

  private setHeaderSize(sheet: Sheet, dimension: "cols" | "rows", index: number, size: number) {
    const elements = sheet[dimension];
    const base = elements[index];
    const delta = size - base.size;
    this.history.update("sheets", sheet.id, dimension, index, "size", size);
    this.history.update("sheets", sheet.id, dimension, index, "end", base.end + delta);
    for (let i = index + 1; i < elements.length; i++) {
      const col = elements[i];
      this.history.update("sheets", sheet.id, dimension, i, "start", col.start + delta);
      this.history.update("sheets", sheet.id, dimension, i, "end", col.end + delta);
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private updateCellPosition(cmd: UpdateCellPositionCommand) {
    if (cmd.cell) {
      const position = this.cellPosition[cmd.cellId];
      if (position) {
        this.history.update(
          "sheets",
          cmd.sheetId,
          "rows",
          position.row,
          "cells",
          position.col,
          undefined
        );
      }
      this.history.update("cellPosition", cmd.cell.id, {
        row: cmd.row,
        col: cmd.col,
        sheetId: cmd.sheetId,
      });
      //TODO : remove cell from the command, only store the cellId in sheets[sheet].row[rowIndex].cells[colIndex]
      this.history.update("sheets", cmd.sheetId, "rows", cmd.row, "cells", cmd.col, cmd.cell);
    } else {
      this.history.update("cellPosition", cmd.cellId, undefined);
      this.history.update("sheets", cmd.sheetId, "rows", cmd.row, "cells", cmd.col, undefined);
    }
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

  private generateSheetName(): string {
    let i = 1;
    const names = this.getSheets().map((s) => s.name);
    const baseName = _lt("Sheet");
    let name = `${baseName}${i}`;
    while (names.includes(name)) {
      name = `${baseName}${i}`;
      i++;
    }
    return name;
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
    };
    const visibleSheets = this.visibleSheets.slice();
    visibleSheets.splice(position, 0, sheet.id);
    const sheets = this.sheets;
    this.history.update("visibleSheets", visibleSheets);
    this.history.update("sheets", Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet;
  }

  private moveSheet(sheetId: UID, direction: "left" | "right") {
    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === sheetId);
    const sheet = visibleSheets.splice(currentIndex, 1);
    visibleSheets.splice(currentIndex + (direction === "left" ? -1 : 1), 0, sheet[0]);
    this.history.update("visibleSheets", visibleSheets);
  }

  private isRenameAllowed(cmd: RenameSheetCommand): CommandResult {
    if (cmd.interactive) {
      return { status: "SUCCESS" };
    }
    const name = cmd.name && cmd.name.trim().toLowerCase();
    if (!name) {
      return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
    }
    return this.visibleSheets.findIndex((id) => this.sheets[id]?.name.toLowerCase() === name) === -1
      ? { status: "SUCCESS" }
      : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
  }

  private renameSheet(sheet: Sheet, name: string) {
    const oldName = sheet.name;
    this.history.update("sheets", sheet.id, "name", name.trim());
    const sheetIds = Object.assign({}, this.sheetIds);
    sheetIds[name] = sheet.id;
    delete sheetIds[oldName];
    this.history.update("sheetIds", sheetIds);
  }

  private duplicateSheet(fromId: UID, toId: UID, toName: string) {
    const sheet = this.sheets[fromId];
    const newSheet = JSON.parse(JSON.stringify(sheet));
    newSheet.id = toId;
    newSheet.name = toName;
    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === fromId);
    visibleSheets.splice(currentIndex + 1, 0, newSheet.id);
    this.history.update("visibleSheets", visibleSheets);
    this.history.update("sheets", Object.assign({}, this.sheets, { [newSheet.id]: newSheet }));

    const sheetIds = Object.assign({}, this.sheetIds);
    sheetIds[newSheet.name] = newSheet.id;
    this.history.update("sheetIds", sheetIds);
  }

  private deleteSheet(sheet: Sheet) {
    const name = sheet.name;
    const sheets = Object.assign({}, this.sheets);
    delete sheets[sheet.id];
    this.history.update("sheets", sheets);

    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === sheet.id);
    visibleSheets.splice(currentIndex, 1);

    this.history.update("visibleSheets", visibleSheets);
    const sheetIds = Object.assign({}, this.sheetIds);
    delete sheetIds[name];
    this.history.update("sheetIds", sheetIds);
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
      group.map((row) => this.processRowsHeaderDelete(row, sheet));
    }
  }

  private addColumns(sheet: Sheet, column: number, position: "before" | "after", quantity: number) {
    // Move the cells.
    this.moveCellOnColumnsAddition(sheet, position === "before" ? column : column + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.updateColumnsStructureOnAddition(sheet, column, quantity);
  }

  private addRows(sheet: Sheet, row: number, position: "before" | "after", quantity: number) {
    this.addEmptyRows(sheet, quantity);

    // Move the cells.
    this.moveCellOnRowsAddition(sheet, position === "before" ? row : row + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.updateRowsStructureOnAddition(sheet, row, quantity);
  }

  private moveCellOnColumnsDeletion(sheet: Sheet, deletedColumn: number) {
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      for (let i in row.cells) {
        const colIndex = parseInt(i, 10);
        const cell = row.cells[i];
        if (cell) {
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
              cellId: cell.id,
              cell: cell,
              col: colIndex - 1,
              row: rowIndex,
            });
          }
        }
      }
    }
  }

  /**
   * Move the cells after column addition
   *
   * @param sheet Sheet
   * @param addedColumn Column currently being added
   * @param quantity Number of columns to add
   */
  private moveCellOnColumnsAddition(sheet: Sheet, addedColumn: number, quantity: number) {
    const commands: CoreCommand[] = [];
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      for (let i in row.cells) {
        const colIndex = parseInt(i, 10);
        const cell = row.cells[i];
        if (cell) {
          if (colIndex >= addedColumn) {
            commands.unshift({
              type: "UPDATE_CELL_POSITION",
              sheetId: sheet.id,
              cellId: cell.id,
              cell: cell,
              col: colIndex + quantity,
              row: rowIndex,
            });
          }
        }
      }
    }
    for (let cmd of commands) {
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
          const cell = row.cells[i];
          if (cell) {
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
          const cell = row.cells[i];
          if (cell) {
            this.dispatch("UPDATE_CELL_POSITION", {
              sheetId: sheet.id,
              cellId: cell.id,
              cell: cell,
              col: colIndex,
              row: rowIndex - numberRows,
            });
          }
        }
      }
    }
  }

  /**
   * Move the cells after rows addition
   *
   * @param sheet Sheet
   * @param addedRow Row currently being added
   * @param quantity Number of rows to add
   */
  private moveCellOnRowsAddition(sheet: Sheet, addedRow: number, quantity: number) {
    const commands: UpdateCellPositionCommand[] = [];
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      if (rowIndex >= addedRow) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cell = row.cells[i];
          if (cell) {
            commands.unshift({
              type: "UPDATE_CELL_POSITION",
              sheetId: sheet.id,
              cellId: cell.id,
              cell: cell,
              col: colIndex,
              row: rowIndex + quantity,
            });
          }
        }
      }
    }
    for (let cmd of commands) {
      this.dispatch(cmd.type, cmd);
    }
  }

  /**
   * Update the cols of the sheet after a deletion:
   * - Rename the cols
   * - Update start-end
   *
   * @param sheet Sheet on which the deletion occurs
   * @param deletedColumns Indexes of the deleted columns
   */
  private updateColumnsStructureOnDeletion(sheet: Sheet, deletedColumns: number[]) {
    const cols: Col[] = [];
    let start = 0;
    let colSizeIndex = 0;
    for (let index in sheet.cols) {
      if (deletedColumns.includes(parseInt(index, 10))) {
        continue;
      }
      const { size } = sheet.cols[index];
      cols.push({
        name: numberToLetters(colSizeIndex),
        size,
        start,
        end: start + size,
      });
      start += size;
      colSizeIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
  }

  /**
   * Update the cols of the sheet after an addition:
   * - Rename the cols
   * - Update start-end
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
    let start = 0;
    let colIndex = 0;
    for (let i in sheet.cols) {
      if (parseInt(i, 10) === addedColumn) {
        const { size } = sheet.cols[colIndex];
        for (let a = 0; a < columnsToAdd; a++) {
          cols.push({
            name: numberToLetters(colIndex),
            size,
            start,
            end: start + size,
          });
          start += size;
          colIndex++;
        }
      }
      const { size } = sheet.cols[i];
      cols.push({
        name: numberToLetters(colIndex),
        size,
        start,
        end: start + size,
      });
      start += size;
      colIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
  }

  private processRowsHeaderDelete(index: number, sheet: Sheet) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const row = sheet.rows[i];
      const { size } = row;
      if (parseInt(i, 10) === index) {
        continue;
      }
      rowIndex++;
      rows.push({
        start,
        end: start + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
      });
      start += size;
    }
    this.history.update("sheets", sheet.id, "rows", rows);
  }

  /**
   * Update the rows of the sheet after an addition:
   * - Rename the rows
   * - Update start-end
   *
   * @param sheet Sheet on which the deletion occurs
   * @param addedRow Index of the added row
   * @param rowsToAdd Number of the rows to add
   */
  private updateRowsStructureOnAddition(sheet: Sheet, addedRow: number, rowsToAdd: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const { size } = sheet.rows[sizeIndex];
      if (parseInt(i, 10) < addedRow || parseInt(i, 10) >= addedRow + rowsToAdd) {
        sizeIndex++;
      }
      rowIndex++;
      rows.push({
        start,
        end: start + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
      });
      start += size;
    }
    this.history.update("sheets", sheet.id, "rows", rows);
  }

  /**
   * Add empty rows at the end of the rows
   *
   * @param sheet Sheet
   * @param quantity Number of rows to add
   */
  private addEmptyRows(sheet: Sheet, quantity: number) {
    const lastEnd = sheet.rows[sheet.rows.length - 1].end;
    const rows: Row[] = sheet.rows.slice();
    for (let i = 0; i < quantity; i++) {
      rows.push({
        start: lastEnd,
        end: lastEnd,
        size: 0,
        name: (rows.length + 1).toString(),
        cells: {},
      });
    }
    this.history.update("sheets", sheet.id, "rows", rows);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Update a range with some offsets
   */
  private updateRange(
    sheetId: UID,
    symbol: string,
    offsetX: number,
    offsetY: number,
    refSheetId: UID | undefined
  ): string {
    let [left, right] = symbol.split(":");
    left = this.updateReference(sheetId, left, offsetX, offsetY, refSheetId);
    right = this.updateReference(sheetId, right, offsetX, offsetY, refSheetId);
    if (left === INCORRECT_RANGE_STRING || right === INCORRECT_RANGE_STRING) {
      return INCORRECT_RANGE_STRING;
    }
    //As updateReference put the sheet in the ref, we need to remove it from the right part
    right = right.split("!").pop()!;
    return `${left}:${right}`;
  }

  /**
   * Update a reference with some offsets.
   */
  private updateReference(
    sheetId: UID,
    symbol: string,
    offsetX: number,
    offsetY: number,
    referenceSheetId: UID | undefined,
    updateFreeze: boolean = true
  ): string {
    const xc = symbol.replace(/\$/g, "");
    let [x, y] = toCartesian(xc);
    const freezeCol = symbol.startsWith("$");
    const freezeRow = symbol.includes("$", 1);
    x += freezeCol && updateFreeze ? 0 : offsetX;
    y += freezeRow && updateFreeze ? 0 : offsetY;
    const sheet = this.getSheet(referenceSheetId || sheetId);
    if (!sheet || x < 0 || x >= sheet.cols.length || y < 0 || y >= sheet.rows.length) {
      return INCORRECT_RANGE_STRING;
    }
    const sheetName =
      referenceSheetId && getComposerSheetName(this.getters.getSheetName(referenceSheetId)!);
    return (
      (sheetName ? `${sheetName}!` : "") +
      (freezeCol ? "$" : "") +
      numberToLetters(x) +
      (freezeRow ? "$" : "") +
      String(y + 1)
    );
  }
}

function createDefaultCols(colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = DEFAULT_CELL_WIDTH;
    const col = {
      start: current,
      end: current + size,
      size: size,
      name: numberToLetters(i),
    };
    cols.push(col);
    current = col.end;
  }
  return cols;
}

function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = DEFAULT_CELL_HEIGHT;
    const row = {
      start: current,
      end: current + size,
      size: size,
      name: String(i + 1),
      cells: {},
    };
    rows.push(row);
    current = row.end;
  }
  return rows;
}
function createCols(savedCols: { [key: number]: HeaderData }, colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = savedCols[i] ? savedCols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
    const col = {
      start: current,
      end: current + size,
      size: size,
      name: numberToLetters(i),
    };
    cols.push(col);
    current = col.end;
  }
  return cols;
}

function createRows(savedRows: { [key: number]: HeaderData }, rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = savedRows[i] ? savedRows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
    const row = {
      start: current,
      end: current + size,
      size: size,
      name: String(i + 1),
      cells: {},
    };
    rows.push(row);
    current = row.end;
  }
  return rows;
}
function exportCols(cols: Col[]): { [key: number]: HeaderData } {
  const exportedCols: { [key: number]: HeaderData } = {};
  for (let i in cols) {
    const col = cols[i];
    if (col.size !== DEFAULT_CELL_WIDTH) {
      exportedCols[i] = { size: col.size };
    }
  }
  return exportedCols;
}

function exportRows(rows: Row[]): { [key: number]: HeaderData } {
  const exportedRows: { [key: number]: HeaderData } = {};
  for (let i in rows) {
    const row = rows[i];
    if (row.size !== DEFAULT_CELL_HEIGHT) {
      exportedRows[i] = { size: row.size };
    }
  }
  return exportedRows;
}
