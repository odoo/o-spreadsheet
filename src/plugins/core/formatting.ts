import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  PADDING_AUTORESIZE,
} from "../../constants";
import { fontSizeMap } from "../../fonts";
import {
  stringify,
  toCartesian,
  toXC,
  maximumDecimalPlaces,
  toZone,
  getCellText,
} from "../../helpers/index";
import {
  Border,
  BorderCommand,
  Cell,
  Command,
  Style,
  UID,
  WorkbookData,
  Zone,
  Sheet,
  CommandResult,
  CancelledReason,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

// -----------------------------------------------------------------------------
// Constants / Types / Helpers
// -----------------------------------------------------------------------------

const commandToSides = {
  top: ["top"],
  left: ["left"],
  right: ["right"],
  bottom: ["bottom"],
  all: ["top", "left", "bottom", "right"],
};

const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: DEFAULT_FONT_SIZE,
};

type FormatInfo = {
  border?: number;
  style?: number;
  format?: string;
};

function getTargetZone(zone: Zone, side: string): Zone {
  const { left, right, top, bottom } = zone;
  switch (side) {
    case "left":
      return { left, top, right: left, bottom };
    case "top":
      return { left, top, right, bottom: top };
    case "right":
      return { left: right, top, right, bottom };
    case "bottom":
      return { left, top: bottom, right, bottom };
  }
  return zone;
}

/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - styles
 * - borders
 * - value formatters
 */
export class FormattingPlugin extends CorePlugin {
  static getters = [
    "getCurrentStyle",
    "getCellWidth",
    "getTextWidth",
    "getCellHeight",
    "getCellStyle",
    "getCellBorder",
  ];
  private ctx = document.createElement("canvas").getContext("2d")!;

  private styles: { [key: number]: Style } = {};
  private borders: { [key: number]: Border } = {};
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
          this.addMerge(cmd.sheetId, cmd.zone);
        }
        break;
      case "SET_FORMATTING":
        if (cmd.style) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if (cmd.border) {
          const sheet = this.getters.getSheet(cmd.sheetId);
          this.setBorder(sheet, cmd.target, cmd.border);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.target);
        break;
      case "SET_FORMATTER":
        this.setFormatter(cmd.sheetId, cmd.target, cmd.formatter);
        break;
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheetId, cmd.target, cmd.step);
        break;
      case "ADD_COLUMNS":
        const start_col = cmd.position === "before" ? cmd.column - 1 : cmd.column;
        const end_col = start_col + cmd.quantity + 1;
        this.onAddElements(start_col, end_col, true, cmd.position === "before");
        break;
      case "ADD_ROWS":
        const start_row = cmd.position === "before" ? cmd.row - 1 : cmd.row;
        const end_row = start_row + cmd.quantity + 1;
        this.onAddElements(start_row, end_row, false, cmd.position === "before");
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS", {
              cols: [col],
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          const size = this.getRowMaxHeight(cmd.sheetId, row);
          if (size !== 0) {
            this.dispatch("RESIZE_ROWS", {
              rows: [row],
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellWidth(cell: Cell): number {
    const styleId = cell.style || 0;
    const text = getCellText(cell, this.getters.shouldShowFormulas());
    return this.getTextWidth(text, styleId);
  }

  getTextWidth(text: string, styleId: number = 0): number {
    const style = this.styles[styleId];
    const italic = style.italic ? "italic " : "";
    const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    const size = fontSizeMap[sizeInPt];
    this.ctx.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
    return this.ctx.measureText(text).width;
  }

  getCellHeight(cell: Cell): number {
    const style = this.styles[cell ? cell.style || 0 : 0];
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    return fontSizeMap[sizeInPt];
  }

  getCellStyle(cell: Cell): Style {
    return cell.style ? this.styles[cell.style] : {};
  }

  getCellBorder(cell: Cell): Border | null {
    return cell.border ? this.borders[cell.border] : null;
  }

  getCurrentStyle(): Style {
    const cell = this.getters.getActiveCell();
    return cell && cell.style ? this.styles[cell.style] : {};
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: number): number {
    const cells = this.getters.getColCells(sheetId, index);
    const sizes = cells.map(this.getters.getCellWidth);
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(sheetId: UID, index: number): number {
    const sheet = this.getters.getSheet(sheetId);
    const cells = Object.values(sheet.rows[index].cells);
    const sizes = cells.map(this.getters.getCellHeight);
    return Math.max(0, ...sizes);
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Borders
  // ---------------------------------------------------------------------------

  private setBorder(sheet: Sheet, zones: Zone[], command: BorderCommand) {
    // this object aggregate the desired final border command for a cell
    const borderMap: { [xc: string]: number } = {};
    for (let zone of zones) {
      this.aggregateBorderCommands(sheet, zone, command, borderMap);
    }
    for (let [xc, borderId] of Object.entries(borderMap)) {
      const cell = this.getters.getCellByXc(sheet.id, xc);
      const [col, row] = toCartesian(xc);
      const current = (cell && cell.border) || 0;
      if (current !== borderId) {
        this.dispatch("UPDATE_CELL", {
          sheetId: sheet.id,
          col,
          row,
          border: borderId,
        });
      }
    }
  }

  private aggregateBorderCommands(
    sheet: Sheet,
    zone: Zone,
    command: BorderCommand,
    borderMap: { [xc: string]: number }
  ) {
    if (command === "clear") {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.clearBorder(sheet, col, row, borderMap);
        }
      }
      return;
    }
    if (command === "external") {
      this.aggregateBorderCommands(sheet, zone, "left", borderMap);
      this.aggregateBorderCommands(sheet, zone, "right", borderMap);
      this.aggregateBorderCommands(sheet, zone, "top", borderMap);
      this.aggregateBorderCommands(sheet, zone, "bottom", borderMap);
      return;
    }
    if (command === "hv") {
      this.aggregateBorderCommands(sheet, zone, "h", borderMap);
      this.aggregateBorderCommands(sheet, zone, "v", borderMap);
      return;
    }
    const { left, top, right, bottom } = zone;
    if (command === "h") {
      for (let r = top + 1; r <= bottom; r++) {
        this.aggregateBorderCommands(sheet, { left, top: r, right, bottom: r }, "top", borderMap);
      }
      return;
    }
    if (command === "v") {
      for (let c = left + 1; c <= right; c++) {
        this.aggregateBorderCommands(sheet, { left: c, top, right: c, bottom }, "left", borderMap);
      }
      return;
    }

    const border: Border = {};
    for (let side of commandToSides[command]) {
      border[side] = ["thin", "#000"];
    }

    const target = getTargetZone(zone, command);
    for (let row = target.top; row <= target.bottom; row++) {
      for (let col = target.left; col <= target.right; col++) {
        this.setBorderToMap(sheet, col, row, border, borderMap);
      }
    }
  }

  private clearBorder(sheet: Sheet, col: number, row: number, borderMap: { [xc: string]: number }) {
    const xc = toXC(col, row);
    borderMap[xc] = 0;
    if (col > 0) {
      this.clearSide(sheet, col - 1, row, "right", borderMap);
    }
    if (row > 0) {
      this.clearSide(sheet, col, row - 1, "bottom", borderMap);
    }
    if (col < sheet.cols.length - 1) {
      this.clearSide(sheet, col + 1, row, "left", borderMap);
    }
    if (row < sheet.rows.length - 1) {
      this.clearSide(sheet, col, row + 1, "top", borderMap);
    }
  }

  private clearSide(
    sheet: Sheet,
    col: number,
    row: number,
    side: string,
    borderMap: { [xc: string]: number }
  ) {
    const cell = this.getters.getCell(sheet.id, col, row);
    const xc = toXC(col, row);
    const currentBorderId = xc in borderMap ? borderMap[xc] : cell && cell.border ? cell.border : 0;
    const currentBorder = this.borders[currentBorderId] || {};
    if (side in currentBorder) {
      const newBorder = Object.assign({}, currentBorder);
      delete newBorder[side];
      borderMap[xc] = this.registerBorder(newBorder);
    }
  }

  private setBorderToMap(
    sheet: Sheet,
    col: number,
    row: number,
    border: Border,
    borderMap: { [xc: string]: number }
  ) {
    const cell = this.getters.getCell(sheet.id, col, row);
    const xc = toXC(col, row);
    const currentBorderId = xc in borderMap ? borderMap[xc] : cell && cell.border ? cell.border : 0;
    const currentBorder = this.borders[currentBorderId] || {};
    const nextBorder = Object.assign({}, currentBorder, border);
    const id = this.registerBorder(nextBorder);
    borderMap[xc] = id;
  }

  private registerBorder(border: Border): number {
    if (!Object.keys(border).length) {
      return 0;
    }
    const strBorder = stringify(border);
    for (let k in this.borders) {
      if (stringify(this.borders[k]) === strBorder) {
        return parseInt(k, 10);
      }
    }
    const id = this.nextId++;
    this.borders[id] = border;
    return id;
  }

  // ---------------------------------------------------------------------------
  // Clear formatting
  // ---------------------------------------------------------------------------

  /**
   * Note that here, formatting refers to styles+border, not value formatters
   */
  private clearFormatting(zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.dispatch("UPDATE_CELL", {
            sheetId: this.getters.getActiveSheetId(),
            col,
            row,
            style: 0,
            border: 0,
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------------------------

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
    const numberFormat = this.searchNumberFormat(zones);
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
  private searchNumberFormat(zones: Zone[]): string | undefined {
    const sheetId = this.getters.getActiveSheetId();
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(sheetId, col, row);
          if (
            cell &&
            (cell.type === "number" || (cell.type === "formula" && typeof cell.value === "number"))
          ) {
            return cell.format || this.setDefaultNumberFormat(cell.value);
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

  // ---------------------------------------------------------------------------
  // Grid Manipulation
  // ---------------------------------------------------------------------------

  /**
   * This function computes the style/border of a row/col based on the neighbours.
   *
   * @param start
   * @param end
   * @param isColumn true if element is a column, false if row
   * @param upper true if the style of the upper row/col should be used, false, if the lower should be used
   */
  private onAddElements(start: number, end: number, isColumn: boolean, upper: boolean) {
    const activeSheet = this.getters.getActiveSheet();
    const length = isColumn ? activeSheet.rows.length : activeSheet.cols.length;
    const index = start + 1;
    for (let x = 0; x < length; x++) {
      const xc = isColumn ? toXC(index, x) : toXC(x, index);
      if (this.getters.isInMerge(xc)) {
        continue;
      }
      const format: FormatInfo = {};
      let lowerFormat: FormatInfo = isColumn
        ? this.getFormat(toXC(start, x))
        : this.getFormat(toXC(x, start));
      let upperFormat: FormatInfo = isColumn
        ? this.getFormat(toXC(end, x))
        : this.getFormat(toXC(x, end));
      if (upper) {
        if (upperFormat.style) {
          format["style"] = upperFormat.style;
        }
        if (upperFormat.format) {
          format["format"] = upperFormat.format;
        }
      } else {
        if (lowerFormat.style) {
          format["style"] = lowerFormat.style;
        }
        if (lowerFormat.format) {
          format["format"] = lowerFormat.format;
        }
      }
      if (upperFormat.border && upperFormat.border === lowerFormat.border) {
        format["border"] = upperFormat.border;
      }
      if (Object.keys(format).length !== 0) {
        for (let i = index; i < end; i++) {
          this.dispatch("UPDATE_CELL", {
            sheetId: this.getters.getActiveSheetId(),
            col: isColumn ? i : x,
            row: isColumn ? x : i,
            style: format.style,
            border: format.border,
            format: format.format,
          });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(xc: string): FormatInfo {
    const sheetId = this.getters.getActiveSheetId();
    const format: FormatInfo = {};
    xc = this.getters.getMainCell(xc);
    const cell = this.getters.getCellByXc(sheetId, xc);
    if (cell) {
      if (cell.border) {
        format["border"] = cell.border;
      }
      if (cell.style) {
        format["style"] = cell.style;
      }
      if (cell.format) {
        format["format"] = cell.format;
      }
    }
    return format;
  }

  private addMerge(sheetId: UID, zone: Zone) {
    const sheet = this.getters.getSheet(sheetId);
    if (!sheet) {
      return;
    }
    const { left, right, top, bottom } = zone;
    const topLeft = this.getters.getCell(sheetId, left, top);
    const bottomRight = this.getters.getCell(sheetId, right, bottom) || topLeft;
    const bordersTopLeft = topLeft ? this.getCellBorder(topLeft) : null;
    const bordersBottomRight =
      (bottomRight ? this.getCellBorder(bottomRight) : null) || bordersTopLeft;
    this.setBorder(sheet, [{ left, right, top, bottom }], "clear");
    if (bordersBottomRight && bordersBottomRight.right) {
      const zone = [{ left: right, right, top, bottom }];
      this.setBorder(sheet, zone, "right");
    }
    if (bordersTopLeft && bordersTopLeft.left) {
      const zone = [{ left, right: left, top, bottom }];
      this.setBorder(sheet, zone, "left");
    }
    if (bordersTopLeft && bordersTopLeft.top) {
      const zone = [{ left, right, top, bottom: top }];
      this.setBorder(sheet, zone, "top");
    }
    if (bordersBottomRight && bordersBottomRight.bottom) {
      const zone = [{ left, right, top: bottom, bottom }];
      this.setBorder(sheet, zone, "bottom");
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    if (data.styles) {
      this.styles = data.styles;
    }
    this.styles[0] = Object.assign({}, DEFAULT_STYLE, this.styles[0]);
    if (data.borders) {
      this.borders = data.borders;
    }
    let nextId = 1;
    for (let k in this.styles) {
      nextId = Math.max(k as any, nextId);
    }
    for (let k in this.borders) {
      nextId = Math.max(k as any, nextId);
    }
    this.nextId = nextId + 1;
    const sheets = data.sheets || [];
    for (let sheetData of sheets) {
      if (sheetData.merges) {
        for (let merge of sheetData.merges) {
          this.addMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    data.styles = this.styles;
    data.borders = this.borders;
  }
}
