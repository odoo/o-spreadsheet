import { DATETIME_FORMAT, DEFAULT_ERROR_MESSAGE } from "../../constants";
import { compile, normalize } from "../../formulas/index";
import { FORMULA_REF_IDENTIFIER } from "../../formulas/tokenizer";
import { formatDateTime, parseDateTime } from "../../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isInside,
  isNumber,
  maximumDecimalPlaces,
  parseNumber,
  range,
  stringify,
  toCartesian,
  toXC,
} from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  CellData,
  CellPosition,
  CellType,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  FormulaCell,
  Range,
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
    "getCellText",
    "getCellValue",
    "getCellStyle",
    "buildFormulaContent",
  ];

  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.type === CellType.formula) {
          for (const range of cell.dependencies) {
            if (!sheetId || range.sheetId === sheetId) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "dependencies" as any,
                  cell.dependencies.indexOf(range),
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
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheetId, cmd.target, cmd.step);
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
   * This function allows to adjust the quantity of decimal places after a decimal
   * point on cells containing number value. It does this by changing the cells
   * format. Values aren't modified.
   *
   * The change of the decimal quantity is done one by one, the sign of the step
   * variable indicates whether we are increasing or decreasing.
   *
   * If several cells are in the zone, the format resulting from the change of the
   * first cell (with number type) will be applied to the whole zone.
   */
  private setDecimal(sheetId: UID, zones: Zone[], step: number) {
    // Find the first cell with a number value and get the format
    const numberFormat = this.searchNumberFormat(sheetId, zones);
    if (numberFormat !== undefined) {
      // Depending on the step sign, increase or decrease the decimal representation
      // of the format
      const newFormat = this.changeDecimalFormat(numberFormat, step);
      // Apply the new format on the whole zone
      this.setFormatter(sheetId, zones, newFormat!);
    }
  }

  /**
   * Take a range of cells and return the format of the first cell containing a
   * number value. Returns a default format if the cell hasn't format. Returns
   * undefined if no number value in the range.
   */
  private searchNumberFormat(sheetId: UID, zones: Zone[]): string | undefined {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(sheetId, col, row);
          if (
            cell &&
            (cell.type === CellType.number ||
              (cell.type === CellType.formula && typeof cell.value === "number")) &&
            !cell.format?.match(DATETIME_FORMAT) // reject dates
          ) {
            return cell.format || this.setDefaultNumberFormat(cell.value as any);
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Function used to give the default format of a cell with a number for value.
   * It is considered that the default format of a number is 0 followed by as many
   * 0 as there are decimal places.
   *
   * Example:
   * - 1 --> '0'
   * - 123 --> '0'
   * - 12345 --> '0'
   * - 42.1 --> '0.0'
   * - 456.0001 --> '0.0000'
   */
  private setDefaultNumberFormat(cellValue: number): string {
    const strValue = cellValue.toString();
    const parts = strValue.split(".");
    if (parts.length === 1) {
      return "0";
    }
    return "0." + Array(parts[1].length + 1).join("0");
  }

  /**
   * This function take a cell format representation and return a new format representation
   * with more or less decimal places.
   *
   * If the format doesn't look like a digital format (means that not contain '0')
   * or if this one cannot be increased or decreased, the returned format will be
   * the same.
   *
   * This function aims to work with all possible formats as well as custom formats.
   *
   * Examples of format changed by this function:
   * - "0" (step = 1) --> "0.0"
   * - "0.000%" (step = 1) --> "0.0000%"
   * - "0.00" (step = -1) --> "0.0"
   * - "0%" (step = -1) --> "0%"
   * - "#,##0.0" (step = -1) --> "#,##0"
   * - "#,##0;0.0%;0.000" (step = 1) --> "#,##0.0;0.00%;0.0000"
   */
  private changeDecimalFormat(format: string, step: number): string {
    const sign = Math.sign(step);
    // According to the representation of the cell format. A format can contain
    // up to 4 sub-formats which can be applied depending on the value of the cell
    // (among positive / negative / zero / text), each of these sub-format is separated
    // by ';' in the format. We need to make the change on each sub-format.
    const subFormats = format.split(";");
    let newSubFormats: string[] = [];

    for (let subFormat of subFormats) {
      const decimalPointPosition = subFormat.indexOf(".");
      const exponentPosition = subFormat.toUpperCase().indexOf("E");
      let newSubFormat: string;

      // the 1st step is to find the part of the zeros located before the
      // exponent (when existed)
      const subPart = exponentPosition > -1 ? subFormat.slice(0, exponentPosition) : subFormat;
      const zerosAfterDecimal =
        decimalPointPosition > -1 ? subPart.slice(decimalPointPosition).match(/0/g)!.length : 0;

      // the 2nd step is to add (or remove) zero after the last zeros obtained in
      // step 1
      const lastZeroPosition = subPart.lastIndexOf("0");
      if (lastZeroPosition > -1) {
        if (sign > 0) {
          // in this case we want to add decimal information
          if (zerosAfterDecimal < maximumDecimalPlaces) {
            newSubFormat =
              subFormat.slice(0, lastZeroPosition + 1) +
              (zerosAfterDecimal === 0 ? ".0" : "0") +
              subFormat.slice(lastZeroPosition + 1);
          } else {
            newSubFormat = subFormat;
          }
        } else {
          // in this case we want to remove decimal information
          if (zerosAfterDecimal > 0) {
            // remove last zero
            newSubFormat =
              subFormat.slice(0, lastZeroPosition) + subFormat.slice(lastZeroPosition + 1);
            // if a zero always exist after decimal point else remove decimal point
            if (zerosAfterDecimal === 1) {
              newSubFormat =
                newSubFormat.slice(0, decimalPointPosition) +
                newSubFormat.slice(decimalPointPosition + 1);
            }
          } else {
            // zero after decimal isn't present, we can't remove zero
            newSubFormat = subFormat;
          }
        }
      } else {
        // no zeros are present in this format, we do nothing
        newSubFormat = subFormat;
      }
      newSubFormats.push(newSubFormat);
    }
    return newSubFormats.join(";");
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
    // Styles
    for (let sheet of data.sheets) {
      const imported_sheet = this.getters.getSheet(sheet.id);
      // cells
      for (let xc in sheet.cells) {
        const cell = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        const style = (cell && cell.style && data.styles[cell.style]) || undefined;
        this.updateCell(imported_sheet, col, row, {
          content: cell?.content,
          formula: cell?.formula,
          format: cell?.format,
          style,
        });
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
        if (stringify(value) === stringify(style)) {
          return parseInt(key, 10);
        }
      }
      styles[++styleId] = style;
      return styleId;
    }
    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      for (let [cellId, cell] of Object.entries(this.cells[_sheet.id] || {})) {
        let position: CellPosition = this.getters.getCellPosition(cellId);
        let xc = toXC(position.col, position.row);

        cells[xc] = {
          style: cell.style && getStyleId(cell.style),
          format: cell.format,
        };

        switch (cell.type) {
          case CellType.formula:
            cells[xc].formula = {
              text: cell.formula.text || "",
              dependencies:
                cell.dependencies?.map((d) => this.getters.getRangeString(d, _sheet.id)) || [],
              value: cell.value,
            };
            break;
          case CellType.number:
          case CellType.text:
          case CellType.invalidFormula:
            cells[xc].content = cell.content;
            break;
        }
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    return this.cells[sheetId] || {};
  }

  buildFormulaContent(sheetId: UID, formula: string, dependencies: Range[]): string {
    let newDependencies = dependencies.map((x, i) => {
      return {
        stringDependency: this.getters.getRangeString(x, sheetId),
        stringPosition: `\\${FORMULA_REF_IDENTIFIER}${i}\\${FORMULA_REF_IDENTIFIER}`,
      };
    });
    let newContent = formula;
    if (newDependencies) {
      for (let d of newDependencies) {
        newContent = newContent.replace(new RegExp(d.stringPosition, "g"), d.stringDependency);
      }
    }
    return newContent;
  }

  getFormulaCellContent(sheetId: UID, cell: FormulaCell): string {
    return this.buildFormulaContent(sheetId, cell.formula.text, cell.dependencies);
  }

  getCellValue(cell: Cell, sheetId: UID, showFormula: boolean = false): any {
    let value: unknown;
    if (showFormula) {
      if (cell.type === CellType.formula) {
        value = this.getters.getFormulaCellContent(sheetId, cell);
      } else {
        value = cell.type === CellType.invalidFormula ? cell.content : cell.value;
      }
    } else {
      value = cell.value;
    }
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        return formatStandardNumber(value);
      case "object":
        return "0";
    }
    return (value && (value as any).toString()) || "";
  }

  getCellText(cell: Cell, sheetId: UID, showFormula: boolean = false): string {
    let value: unknown;

    if (showFormula) {
      if (cell.type === CellType.formula) {
        value = this.getters.getFormulaCellContent(sheetId, cell);
      } else {
        value = cell.type === CellType.invalidFormula ? cell.content : cell.value;
      }
    } else {
      value = cell.value;
    }
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        const shouldFormat = (value || value === 0) && cell.format && !cell.error;
        const dateTimeFormat = shouldFormat && cell.format!.match(DATETIME_FORMAT);
        if (dateTimeFormat) {
          return formatDateTime({ value, format: cell.format! });
        }
        const numberFormat = shouldFormat && !dateTimeFormat;
        if (numberFormat) {
          return formatNumber(value, cell.format!);
        }
        return formatStandardNumber(value);
      case "object":
        return "0";
    }
    return (value && (value as any).toString()) || "";
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
  zoneToXC(sheetId: UID, zone: Zone): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);
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
    const afterContent = after.content ? after.content.replace(nbspRegexp, "") : "";
    const style = after.style !== undefined ? after.style : (before && before.style) || 0;
    let format = "format" in after ? after.format : (before && before.format) || "";

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (before?.type === CellType.empty || !before))) &&
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

    // compute the new cell value
    const didContentChange = hasContent;
    let cell: Cell;
    if (before && !didContentChange) {
      cell = Object.assign({}, before);
    } else {
      // the current content cannot be reused, so we need to recompute the
      // derived
      const cellId = before?.id || this.uuidGenerator.uuidv4();

      let formulaString = after.formula;
      if (!formulaString && afterContent[0] === "=") {
        formulaString = normalize(afterContent || "");
      }

      if (formulaString) {
        try {
          const compiledFormula = compile(formulaString);
          let ranges: Range[] = [];

          for (let xc of formulaString.dependencies) {
            // todo: remove the actual range from the cell and only keep the range Id
            ranges.push(this.getters.getRangeFromSheetXC(sheet.id, xc));
          }

          cell = {
            id: cellId,
            type: CellType.formula,
            formula: {
              compiledFormula: compiledFormula,
              text: formulaString.text,
            },
            dependencies: ranges,
          } as FormulaCell;

          if (!format && !after.formula) {
            format = this.computeFormulaFormat(cell);
          }
        } catch (e) {
          cell = {
            id: cellId,
            type: CellType.invalidFormula,
            content: afterContent,
            value: "#BAD_EXPR",
            error: e.message || DEFAULT_ERROR_MESSAGE,
          };
        }
      } else if (afterContent === "") {
        cell = {
          id: cellId,
          type: CellType.empty,
          value: "",
        };
      } else if (isNumber(afterContent)) {
        cell = {
          id: cellId,
          type: CellType.number,
          content: afterContent,
          value: parseNumber(afterContent),
        };
        if (!format && afterContent.includes("%")) {
          format = afterContent.includes(".") ? "0.00%" : "0%";
        }
      } else {
        const internaldate = parseDateTime(afterContent);
        if (internaldate !== null) {
          cell = {
            id: cellId,
            type: CellType.number,
            content: internaldate.value.toString(),
            value: internaldate.value,
          };
          if (!format) {
            format = internaldate.format;
          }
        } else {
          const contentUpperCase = afterContent.toUpperCase();
          cell = {
            id: cellId,
            type: CellType.text,
            content: afterContent,
            value:
              contentUpperCase === "TRUE"
                ? true
                : contentUpperCase === "FALSE"
                ? false
                : afterContent,
          };
        }
      }
    }

    if (style) {
      cell.style = style;
    } else {
      delete cell.style;
    }
    if (format) {
      cell.format = format;
    } else {
      delete cell.format;
    }

    this.history.update("cells", sheet.id, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cell, cellId: cell.id, col, row, sheetId: sheet.id });
  }

  NULL_FORMAT = "";

  private computeFormulaFormat(cell: FormulaCell): string {
    const dependenciesFormat = cell.formula.compiledFormula.dependenciesFormat;
    const dependencies = cell.dependencies;

    for (let dependencyFormat of dependenciesFormat) {
      switch (typeof dependencyFormat) {
        case "string":
          // dependencyFormat corresponds to a literal format which can be applied
          // directly.
          return dependencyFormat;
        case "number":
          // dependencyFormat corresponds to a dependency cell from which we must
          // find the cell and extract the associated format
          const ref = dependencies[dependencyFormat];
          const sheets = this.getters.getEvaluationSheets();
          const s = sheets[ref.sheetId];
          if (s) {
            // if the reference is a range --> the first cell in the range
            // determines the format
            const cellRef = s.rows[ref.zone.top]?.cells[ref.zone.left];
            if (cellRef && cellRef.format) {
              return cellRef.format;
            }
          }
          break;
      }
    }
    return this.NULL_FORMAT;
  }

  private checkCellOutOfSheet(sheetId: UID, col: number, row: number): CommandResult {
    const sheet = this.getters.getSheet(sheetId);
    const sheetZone = {
      top: 0,
      left: 0,
      bottom: sheet.rows.length - 1,
      right: sheet.cols.length - 1,
    };
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }
}
