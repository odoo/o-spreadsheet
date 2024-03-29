import { FORMULA_REF_IDENTIFIER, NULL_FORMAT } from "../../constants";
import { cellFactory } from "../../helpers/cells/cell_factory";
import { FormulaCell } from "../../helpers/cells/index";
import { deepEquals, isInside, range, toCartesian, toXC, UuidGenerator } from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  CellData,
  CellDependencies,
  CellValueType,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  RangePart,
  Sheet,
  Style,
  UID,
  UpdateCellData,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<UID, Cell | undefined>>;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "zoneToXC",
    "getCells",
    "getFormulaCellContent",
    "getCellStyle",
    "buildFormulaContent",
    "getCellById",
  ];

  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};
  private cellUuidGenerator = new UuidGenerator(true);
  private createCell = cellFactory(this.getters);

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula()) {
          for (const range of cell.dependencies.references) {
            if (!sheetId || range.sheetId === sheetId) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "dependencies" as any,
                  "references",
                  cell.dependencies.references.indexOf(range),
                  change.range
                );
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    switch (cmd.type) {
      case "UPDATE_CELL":
      case "CLEAR_CELL":
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
        this.updateCell(this.getters.getSheet(cmd.sheetId), cmd.col, cmd.row, cmd);
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
  private setFormatter(sheetId: UID, zones: Zone[], format: string) {
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
    fn: (sheet: Sheet, styleRef: number, elements: number[]) => void
  ) {
    const sheet = this.getters.getSheet(cmd.sheetId);
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: number[];
    let styleReference: number;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(sheet, styleReference, insertedElements);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const imported_sheet = this.getters.getSheet(sheet.id);
      // cells
      for (let xc in sheet.cells) {
        const cellData = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        if (cellData?.content || cellData?.format || cellData?.style) {
          const cell = this.importCell(imported_sheet, cellData, data.styles);
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cell,
            cellId: cell.id,
            col,
            row,
            sheetId: sheet.id,
          });
        }
      }
    }
  }

  export(data: WorkbookData) {
    let styleId = 0;
    const styles: { [styleId: number]: Style } = {};

    /**
     * Get the id of the given style. If the style does not exist, it creates
     * one.
     */
    function getStyleId(style: Style) {
      for (let [key, value] of Object.entries(styles)) {
        if (deepEquals(value, style)) {
          return parseInt(key, 10);
        }
      }
      styles[++styleId] = style;
      return styleId;
    }

    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      const positions = Object.keys(this.cells[_sheet.id] || {})
        .map((cellId) => this.getters.getCellPosition(cellId))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const { col, row } of positions) {
        const cell = this.getters.getCell(_sheet.id, col, row)!;
        const xc = toXC(col, row);

        cells[xc] = {
          style: cell.style && getStyleId(cell.style),
          format: cell.format,
          content: cell.content,
        };
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
  }

  importCell(sheet: Sheet, cellData: CellData, normalizedStyles: { [key: number]: Style }): Cell {
    const style = (cellData.style && normalizedStyles[cellData.style]) || undefined;
    const cellId = this.cellUuidGenerator.uuidv4();
    const properties = { format: cellData?.format, style };
    return this.createCell(cellId, cellData?.content || "", properties, sheet.id);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
    for (let sheet of data.sheets) {
      for (const xc in sheet.cells) {
        const [col, row] = toCartesian(xc);
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
    return this.cells[sheetId] || {};
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: UID): Cell | undefined {
    // this must be as fast as possible
    const position = this.getters.getCellPosition(cellId);
    const sheet = this.cells[position.sheetId];
    return sheet[cellId];
  }

  /**
   * Reconstructs the original formula string based on a normalized form and its dependencies
   */
  buildFormulaContent(sheetId: UID, formula: string, dependencies: CellDependencies): string {
    let newContent = formula;
    for (let [index, range] of Object.entries(dependencies.references)) {
      const xc = this.getters.getRangeString(range, sheetId);
      const stringPosition = `\\${FORMULA_REF_IDENTIFIER}${index}\\${FORMULA_REF_IDENTIFIER}`;
      newContent = newContent.replace(new RegExp(stringPosition, "g"), xc);
    }
    for (let [index, d] of Object.entries(dependencies.strings)) {
      const stringPosition = `\\${FORMULA_REF_IDENTIFIER}S${index}\\${FORMULA_REF_IDENTIFIER}`;
      newContent = newContent.replace(new RegExp(stringPosition, "g"), `"${d}"`);
    }
    for (let [index, d] of Object.entries(dependencies.numbers)) {
      const stringPosition = `\\${FORMULA_REF_IDENTIFIER}N${index}\\${FORMULA_REF_IDENTIFIER}`;
      newContent = newContent.replace(new RegExp(stringPosition, "g"), d.toString());
    }
    return newContent;
  }

  getFormulaCellContent(sheetId: UID, cell: FormulaCell): string {
    return this.buildFormulaContent(sheetId, cell.normalizedText, cell.dependencies);
  }

  getCellStyle(cell: Cell): Style {
    return cell.style || {};
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
    const cellTopLeft = this.getters.getMainCell(sheetId, zone.left, zone.top);
    const cellBotRight = this.getters.getMainCell(sheetId, zone.right, zone.bottom);
    const sameCell = cellTopLeft[0] == cellBotRight[0] && cellTopLeft[1] == cellBotRight[1];
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
  private copyColumnStyle(sheet: Sheet, refColumn: number, targetCols: number[]) {
    for (let row = 0; row < sheet.rows.length; row++) {
      const format = this.getFormat(sheet.id, refColumn, row);
      if (format.style || format.format) {
        for (let col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId: sheet.id, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheet: Sheet, refRow: number, targetRows: number[]) {
    for (let col = 0; col < sheet.cols.length; col++) {
      const format = this.getFormat(sheet.id, col, refRow);
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId: sheet.id, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(sheetId: UID, col: number, row: number): { style?: Style; format?: string } {
    const format: { style?: Style; format?: string } = {};
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
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

  private updateCell(sheet: Sheet, col: number, row: number, after: UpdateCellData) {
    const before = sheet.rows[row].cells[col];
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
        this.history.update("cells", sheet.id, before.id, undefined);
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: before.id,
          col,
          row,
          sheetId: sheet.id,
          cell: undefined,
        });
      }
      return;
    }

    const cellId = before?.id || this.cellUuidGenerator.uuidv4();
    const didContentChange = hasContent;
    const properties = { format, style };
    const cell = this.createCell(cellId, afterContent, properties, sheet.id);
    if (before && !didContentChange && cell.isFormula()) {
      // content is not re-evaluated if the content did not change => reassign the value manually
      // TODO this plugin should not care about evaluation
      // and evaluation should not depend on implementation details here.
      // Task 2813749
      cell.assignValue(before.evaluated.value);
      if (before.evaluated.type === CellValueType.error) {
        cell.assignError(before.evaluated.value, before.evaluated.error);
      }
    }
    this.history.update("cells", sheet.id, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cell, cellId: cell.id, col, row, sheetId: sheet.id });
  }

  private checkCellOutOfSheet(sheetId: UID, col: number, row: number): CommandResult {
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.InvalidSheetId;
    const sheetZone = {
      top: 0,
      left: 0,
      bottom: sheet.rows.length - 1,
      right: sheet.cols.length - 1,
    };
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }
}
