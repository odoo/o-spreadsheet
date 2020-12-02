import { DEFAULT_BORDER_DESC, DEFAULT_STYLE } from "../../constants";
import {
  stringify,
  toXC,
  maximumDecimalPlaces,
  toZone,
  range,
  toCartesian,
} from "../../helpers/index";
import {
  Border,
  BorderCommand,
  Cell,
  CellType,
  Command,
  Style,
  UID,
  WorkbookData,
  Zone,
  Sheet,
  CommandResult,
  CancelledReason,
  BorderDescription,
  AddRowsCommand,
  AddColumnsCommand,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FormattingPluginState {
  readonly borders: Record<UID, (BorderDescription[] | undefined)[] | undefined>;
}
/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - styles
 * - borders
 * - value formatters
 */
export class FormattingPlugin
  extends CorePlugin<FormattingPluginState>
  implements FormattingPluginState {
  static getters = ["getCellStyle", "getCellBorder"];

  private styles: { [key: number]: Style } = {};
  public readonly borders: FormattingPluginState["borders"] = {};
  private nextId: number = 1;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SET_FORMATTING":
        try {
          this.getters.getSheet(cmd.sheetId);
          break;
        } catch (error) {
          return { status: "CANCELLED", reason: CancelledReason.InvalidSheetId };
        }
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_MERGE":
        if (!cmd.interactive) {
          this.addBordersToMerge(cmd.sheetId, cmd.zone);
        }
        break;
      case "SET_BORDER":
        this.setBorder(cmd.sheetId, cmd.col, cmd.row, cmd.border);
        break;
      case "SET_FORMATTING":
        if (cmd.style) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if (cmd.border) {
          const sheet = this.getters.getSheet(cmd.sheetId);
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          this.setBorders(sheet, target, cmd.border);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.sheetId, cmd.target);
        break;
      case "SET_FORMATTER":
        this.setFormatter(cmd.sheetId, cmd.target, cmd.formatter);
        break;
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheetId, cmd.target, cmd.step);
        break;
      case "REMOVE_COLUMNS":
        for (let col of cmd.columns) {
          this.shiftBordersHorizontally(cmd.sheetId, col + 1, -1);
        }
        break;
      case "REMOVE_ROWS":
        for (let row of cmd.rows) {
          this.shiftBordersVertically(cmd.sheetId, row + 1, -1);
        }
        break;
      case "ADD_COLUMNS":
        this.handleAddColumns(cmd);
        break;
      case "ADD_ROWS":
        this.handleAddRows(cmd);
        break;
    }
  }

  /**
   * Move borders according to the inserted columns.
   * Copy the style of the reference column to the new columns.
   * Ensure borders continuity.
   */
  private handleAddColumns(cmd: AddColumnsCommand) {
    // The new columns have already been inserted in the sheet at this point.
    const sheet = this.getters.getSheet(cmd.sheetId);
    let insertedColumns: number[];
    let styleColumn: number;
    let colLeftOfInsertion: number;
    let colRightOfInsertion: number;
    if (cmd.position === "before") {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.column, cmd.quantity, {
        moveFirstLeftBorder: true,
      });
      insertedColumns = range(cmd.column, cmd.column + cmd.quantity);
      styleColumn = cmd.column + cmd.quantity;
      colLeftOfInsertion = cmd.column - 1;
      colRightOfInsertion = cmd.column + cmd.quantity;
    } else {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.column + 1, cmd.quantity, {
        moveFirstLeftBorder: false,
      });
      insertedColumns = range(cmd.column + 1, cmd.column + cmd.quantity + 1);
      styleColumn = cmd.column;
      colLeftOfInsertion = cmd.column;
      colRightOfInsertion = cmd.column + cmd.quantity + 1;
    }
    this.copyColumnStyle(sheet, styleColumn, insertedColumns);
    this.ensureColumnBorderContinuity(sheet, colLeftOfInsertion, colRightOfInsertion);
  }

  /**
   * Move borders according to the inserted rows.
   * Copy the style of the reference row to the new rows.
   * Ensure borders continuity.
   */
  private handleAddRows(cmd: AddRowsCommand) {
    // The new rows have already been inserted at this point.
    const sheet = this.getters.getSheet(cmd.sheetId);
    let insertedRows: number[];
    let styleRow: number;
    let rowAboveInsertion: number;
    let rowBelowInsertion: number;
    if (cmd.position === "before") {
      this.shiftBordersVertically(sheet.id, cmd.row, cmd.quantity, { moveFirstTopBorder: true });
      insertedRows = range(cmd.row, cmd.row + cmd.quantity);
      styleRow = cmd.row + cmd.quantity;
      rowAboveInsertion = cmd.row - 1;
      rowBelowInsertion = cmd.row + cmd.quantity;
    } else {
      this.shiftBordersVertically(sheet.id, cmd.row + 1, cmd.quantity, {
        moveFirstTopBorder: false,
      });
      styleRow = cmd.row;
      insertedRows = range(cmd.row + 1, cmd.row + cmd.quantity + 1);
      rowAboveInsertion = cmd.row;
      rowBelowInsertion = cmd.row + cmd.quantity + 1;
    }
    this.copyRowStyle(sheet, styleRow, insertedRows);
    this.ensureRowBorderContinuity(sheet, rowAboveInsertion, rowBelowInsertion);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellStyle(cell: Cell): Style {
    return cell.style ? this.styles[cell.style] : {};
  }

  getCellBorder(sheetId: UID, col: number, row: number): Border | null {
    const border = {
      top: this.borders[sheetId]?.[col]?.[row]?.horizontal,
      bottom: this.borders[sheetId]?.[col]?.[row + 1]?.horizontal,
      left: this.borders[sheetId]?.[col]?.[row]?.vertical,
      right: this.borders[sheetId]?.[col + 1]?.[row]?.vertical,
    };
    if (!border.bottom && !border.left && !border.right && !border.top) {
      return null;
    }
    return border;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Ensure border continuity between two columns.
   * If the two columns have the same borders (at each row respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureColumnBorderContinuity(sheet: Sheet, leftColumn: number, rightColumn: number) {
    const targetCols = range(leftColumn + 1, rightColumn);
    for (let row = 0; row < sheet.rows.length; row++) {
      const leftBorder = this.getCellBorder(sheet.id, leftColumn, row);
      const rightBorder = this.getCellBorder(sheet.id, rightColumn, row);
      if (leftBorder && rightBorder) {
        const commonSides = this.getCommonSides(leftBorder, rightBorder);
        for (let col of targetCols) {
          this.addBorder(sheet.id, col, row, commonSides);
        }
      }
    }
  }

  /**
   * Ensure border continuity between two rows.
   * If the two rows have the same borders (at each column respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureRowBorderContinuity(sheet: Sheet, topRow: number, bottomRow: number) {
    const targetRows = range(topRow + 1, bottomRow);
    for (let col = 0; col < sheet.cols.length; col++) {
      const aboveBorder = this.getCellBorder(sheet.id, col, topRow);
      const belowBorder = this.getCellBorder(sheet.id, col, bottomRow);
      if (aboveBorder && belowBorder) {
        const commonSides = this.getCommonSides(aboveBorder, belowBorder);
        for (let row of targetRows) {
          this.addBorder(sheet.id, col, row, commonSides);
        }
      }
    }
  }

  /**
   * From two borders, return a new border with sides defined in both borders.
   * i.e. the intersection of two borders.
   */
  private getCommonSides(border1: Border, border2: Border): Border {
    const commonBorder = {};
    for (let side of ["top", "bottom", "left", "right"]) {
      if (border1[side] && border1[side] === border2[side]) {
        commonBorder[side] = border1[side];
      }
    }
    return commonBorder;
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheet: Sheet, refColumn: number, targetCols: number[]) {
    for (let row = 0; row < sheet.rows.length; row++) {
      const format = this.getFormat(sheet.id, toXC(refColumn, row));
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
      const format = this.getFormat(sheet.id, toXC(col, refRow));
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId: sheet.id, col, row, ...format });
        }
      }
    }
  }

  private setStyle(sheetId: UID, target: Zone[], style: Style) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.setStyleToCell(sheetId, col, row, style);
        }
      }
    }
  }

  private setStyleToCell(sheetId: UID, col: number, row: number, style: Style) {
    const cell = this.getters.getCellByXc(sheetId, toXC(col, row));
    const currentStyle = cell && cell.style ? this.styles[cell.style] : {};
    const nextStyle = Object.assign({}, currentStyle, style);
    const id = this.registerStyle(nextStyle);
    this.dispatch("UPDATE_CELL", {
      sheetId,
      col,
      row,
      style: id,
    });
  }

  private registerStyle(style: Style) {
    const strStyle = stringify(style);
    for (let k in this.styles) {
      if (stringify(this.styles[k]) === strStyle) {
        return parseInt(k, 10);
      }
    }
    const id = this.nextId++;
    this.styles[id] = style;
    return id;
  }

  /**
   * Get all the columns which contains at least a border
   */
  private getColumnsWithBorders(sheetId: UID): number[] {
    const sheetBorders = this.borders[sheetId];
    if (!sheetBorders) return [];
    return Object.keys(sheetBorders).map((index) => parseInt(index, 10));
  }

  /**
   * Get the range of all the rows in the sheet
   */
  private getRowsRange(sheetId: UID): number[] {
    const sheetBorders = this.borders[sheetId];
    if (!sheetBorders) return [];
    const sheet = this.getters.getSheet(sheetId);
    return range(0, sheet.rows.length + 1);
  }

  /**
   * Move borders of a sheet horizontally.
   * @param sheetId
   * @param start starting column (included)
   * @param delta how much borders will be moved (negative if moved to the left)
   */
  private shiftBordersHorizontally(
    sheetId: UID,
    start: number,
    delta: number,
    { moveFirstLeftBorder }: { moveFirstLeftBorder?: boolean } = {}
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    if (delta < 0) {
      this.moveBordersOfColumn(sheetId, start, delta, "vertical", {
        destructive: false,
      });
    }
    this.getColumnsWithBorders(sheetId)
      .filter((col) => col >= start)
      .sort((a, b) => (delta < 0 ? a - b : b - a)) // start by the end when moving up
      .forEach((col) => {
        if ((col === start && moveFirstLeftBorder) || col !== start) {
          this.moveBordersOfColumn(sheetId, col, delta, "vertical");
        }
        this.moveBordersOfColumn(sheetId, col, delta, "horizontal");
      });
  }

  /**
   * Move borders of a sheet vertically.
   * @param sheetId
   * @param start starting row (included)
   * @param delta how much borders will be moved (negative if moved to the above)
   */
  private shiftBordersVertically(
    sheetId: UID,
    start: number,
    delta: number,
    { moveFirstTopBorder }: { moveFirstTopBorder?: boolean } = {}
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    if (delta < 0) {
      this.moveBordersOfRow(sheetId, start, delta, "horizontal", {
        destructive: false,
      });
    }
    this.getRowsRange(sheetId)
      .filter((row) => row >= start)
      .sort((a, b) => (delta < 0 ? a - b : b - a)) // start by the end when moving up
      .forEach((row) => {
        if ((row === start && moveFirstTopBorder) || row !== start) {
          this.moveBordersOfRow(sheetId, row, delta, "horizontal");
        }
        this.moveBordersOfRow(sheetId, row, delta, "vertical");
      });
  }

  /**
   * Moves the borders (left if `vertical` or top if `horizontal` depending on
   * `borderDirection`) of all cells in an entire row `delta` rows to the right
   * (`delta` > 0) or to the left (`delta` < 0).
   * Note that as the left of a cell is the right of the cell-1, if the left is
   * moved the right is also moved. However, if `horizontal`, the bottom border
   * is not moved.
   * It does it by replacing the target border by the moved border. If the
   * argument `destructive` is given false, the target border is preserved if
   * the moved border is empty
   */
  private moveBordersOfRow(
    sheetId: UID,
    row: number,
    delta: number,
    borderDirection: "vertical" | "horizontal",
    { destructive }: { destructive: boolean } = { destructive: true }
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    this.getColumnsWithBorders(sheetId).forEach((col) => {
      const targetBorder = borders[col]?.[row + delta]?.[borderDirection];
      const movedBorder = borders[col]?.[row]?.[borderDirection];
      this.history.update(
        "borders",
        sheetId,
        col,
        row + delta,
        borderDirection,
        destructive ? movedBorder : movedBorder || targetBorder
      );
      this.history.update("borders", sheetId, col, row, borderDirection, undefined);
    });
  }

  /**
   * Moves the borders (left if `vertical` or top if `horizontal` depending on
   * `borderDirection`) of all cells in an entire column `delta` columns below
   * (`delta` > 0) or above (`delta` < 0).
   * Note that as the top of a cell is the bottom of the cell-1, if the top is
   * moved the bottom is also moved. However, if `vertical`, the right border
   * is not moved.
   * It does it by replacing the target border by the moved border. If the
   * argument `destructive` is given false, the target border is preserved if
   * the moved border is empty
   */
  private moveBordersOfColumn(
    sheetId: UID,
    col: number,
    delta: number,
    borderDirection: "vertical" | "horizontal",
    { destructive }: { destructive: boolean } = { destructive: true }
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    this.getRowsRange(sheetId).forEach((row) => {
      const targetBorder = borders[col + delta]?.[row]?.[borderDirection];
      const movedBorder = borders[col]?.[row]?.[borderDirection];
      this.history.update(
        "borders",
        sheetId,
        col + delta,
        row,
        borderDirection,
        destructive ? movedBorder : movedBorder || targetBorder
      );
      this.history.update("borders", sheetId, col, row, borderDirection, undefined);
    });
  }

  /**
   * Set the borders of a cell.
   * Note that it override the current border
   */
  private setBorder(sheetId: UID, col: number, row: number, border?: Border) {
    this.history.update("borders", sheetId, col, row, {
      vertical: border?.left,
      horizontal: border?.top,
    });
    this.history.update("borders", sheetId, col + 1, row, "vertical", border?.right);
    this.history.update("borders", sheetId, col, row + 1, "horizontal", border?.bottom);
  }

  /**
   * Remove the borders of a zone
   */
  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.history.update("borders", sheetId, zone.right + 1, row, "vertical", undefined);
        for (let col = zone.left; col <= zone.right; col++) {
          this.history.update("borders", sheetId, col, row, undefined);
        }
      }
      for (let col = zone.left; col <= zone.right; col++) {
        this.history.update("borders", sheetId, col, zone.bottom + 1, "horizontal", undefined);
      }
    }
  }

  /**
   * Add a border to the existing one to a cell
   */
  private addBorder(sheetId: UID, col: number, row: number, border: Border) {
    this.setBorder(sheetId, col, row, {
      ...this.getCellBorder(sheetId, col, row),
      ...border,
    });
  }

  /**
   * Set the borders of a zone by computing the borders to add from the given
   * command
   */
  private setBorders(sheet: Sheet, zones: Zone[], command: BorderCommand) {
    const sheetId = sheet.id;
    if (command === "clear") {
      return this.clearBorders(sheetId, zones);
    }
    for (let zone of zones) {
      if (command === "h" || command === "hv" || command === "all") {
        for (let row = zone.top + 1; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { top: DEFAULT_BORDER_DESC });
          }
        }
      }
      if (command === "v" || command === "hv" || command === "all") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left + 1; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { left: DEFAULT_BORDER_DESC });
          }
        }
      }
      if (command === "left" || command === "all" || command === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.left, row, { left: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "right" || command === "all" || command === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.right + 1, row, { left: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "top" || command === "all" || command === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.top, { top: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "bottom" || command === "all" || command === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.bottom + 1, { top: DEFAULT_BORDER_DESC });
        }
      }
    }
  }

  /**
   * Note that here, formatting refers to styles+border, not value formatters
   */
  private clearFormatting(sheetId: UID, zones: Zone[]) {
    this.clearBorders(sheetId, zones);
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: 0,
          });
        }
      }
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
      // Aply the new format on the whole zone
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
              (cell.type === CellType.formula && typeof cell.value === "number"))
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
   * This function take a cell format representation and return a new format representtion
   * with more or lesse decimal places.
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
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(sheetId: UID, xc: string): { style?: number; format?: string } {
    const format: { style?: number; format?: string } = {};
    xc = this.getters.getMainCell(sheetId, xc);
    const cell = this.getters.getCellByXc(sheetId, xc);
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

  /**
   * Compute the borders to add to the given zone merged.
   */
  private addBordersToMerge(sheetId: UID, zone: Zone) {
    const sheet = this.getters.getSheet(sheetId);
    const { left, right, top, bottom } = zone;
    const bordersTopLeft = this.getCellBorder(sheet.id, left, top);
    const bordersBottomRight = this.getCellBorder(sheet.id, right, bottom);
    this.clearBorders(sheetId, [zone]);
    if (bordersTopLeft?.top) {
      this.setBorders(sheet, [{ ...zone, bottom: top }], "top");
    }
    if (bordersTopLeft?.left) {
      this.setBorders(sheet, [{ ...zone, right: left }], "left");
    }
    if (bordersBottomRight?.bottom || bordersTopLeft?.bottom) {
      this.setBorders(sheet, [{ ...zone, top: bottom }], "bottom");
    }
    if (bordersBottomRight?.right || bordersTopLeft?.right) {
      this.setBorders(sheet, [{ ...zone, left: right }], "right");
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // Borders
    if (data.borders) {
      for (let sheet of data.sheets) {
        for (let [xc, cell] of Object.entries(sheet.cells)) {
          if (cell?.border) {
            const border = data.borders[cell.border];
            const [col, row] = toCartesian(xc);
            this.setBorder(sheet.id, col, row, border);
          }
        }
      }
    }
    // Styles
    if (data.styles) {
      this.styles = data.styles;
    }
    this.styles[0] = Object.assign({}, DEFAULT_STYLE, this.styles[0]);
    let nextId = 1;
    for (let k in this.styles) {
      nextId = Math.max(k as any, nextId);
    }
    this.nextId = nextId + 1;
    // Merges
    for (let sheetData of data.sheets) {
      if (sheetData.merges) {
        for (let merge of sheetData.merges) {
          this.addBordersToMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    // Borders
    let borderId = 0;
    const borders: { [borderId: number]: Border } = {};
    /**
     * Get the id of the given border. If the border does not exist, it creates
     * one.
     */
    function getBorderId(border: Border) {
      for (let [key, value] of Object.entries(borders)) {
        if (stringify(value) === stringify(border)) {
          return parseInt(key, 10);
        }
      }
      borders[++borderId] = border;
      return borderId;
    }
    for (let sheet of data.sheets) {
      for (let col = 0; col < sheet.colNumber; col++) {
        for (let row = 0; row < sheet.rowNumber; row++) {
          const border = this.getCellBorder(sheet.id, col, row);
          if (border) {
            const xc = toXC(col, row);
            const cell = sheet.cells[xc];
            const borderId = getBorderId(border);
            if (cell) {
              cell.border = borderId;
            } else {
              sheet.cells[xc] = { border: borderId };
            }
          }
        }
      }
    }
    data.borders = borders;
    // Styles
    data.styles = this.styles;
  }
}
