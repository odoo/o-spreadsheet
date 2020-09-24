import { DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT } from "../constants";
import { fontSizeMap } from "../fonts";
import { stringify, toCartesian, toXC, maximumDecimalPlaces } from "../helpers/index";
import { Border, BorderCommand, Cell, Command, Style, WorkbookData, Zone } from "../types/index";
import { BasePlugin } from "../base_plugin";

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
  fontSize: 11,
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
export class FormattingPlugin extends BasePlugin {
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

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if (cmd.style) {
          this.setStyle(cmd.sheet, cmd.target, cmd.style);
        }
        if (cmd.border) {
          this.setBorder(cmd.sheet, cmd.target, cmd.border);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.target);
        break;
      case "SET_FORMATTER":
        this.setFormatter(cmd.sheet, cmd.target, cmd.formatter);
        break;
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheet, cmd.target, cmd.step);
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
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellWidth(cell: Cell): number {
    const styleId = cell.style || 0;
    const text = this.getters.getCellText(cell);
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
  // Styles
  // ---------------------------------------------------------------------------

  private setStyle(sheet: string, target: Zone[], style: Style) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.setStyleToCell(col, row, style);
        }
      }
    }
  }

  private setStyleToCell(col: number, row: number, style) {
    const cell = this.getters.getCell(col, row);
    const currentStyle = cell && cell.style ? this.styles[cell.style] : {};
    const nextStyle = Object.assign({}, currentStyle, style);
    const id = this.registerStyle(nextStyle);
    this.dispatch("UPDATE_CELL", {
      sheet: this.getters.getActiveSheet(),
      col,
      row,
      style: id,
    });
  }

  private registerStyle(style) {
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

  private setBorder(sheet: string, zones: Zone[], command: BorderCommand) {
    // this object aggregate the desired final border command for a cell
    const borderMap: { [xc: string]: number } = {};
    for (let zone of zones) {
      this.aggregateBorderCommands(sheet, zone, command, borderMap);
    }
    for (let [xc, borderId] of Object.entries(borderMap)) {
      const [col, row] = toCartesian(xc);
      const cell = this.getters.getCell(col, row);
      const current = (cell && cell.border) || 0;
      if (current !== borderId) {
        this.dispatch("UPDATE_CELL", {
          sheet: sheet,
          col,
          row,
          border: borderId,
        });
      }
    }
  }

  private aggregateBorderCommands(
    sheet: string,
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

  private clearBorder(
    sheet: string,
    col: number,
    row: number,
    borderMap: { [xc: string]: number }
  ) {
    const cell = this.getters.getCell(col, row);
    const xc = cell ? cell.xc : toXC(col, row);
    borderMap[xc] = 0;

    if (col > 0) {
      this.clearSide(sheet, col - 1, row, "right", borderMap);
    }
    if (row > 0) {
      this.clearSide(sheet, col, row - 1, "bottom", borderMap);
    }
    if (col < this.getters.getCols().length - 1) {
      this.clearSide(sheet, col + 1, row, "left", borderMap);
    }
    if (row < this.getters.getRows().length - 1) {
      this.clearSide(sheet, col, row + 1, "top", borderMap);
    }
  }

  private clearSide(
    sheet: string,
    col: number,
    row: number,
    side: string,
    borderMap: { [xc: string]: number }
  ) {
    const cell = this.getters.getCell(col, row);
    const xc = cell ? cell.xc : toXC(col, row);
    const currentBorderId = xc in borderMap ? borderMap[xc] : cell && cell.border ? cell.border : 0;
    const currentBorder = this.borders[currentBorderId] || {};
    if (side in currentBorder) {
      const newBorder = Object.assign({}, currentBorder);
      delete newBorder[side];
      borderMap[xc] = this.registerBorder(newBorder);
    }
  }

  private setBorderToMap(
    sheet: string,
    col: number,
    row: number,
    border: Border,
    borderMap: { [xc: string]: number }
  ) {
    const cell = this.getters.getCell(col, row);
    const xc = cell ? cell.xc : toXC(col, row);
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
            sheet: this.getters.getActiveSheet(),
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

  private setFormatter(sheet: string, zones: Zone[], format: string) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.dispatch("UPDATE_CELL", {
            sheet,
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
  private setDecimal(sheet: string, zones: Zone[], step: number) {
    // Find the first cell with a number value and get the format
    const numberFormat = this.searchNumberFormat(zones);
    if (numberFormat !== undefined) {
      // Depending on the step sign, increase or decrease the decimal representation
      // of the format
      const newFormat = this.changeDecimalFormat(numberFormat, step);
      // Aply the new format on the whole zone
      this.setFormatter(sheet, zones, newFormat!);
    }
  }

  /**
   * Take a range of cells and return the format of the first cell containing a
   * number value. Returns a default format if the cell hasn't format. Returns
   * undefined if no number value in the range.
   */
  private searchNumberFormat(zones: Zone[]): string | undefined {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(col, row);
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
   * Exemple:
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
   * @param index the index of the row/col of which we will change the style
   * @param isColumn true if element is a column, false if row
   * @param upper true if the style of the upper row/col should be used, false, if the lower should be used
   */
  private onAddElements(start: number, end: number, isColumn: boolean, upper: boolean) {
    const length = isColumn ? this.getters.getRows().length : this.getters.getCols().length;
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
            sheet: this.getters.getActiveSheet(),
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
   *
   * @param x column number of a cell
   * @param y row number of a cell
   */
  private getFormat(xc: string): FormatInfo {
    const format: FormatInfo = {};
    xc = this.getters.getMainCell(xc);
    if (xc in this.getters.getCells()) {
      if (this.getters.getCells()[xc].border) {
        format["border"] = this.getters.getCells()[xc].border;
      }
      if (this.getters.getCells()[xc].style) {
        format["style"] = this.getters.getCells()[xc].style;
      }
      if (this.getters.getCells()[xc].format) {
        format["format"] = this.getters.getCells()[xc].format;
      }
    }
    return format;
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
  }

  export(data: WorkbookData) {
    data.styles = this.styles;
    data.borders = this.borders;
  }
}
