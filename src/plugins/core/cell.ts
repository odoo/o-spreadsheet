import { Map } from "immutable";
import { NULL_FORMAT } from "../../constants";
import { cellFactory } from "../../helpers/cells/cell_factory";
import {
  concat,
  getItemId,
  isDefined,
  isInside,
  range,
  toCartesian,
  toXC,
} from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  CellData,
  CellValueType,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Format,
  FormulaCell,
  HeaderIndex,
  Range,
  RangePart,
  Style,
  UID,
  UpdateCellData,
  WorkbookData,
  WorkbookHistory,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

class CoreState {
  private cells: Map<UID, Map<UID, Cell | undefined> | undefined> = Map();

  constructor(private history: WorkbookHistory<any>) {}

  updateCellDependency(sheetId: UID, cellId: UID, range: Range, newRange: Range) {
    const cell = this.cells.get(sheetId)?.get(cellId);
    if (cell && cell.isFormula()) {
      const dependencies = [...cell.dependencies];
      dependencies.splice(cell.dependencies.indexOf(range), 1, newRange);
      const newCell = Object.assign(Object.create(cell), {
        dependencies,
      });
      this.cells = this.cells.updateIn([sheetId, cellId], () => newCell);
    }
  }

  insertCell(sheetId: UID, cellId: UID, cell: Cell) {
    this.cells = this.cells.updateIn([sheetId, cellId], () => cell);
  }

  deleteCell(sheetId: UID, cellId: UID) {
    this.cells = this.cells.updateIn([sheetId, cellId], () => undefined);
  }

  flushHistory() {
    this.history.update("state", "cells", this.cells);
  }

  getCells() {
    return this.cells;
  }
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin {
  static getters = [
    "zoneToXC",
    "getCells",
    "getFormulaCellContent",
    "getCellStyle",
    "buildFormulaContent",
    "getCellById",
  ] as const;

  private state: CoreState = new CoreState(this.history);

  private createCell = cellFactory(this.getters);

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const [id, sheet] of this.state.getCells().entrySeq()) {
      if (!sheet) {
        continue;
      }
      for (const cell of sheet.valueSeq().filter(isDefined)) {
        if (cell.isFormula()) {
          for (const range of cell.dependencies) {
            if (!sheetId || range.sheetId === sheetId) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.state.updateCellDependency(id, cell.id, range, change.range);
              }
            }
          }
        }
      }
    }
    this.state.flushHistory();
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    switch (cmd.type) {
      case "UPDATE_CELL":
        return this.checkCellOutOfSheet(cmd.sheetId, cmd.col, cmd.row);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if ("style" in cmd) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if ("format" in cmd && cmd.format !== undefined) {
          this.setFormatter(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearStyles(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;

      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          style: null,
          format: "",
        });
        break;
    }
  }

  /**
   * Set a format to all the cells in a zone
   */
  private setFormatter(sheetId: UID, zones: Zone[], format: Format) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            format,
          });
        }
      }
    }
  }

  /**
   * Clear the styles of zones
   */
  private clearStyles(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // commandHelpers.updateCell(sheetId, col, row, { style: undefined});
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: null,
          });
        }
      }
    }
  }

  /**
   * Copy the style of the reference column/row to the new columns/rows.
   */
  private handleAddColumnsRows(
    cmd: AddColumnsRowsCommand,
    fn: (sheetId: UID, styleRef: HeaderIndex, elements: HeaderIndex[]) => void
  ) {
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: HeaderIndex[];
    let styleReference: HeaderIndex;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(cmd.sheetId, styleReference, insertedElements);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      // cells
      for (let xc in sheet.cells) {
        const cellData = sheet.cells[xc];
        const { col, row } = toCartesian(xc);
        if (cellData?.content || cellData?.format || cellData?.style) {
          const cell = this.importCell(sheet.id, cellData, data.styles, data.formats);
          this.state.insertCell(sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            col,
            row,
            sheetId: sheet.id,
          });
        }
      }
    }
    this.state.flushHistory();
  }

  export(data: WorkbookData) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};

    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      const positions = Object.keys(this.state.getCells()[_sheet.id] || {})
        .map((cellId) => this.getters.getCellPosition(cellId))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const { col, row } of positions) {
        const cell = this.getters.getCell(_sheet.id, col, row)!;
        const xc = toXC(col, row);

        cells[xc] = {
          style: cell.style ? getItemId<Style>(cell.style, styles) : undefined,
          format: cell.format ? getItemId<Format>(cell.format, formats) : undefined,
          content: cell.content,
        };
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    cellData: CellData,
    normalizedStyles: { [key: number]: Style },
    normalizedFormats: { [key: number]: Format }
  ): Cell {
    const style = (cellData.style && normalizedStyles[cellData.style]) || undefined;
    const format = (cellData.format && normalizedFormats[cellData.format]) || undefined;
    const cellId = this.uuidGenerator.uuidv4();
    const properties = { format, style };
    return this.createCell(cellId, cellData?.content || "", properties, sheetId);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
    for (let sheet of data.sheets) {
      for (const xc in sheet.cells) {
        const { col, row } = toCartesian(xc);
        const cell = this.getters.getCell(sheet.id, col, row)!;
        const exportedCellData = sheet.cells[xc]!;
        exportedCellData.value = cell.evaluated.value;
        exportedCellData.isFormula = cell.isFormula();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    return (this.state.getCells().get(sheetId) || Map()).toJS() as Record<UID, Cell>;
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: UID): Cell | undefined {
    // this must be as fast as possible
    for (const sheetId of this.state.getCells().keySeq()) {
      const sheet = this.state.getCells().get(sheetId);
      const cell = sheet?.get(cellId);
      if (cell) {
        return cell;
      }
    }
    return undefined;
  }

  /*
   * Reconstructs the original formula string based on a normalized form and its dependencies
   */
  buildFormulaContent(sheetId: UID, cell: FormulaCell, dependencies?: Range[]): string {
    const ranges = dependencies || [...cell.dependencies];
    return concat(
      cell.compiledFormula.tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const range = ranges.shift()!;
          return this.getters.getRangeString(range, sheetId);
        }
        return token.value;
      })
    );
  }

  getFormulaCellContent(sheetId: UID, cell: FormulaCell): string {
    return this.buildFormulaContent(sheetId, cell);
  }

  getCellStyle(cell?: Cell): Style {
    return (cell && cell.style) || {};
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(
    sheetId: UID,
    zone: Zone,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top, fixedParts[0]);
    const botRight = toXC(
      zone.right,
      zone.bottom,
      fixedParts.length > 1 ? fixedParts[1] : fixedParts[0]
    );
    const cellTopLeft = this.getters.getMainCellPosition(sheetId, zone.left, zone.top);
    const cellBotRight = this.getters.getMainCellPosition(sheetId, zone.right, zone.bottom);
    const sameCell = cellTopLeft.col === cellBotRight.col && cellTopLeft.row === cellBotRight.row;
    if (topLeft != botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  private setStyle(sheetId: UID, target: Zone[], style: Style | undefined) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell(sheetId, col, row);
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: style ? { ...cell?.style, ...style } : undefined,
          });
        }
      }
    }
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.style || format.format) {
        for (let col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheetId: UID, refRow: HeaderIndex, targetRows: HeaderIndex[]) {
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const format = this.getFormat(sheetId, col, refRow);
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): { style?: Style; format?: Format } {
    const format: { style?: Style; format?: string } = {};
    const { col: mainCol, row: mainRow } = this.getters.getMainCellPosition(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);
    if (cell) {
      if (cell.style) {
        format["style"] = cell.style;
      }
      if (cell.format) {
        format["format"] = cell.format;
      }
    }
    return format;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const before = this.getters.getCell(sheetId, col, row);
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = hasContent
      ? after.content?.replace(nbspRegexp, "") || ""
      : before?.content || "";
    let style: Style | undefined;
    if (after.style !== undefined) {
      style = after.style || undefined;
    } else {
      style = before ? before.style : undefined;
    }
    let format = ("format" in after ? after.format : before && before.format) || NULL_FORMAT;

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || before.isEmpty()))) &&
      !style &&
      !format
    ) {
      if (before) {
        this.state.deleteCell(sheetId, before.id);
        this.state.flushHistory();
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: undefined,
          col,
          row,
          sheetId,
        });
      }
      return;
    }

    const cellId = before?.id || this.uuidGenerator.uuidv4();
    const didContentChange = hasContent;
    const properties = { format, style };
    const cell = this.createCell(cellId, afterContent, properties, sheetId);
    if (before && !didContentChange && cell.isFormula()) {
      // content is not re-evaluated if the content did not change => reassign the value manually
      // TODO this plugin should not care about evaluation
      // and evaluation should not depend on implementation details here.
      // Task 2813749
      cell.assignEvaluation(before.evaluated.value, before.evaluated.format);
      if (before.evaluated.type === CellValueType.error) {
        cell.assignError(before.evaluated.value, before.evaluated.error);
      }
    }
    this.state.insertCell(sheetId, cell.id, cell);
    this.state.flushHistory();
    // this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private checkCellOutOfSheet(sheetId: UID, col: HeaderIndex, row: HeaderIndex): CommandResult {
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.InvalidSheetId;
    const sheetZone = this.getters.getSheetZone(sheetId);
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }
}
