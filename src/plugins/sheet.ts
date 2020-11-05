import { BasePlugin } from "../base_plugin";
import {
  CancelledReason,
  Cell,
  Col,
  Command,
  CommandResult,
  HeaderData,
  RenameSheetCommand,
  Row,
  Sheet,
  SheetData,
  UID,
  UpdateCellCommand,
  WorkbookData,
  Zone,
} from "../types/index";
import { _lt } from "../translation";
import {
  getComposerSheetName,
  getUnquotedSheetName,
  isDefined,
  numberToLetters,
  toCartesian,
  toXC,
} from "../helpers/index";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { cellReference, rangeTokenize } from "../formulas/index";
const MIN_PADDING = 3;

export interface SheetState {
  readonly activeSheet: Sheet;
  readonly sheets: Record<UID, Sheet | undefined>;
  readonly visibleSheets: UID[];
  readonly sheetIds: Record<string, UID | undefined>;
  readonly cellPosition: Record<UID, { col: number; row: number } | undefined>;
}

export class SheetPlugin extends BasePlugin<SheetState> implements SheetState {
  static getters = [
    "applyOffset",
    "getActiveSheetId",
    "getActiveSheet",
    "getSheetName",
    "getSheet",
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
    "getCellByXc",
  ];

  readonly sheetIds: Record<string, UID | undefined> = {};
  readonly visibleSheets: UID[] = []; // ids of visible sheets
  readonly sheets: Record<UID, Sheet | undefined> = {};
  readonly cellPosition: Record<UID, { col: number; row: number } | undefined> = {};

  // activeSheet cannot be made readonly because it is sometimes assigned outside of the context of history
  activeSheet: Sheet = null as any;

  // This flag is used to avoid to historize the ACTIVE_SHEET command when it's
  // the main command.
  private historizeActiveSheet: boolean = true;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
      case "ADD_ROWS":
      case "ADD_COLUMNS":
      case "RESIZE_COLUMNS":
      case "RESIZE_ROWS":
      case "AUTORESIZE_COLUMNS":
      case "AUTORESIZE_ROWS":
      case "UPDATE_CELL":
      case "CLEAR_CELL":
      case "RENAME_SHEET":
      case "DELETE_SHEET":
      case "DELETE_CONTENT":
      case "DELETE_SHEET_CONFIRMATION":
        if (this.sheets[cmd.sheetId] === undefined) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.InvalidSheetId,
          };
        }
    }
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        if (this.sheets[cmd.sheetIdTo] === undefined) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.InvalidSheetId,
          };
        }
        this.historizeActiveSheet = false;
        return { status: "SUCCESS" };
      case "CREATE_SHEET":
      case "DUPLICATE_SHEET":
        const { visibleSheets, sheets } = this;
        return !cmd.name || !visibleSheets.find((id) => sheets[id]!.name === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
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
      case "DELETE_SHEET_CONFIRMATION":
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

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "ACTIVATE_SHEET":
        if (this.historizeActiveSheet) {
          this.history.update("activeSheet", this.sheets[cmd.sheetIdTo]!);
        } else {
          this.activeSheet = this.sheets[cmd.sheetIdTo]!;
        }
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.sheetId,
          cmd.name || this.generateSheetName(),
          cmd.cols || 26,
          cmd.rows || 100
        );
        this.sheetIds[sheet.name] = sheet.id;
        if (cmd.activate) {
          this.dispatch("ACTIVATE_SHEET", {
            sheetIdFrom: this.getters.getActiveSheetId(),
            sheetIdTo: sheet.id,
          });
        }
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(col);
          if (size !== 0) {
            this.setColSize(this.sheets[cmd.sheetId]!, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let col of cmd.rows) {
          const size = this.getRowMaxHeight(col);
          if (size !== 0) {
            this.setRowSize(this.sheets[cmd.sheetId]!, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.cols) {
          this.setColSize(this.sheets[cmd.sheetId]!, col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setRowSize(this.sheets[cmd.sheetId]!, row, cmd.size);
        }
        break;

      case "MOVE_SHEET":
        this.moveSheet(cmd.sheetId, cmd.direction);
        break;
      case "RENAME_SHEET":
        if (cmd.interactive) {
          this.interactiveRenameSheet(cmd.sheetId, _lt("Rename Sheet"));
        } else {
          this.renameSheet(this.sheets[cmd.sheetId]!, cmd.name!);
        }
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdFrom, cmd.sheetIdTo, cmd.name);
        break;
      case "DELETE_SHEET_CONFIRMATION":
        this.interactiveDeleteSheet(cmd.sheetId);
        break;
      case "DELETE_SHEET":
        this.deleteSheet(this.sheets[cmd.sheetId]!);
        break;

      case "REMOVE_COLUMNS":
        this.removeColumns(this.sheets[cmd.sheetId]!, cmd.columns);
        this.history.update(
          "sheets",
          cmd.sheetId,
          "colNumber",
          this.sheets[cmd.sheetId]!.colNumber - cmd.columns.length
        );
        break;
      case "REMOVE_ROWS":
        this.removeRows(this.sheets[cmd.sheetId]!, cmd.rows);
        this.history.update(
          "sheets",
          cmd.sheetId,
          "rowNumber",
          this.sheets[cmd.sheetId]!.rowNumber - cmd.rows.length
        );
        break;
      case "ADD_COLUMNS":
        this.addColumns(this.sheets[cmd.sheetId]!, cmd.column, cmd.position, cmd.quantity);
        this.history.update("activeSheet", "colNumber", this.activeSheet.colNumber + cmd.quantity);
        break;
      case "ADD_ROWS":
        this.addRows(this.sheets[cmd.sheetId]!, cmd.row, cmd.position, cmd.quantity);
        this.history.update("activeSheet", "rowNumber", this.activeSheet.rowNumber + cmd.quantity);
        break;
      case "UPDATE_CELL_POSITION":
        if (cmd.cell) {
          this.history.update("cellPosition", cmd.cell.id, { row: cmd.row, col: cmd.col });
          //TODO : remove cell from the command, only store the cellId in sheets[sheet].row[rowIndex].cells[colIndex]
          this.history.update("sheets", cmd.sheetId, "rows", cmd.row, "cells", cmd.col, cmd.cell);
        } else {
          this.history.update("cellPosition", cmd.cellId, undefined);
          this.history.update("sheets", cmd.sheetId, "rows", cmd.row, "cells", cmd.col, undefined);
        }
        break;
    }
  }

  finalize() {
    this.historizeActiveSheet = true;
  }

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (let sheet of data.sheets) {
      this.sheetIds[sheet.name] = sheet.id;
    }

    for (let sheet of data.sheets) {
      this.importSheet(sheet);
    }
    this.activeSheet = this.sheets[data.activeSheet]!;
  }
  importSheet(data: SheetData) {
    let { sheets, visibleSheets } = this;
    const name = data.name || `Sheet${Object.keys(sheets).length + 1}`;
    const sheet: Sheet = {
      id: data.id,
      name: name,
      colNumber: data.colNumber,
      rowNumber: data.rowNumber,
      cols: createCols(data.cols || {}, data.colNumber),
      rows: createRows(data.rows || {}, data.rowNumber),
    };
    visibleSheets = visibleSheets.slice();
    visibleSheets.push(sheet.id);
    this.history.update("visibleSheets", visibleSheets);
    this.history.update("sheets", Object.assign({}, sheets, { [sheet.id]: sheet }));
  }

  export(data: WorkbookData) {
    data.sheets = this.visibleSheets.filter(isDefined).map((id) => {
      const sheet = this.sheets[id]!;
      return {
        id: sheet.id,
        name: sheet.name,
        colNumber: sheet.colNumber,
        rowNumber: sheet.rowNumber,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: [], //exportMerges(sheet.merges),
        cells: {},
        conditionalFormats: [],
        figures: [],
      };
    });
    data.activeSheet = this.getters.getActiveSheetId();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the id (not the name) of the currently active sheet
   */
  getActiveSheetId(): UID {
    return this.activeSheet.id;
  }

  getActiveSheet(): Sheet {
    return this.activeSheet;
  }

  getSheet(sheetId: UID): Sheet | undefined {
    return this.sheets[sheetId];
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

  applyOffset(formula: string, offsetX: number, offsetY: number): string {
    return rangeTokenize(formula)
      .map((t) => {
        if (t.type === "SYMBOL" && cellReference.test(t.value)) {
          const [xcs, sheetName] = t.value.split("!").reverse();
          const sheetId = this.getSheetIdByName(sheetName);
          if (xcs.includes(":")) {
            return this.updateRange(xcs, offsetX, offsetY, sheetId);
          }
          return this.updateReference(xcs, offsetX, offsetY, sheetId);
        }
        return t.value;
      })
      .join("");
  }

  getCell(sheetId: UID, col: number, row: number): Cell | undefined {
    const sheet = this.getSheet(sheetId);
    return (sheet && sheet.rows[row] && sheet.rows[row].cells[col]) || undefined;
  }

  getCellByXc(sheetId: UID, xc: string): Cell | undefined {
    let [col, row] = toCartesian(xc);
    return this.sheets[sheetId]?.rows[row]?.cells[col];
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(col: number): Cell[] {
    return this.activeSheet.rows.reduce((acc: Cell[], cur) => {
      const cell = cur.cells[col];
      return cell !== undefined ? acc.concat(cell) : acc;
    }, []);
  }

  getColsZone(start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.getters.getActiveSheet().rows.length - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.getters.getActiveSheet().cols.length - 1,
    };
  }

  getGridSize(): [number, number] {
    const activeSheet = this.getters.getActiveSheet();
    const height = activeSheet.rows[activeSheet.rows.length - 1].end + DEFAULT_CELL_HEIGHT + 5;
    const width = activeSheet.cols[activeSheet.cols.length - 1].end + DEFAULT_CELL_WIDTH;

    return [width, height];
  }

  getCellPosition(cellId: UID): { col: number; row: number } {
    const cell = this.cellPosition[cellId];
    if (!cell) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return cell;
  }

  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(index: number): number {
    const cells = this.getters.getColCells(index);
    const sizes = cells.map(this.getters.getCellWidth);
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(index: number): number {
    const cells = Object.values(this.activeSheet.rows[index].cells);
    const sizes = cells.map(this.getters.getCellHeight);
    return Math.max(0, ...sizes);
  }

  private setColSize(sheet: Sheet, index: number, size: number) {
    const cols = sheet.cols;
    const col = cols[index];
    const delta = size - col.size;
    this.history.update("sheets", sheet.id, "cols", index, "size", size);
    this.history.update("sheets", sheet.id, "cols", index, "end", col.end + delta);
    for (let i = index + 1; i < cols.length; i++) {
      const col = cols[i];
      this.history.update("sheets", sheet.id, "cols", i, "start", col.start + delta);
      this.history.update("sheets", sheet.id, "cols", i, "end", col.end + delta);
    }
  }

  private setRowSize(sheet: Sheet, index: number, size: number) {
    const rows = sheet.rows;
    const row = rows[index];
    const delta = size - row.size;
    this.history.update("sheets", sheet.id, "rows", index, "size", size);
    this.history.update("sheets", sheet.id, "rows", index, "end", row.end + delta);
    for (let i = index + 1; i < rows.length; i++) {
      const row = rows[i];
      this.history.update("sheets", sheet.id, "rows", i, "start", row.start + delta);
      this.history.update("sheets", sheet.id, "rows", i, "end", row.end + delta);
    }
  }
  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

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

  private createSheet(id: UID, name: string, cols: number, rows: number): Sheet {
    const sheet: Sheet = {
      id,
      name,
      colNumber: cols,
      rowNumber: rows,
      cols: createDefaultCols(cols),
      rows: createDefaultRows(rows),
    };
    const visibleSheets = this.visibleSheets.slice();
    const index = visibleSheets.findIndex((id) => this.getters.getActiveSheetId() === id);
    visibleSheets.splice(index + 1, 0, sheet.id);
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

  private interactiveRenameSheet(sheetId: UID, title: string) {
    const placeholder = this.getSheetName(sheetId)!;
    this.ui.editText(title, placeholder, (name: string | null) => {
      if (!name) {
        return;
      }
      const result = this.dispatch("RENAME_SHEET", { sheetId: sheetId, name });
      const sheetName = this.getSheetName(sheetId);
      if (result.status === "CANCELLED" && sheetName !== name) {
        this.interactiveRenameSheet(sheetId, _lt("Please enter a valid sheet name"));
      }
    });
  }

  private renameSheet(sheet: Sheet, name: string) {
    const oldName = sheet.name;
    this.history.update("sheets", sheet.id, "name", name.trim());
    const sheetIds = Object.assign({}, this.sheetIds);
    sheetIds[name] = sheet.id;
    delete sheetIds[oldName];
    this.history.update("sheetIds", sheetIds);
    this.visitAllFormulasSymbols((value: string) => {
      let [val, sheetRef] = value.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === oldName) {
          if (val.includes(":")) {
            return this.updateRange(val, 0, 0, sheet.id);
          }
          return this.updateReference(val, 0, 0, sheet.id);
        }
      }
      return value;
    });
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
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getters.getActiveSheetId(),
      sheetIdTo: toId,
    });
  }

  private interactiveDeleteSheet(sheetId: UID) {
    this.ui.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
      this.dispatch("DELETE_SHEET", { sheetId: sheetId });
    });
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
    this.visitAllFormulasSymbols((value: string) => {
      let [, sheetRef] = value.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === name) {
          return "#REF";
        }
      }
      return value;
    });
    if (this.getActiveSheetId() === sheet.id) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: sheet.id,
        sheetIdTo: visibleSheets[Math.max(0, currentIndex - 1)],
      });
    }
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
      // Update all the formulas.
      this.updateColumnsFormulas(column, -1, sheet);

      // Move the cells.
      this.moveCellsHorizontally(column, -1, sheet);

      // Effectively delete the element and recompute the left-right.
      this.manageColumnsHeaders(column, -1, sheet);
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
  private removeRows(sheet: Sheet, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    const consecutiveRows = rows.reduce((groups, currentRow, index, rows) => {
      if (currentRow - rows[index - 1] === -1) {
        const lastGroup = groups[groups.length - 1];
        lastGroup.push(currentRow);
      } else {
        groups.push([currentRow]);
      }
      return groups;
    }, [] as number[][]);

    for (let group of consecutiveRows) {
      // Update all the formulas.
      this.updateRowsFormulas(group[0], -group.length, sheet);

      // Move the cells.
      this.moveCellVerticallyBatched(group[group.length - 1], group[0], sheet);

      // Effectively delete the element and recompute the left-right/top-bottom.
      group.map((row) => this.processRowsHeaderDelete(row, sheet));
    }
  }

  private addColumns(sheet: Sheet, column: number, position: "before" | "after", quantity: number) {
    // Update all the formulas.
    this.updateColumnsFormulas(position === "before" ? column - 1 : column, quantity, sheet);

    // Move the cells.
    this.moveCellsHorizontally(position === "before" ? column : column + 1, quantity, sheet);

    // Recompute the left-right/top-bottom.
    this.manageColumnsHeaders(column, quantity, sheet);
  }

  private addRows(sheet: Sheet, row: number, position: "before" | "after", quantity: number) {
    for (let i = 0; i < quantity; i++) {
      this.addEmptyRow();
    }
    // Update all the formulas.
    this.updateRowsFormulas(position === "before" ? row - 1 : row, quantity, sheet);

    // Move the cells.
    this.moveCellsVertically(position === "before" ? row : row + 1, quantity, sheet);

    // Recompute the left-right/top-bottom.
    this.processRowsHeaderAdd(row, quantity);
  }

  /**
   * @param base  column currently being deleted or added
   * @param step  -1 if deleting
   */
  private moveCellsHorizontally(base: number, step: number, sheet: Sheet) {
    return this.processCellsToMove(
      (row, col) => col >= base,
      (row, col) => col !== base || step !== -1,
      (cell: Cell, row: number, col: number) => {
        //TODO: see if UPDATE_CELL_POSITION can work here instead of the full UPDATE_CELL
        return {
          type: "UPDATE_CELL",
          sheetId: sheet.id,
          cellId: cell.id,
          col: col + step,
          row: row,
          border: cell.border,
          style: cell.style,
          content: cell.content,
          format: cell.format,
        };
      },
      sheet
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
  private moveCellVerticallyBatched(deleteFromRow: number, deleteToRow: number, sheet: Sheet) {
    return this.processCellsToMove(
      (row, col) => row >= deleteFromRow,
      (row, col) => row > deleteToRow,
      (cell: Cell, row, col) => {
        //TODO: see if UPDATE_CELL_POSITION can work here instead of the full UPDATE_CELL
        return {
          type: "UPDATE_CELL",
          sheetId: sheet.id,
          cellId: cell.id,
          col: col,
          row: row - (deleteToRow - deleteFromRow + 1),
          border: cell.border,
          style: cell.style,
          content: cell.content,
          format: cell.format,
        };
      },
      sheet
    );
  }

  private moveCellsVertically(base: number, step: number, sheet: Sheet) {
    return this.processCellsToMove(
      (row, col) => row >= base,
      (row, col) => row !== base || step !== -1,
      (cell, row, col) => {
        //TODO: see if UPDATE_CELL_POSITION can work here instead of the full UPDATE_CELL
        return {
          type: "UPDATE_CELL",
          sheetId: sheet.id,
          cellId: cell.id,
          col: col,
          row: row + step,
          border: cell.border,
          style: cell.style,
          content: cell.content,
          format: cell.format,
        };
      },
      sheet
    );
  }

  private manageColumnsHeaders(base: number, step: number, sheet: Sheet) {
    const cols: Col[] = [];
    let start = 0;
    let colIndex = 0;
    for (let i in sheet.cols) {
      if (parseInt(i, 10) === base) {
        if (step !== -1) {
          const { size } = sheet.cols[colIndex];
          for (let a = 0; a < step; a++) {
            cols.push({
              name: numberToLetters(colIndex),
              size,
              start,
              end: start + size,
            });
            start += size;
            colIndex++;
          }
        } else {
          continue;
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

  private processRowsHeaderAdd(index: number, quantity: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = this.activeSheet.rows.map((row) => row.cells);
    for (let i in this.activeSheet.rows) {
      const { size } = this.activeSheet.rows[sizeIndex];
      if (parseInt(i, 10) < index || parseInt(i, 10) >= index + quantity) {
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
    this.history.update("activeSheet", "rows", rows);
  }

  private addEmptyRow() {
    const lastEnd = this.activeSheet.rows[this.activeSheet.rows.length - 1].end;
    const name = (this.activeSheet.rows.length + 1).toString();
    const newRows: Row[] = this.activeSheet.rows.slice();
    const size = 0;
    newRows.push({
      start: lastEnd,
      end: lastEnd + size,
      size,
      name,
      cells: {},
    });
    this.history.update("activeSheet", "rows", newRows);
  }

  private updateColumnsFormulas(base: number, step: number, sheet: Sheet) {
    return this.visitFormulas(sheet.name, (value: string, sheet: string | undefined): string => {
      if (value.includes(":")) {
        return this.updateColumnsRange(value, sheet, base, step);
      }
      return this.updateColumnsRef(value, sheet, base, step);
    });
  }

  private updateRowsFormulas(base: number, step: number, sheet: Sheet) {
    return this.visitFormulas(sheet.name, (value: string, sheet: string | undefined): string => {
      if (value.includes(":")) {
        return this.updateRowsRange(value, sheet, base, step);
      }
      return this.updateRowsRef(value, sheet, base, step);
    });
  }

  private processCellsToMove(
    shouldDelete: (row: number, col: number) => boolean,
    shouldAdd: (row: number, col: number) => boolean,
    buildCellToAdd: (cell: Cell, row: number, col: number) => UpdateCellCommand,
    sheet: Sheet
  ) {
    const deleteCommands: Command[] = [];
    const addCommands: Command[] = [];

    for (let [r, currentRow] of Object.entries(this.sheets[sheet.id]?.rows || {})) {
      if (currentRow) {
        for (let c in currentRow.cells) {
          const cell = currentRow.cells[c];
          if (cell) {
            const rowIndex = Number(r);
            const colIndex = Number(c);
            if (shouldDelete(rowIndex, colIndex)) {
              deleteCommands.push({
                type: "CLEAR_CELL",
                sheetId: sheet.id,
                col: colIndex,
                row: rowIndex,
              });
              if (shouldAdd(rowIndex, colIndex)) {
                addCommands.push(buildCellToAdd(cell, rowIndex, colIndex));
              }
            }
          }
        }
      }
    }

    for (let cmd of deleteCommands) {
      this.dispatch(cmd.type, cmd);
    }
    for (let cmd of addCommands) {
      this.dispatch(cmd.type, cmd);
    }
  }

  // ---------------------------------------------------------------------------
  // Cols/Rows addition/deletion offsets manipulation
  // ---------------------------------------------------------------------------

  /**
   * Update a reference by applying an offset to the column
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateColumnsRef = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let x = toCartesian(ref)[0];
    if (x === base && step === -1) {
      return "#REF";
    }
    return this.updateReference(ref, x > base ? step : 0, 0, this.getSheetIdByName(sheetId), false);
  };

  /**
   * Update a part of a range by appling an offset. If the current column is
   * removed, adapt the range accordingly
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   * @param direction 1 if it's the left part, -1 if it's the right part
   */
  private updateColumnsRangePart = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number,
    direction: number
  ): string => {
    let [x, y] = toCartesian(ref);
    if (x === base && step === -1) {
      x += direction;
    }
    const [xcRef] = this.updateColumnsRef(toXC(x, y), sheetId, base, step).split("!").reverse();
    return xcRef;
  };

  /**
   * Update a full range by appling an offset.
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateColumnsRange = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let [left, right] = ref.split(":");
    left = this.updateColumnsRangePart(left, sheetId, base, step, 1);
    right = this.updateColumnsRangePart(right, sheetId, base, step, -1);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    const columnLeft = toCartesian(left)[0];
    const columnRight = toCartesian(right)[0];
    if (columnLeft > columnRight) {
      return "#REF";
    }
    if (left === right) {
      return left;
    }
    const range = `${left}:${right}`;
    return sheetId ? `${sheetId}!${range}` : range;
  };

  /**
   * Update a reference by applying an offset to the row
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateRowsRef = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let y = toCartesian(ref)[1];
    if (base + step < y && y <= base) {
      return "#REF";
    }
    return this.updateReference(ref, 0, y > base ? step : 0, this.getSheetIdByName(sheetId), false);
  };

  /**
   * Update a part of a range by applying an offset. If the current row is
   * removed, adapt the range accordingly
   *
   * @param value
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added/removed (negative when removed)
   * @param direction 1 if it's the left part, -1 if it's the right part
   */
  private updateRowsRangePart = (
    value: string,
    sheetId: UID | undefined,
    base: number,
    step: number,
    direction: number
  ): string => {
    let [x, y] = toCartesian(value);
    if (base + step < y && y <= base) {
      if (direction === -1) {
        y = Math.max(base, y) + step;
      }
      step = 0;
    }
    const [xcRef] = this.updateRowsRef(toXC(x, y), sheetId, base, step).split("!").reverse();
    return xcRef;
  };

  /**
   * Update a full range by applying an offset.
   *
   * @param value
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added/removed (negative when removed)
   */
  private updateRowsRange = (
    value: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let [left, right] = value.split(":");
    left = this.updateRowsRangePart(left, sheetId, base, step, 1);
    right = this.updateRowsRangePart(right, sheetId, base, step, -1);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    const rowLeft = toCartesian(left)[1];
    const rowRight = toCartesian(right)[1];
    if (rowLeft > rowRight) {
      return "#REF";
    }
    if (left === right) {
      return left;
    }
    const range = `${left}:${right}`;
    return sheetId ? `${sheetId}!${range}` : range;
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Update a range with some offsets
   */
  private updateRange(
    symbol: string,
    offsetX: number,
    offsetY: number,
    sheetId: UID | undefined
  ): string {
    let [left, right] = symbol.split(":");
    left = this.updateReference(left, offsetX, offsetY, sheetId);
    right = this.updateReference(right, offsetX, offsetY, sheetId);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    //As updateReference put the sheet in the ref, we need to remove it from the right part
    right = right.split("!").pop()!;
    return `${left}:${right}`;
  }

  /**
   * Update a reference with some offsets.
   */
  private updateReference(
    symbol: string,
    offsetX: number,
    offsetY: number,
    sheetId: UID | undefined,
    updateFreeze: boolean = true
  ): string {
    const xc = symbol.replace(/\$/g, "");
    let [x, y] = toCartesian(xc);
    const freezeCol = symbol.startsWith("$");
    const freezeRow = symbol.includes("$", 1);
    x += freezeCol && updateFreeze ? 0 : offsetX;
    y += freezeRow && updateFreeze ? 0 : offsetY;
    const sheet = this.getters.getSheet(sheetId || this.getters.getActiveSheetId());
    if (!sheet || x < 0 || x >= sheet.colNumber || y < 0 || y >= sheet.rowNumber) {
      return "#REF";
    }
    const sheetName = sheetId && getComposerSheetName(this.getters.getSheetName(sheetId)!);
    return (
      (sheetName ? `${sheetName}!` : "") +
      (freezeCol ? "$" : "") +
      numberToLetters(x) +
      (freezeRow ? "$" : "") +
      String(y + 1)
    );
  }
  private visitAllFormulasSymbols(cb: (value: string, sheetId: UID) => string) {
    for (let sheetId in this.sheets) {
      //const sheet = this.sheets[sheetId];
      const cells = this.getters.getCells(sheetId);
      for (let [cellId, cell] of Object.entries(cells)) {
        if (cell.type === "formula") {
          const content = rangeTokenize(cell.content!)
            .map((t) => {
              if (t.type === "SYMBOL" && cellReference.test(t.value)) {
                return cb(t.value, sheetId);
              }
              return t.value;
            })
            .join("");
          if (content !== cell.content) {
            const position = this.getters.getCellPosition(cellId);
            this.dispatch("UPDATE_CELL", {
              sheetId: sheetId,
              col: position.col,
              row: position.row,
              content,
            });
          }
        }
      }
    }
  }

  /**
   * Apply a function to update the formula on every cells of every sheets which
   * contains a formula
   * @param sheetNameToFind
   * @param cb Update formula function to apply
   */
  private visitFormulas(
    sheetNameToFind: string,
    cb: (value: string, sheet: string | undefined) => string
  ) {
    this.visitAllFormulasSymbols((content: string, sheetId: UID): string => {
      let [value, sheetRef] = content.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === sheetNameToFind) {
          return cb(value, sheetRef);
        }
      } else if (this.sheetIds[sheetNameToFind] === sheetId) {
        return cb(value, undefined);
      }
      return content;
    });
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
