import { DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT } from "../constants";
import { fontSizeMap } from "../fonts";
import { stringify, toCartesian, toXC } from "../helpers/index";
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
  fontSize: 10,
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
    const style = this.styles[cell.style || 0];
    const italic = style.italic ? "italic " : "";
    const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    const size = fontSizeMap[sizeInPt];
    this.ctx.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
    const text = this.getters.getCellText(cell);
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
      sheet: this.workbook.activeSheet.name,
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
    if (col < this.workbook.cols.length - 1) {
      this.clearSide(sheet, col + 1, row, "left", borderMap);
    }
    if (row < this.workbook.rows.length - 1) {
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
            sheet: this.workbook.activeSheet.name,
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
    const length = isColumn ? this.workbook.rows.length : this.workbook.cols.length;
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
            sheet: this.workbook.activeSheet.name,
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
    if (xc in this.workbook.cells) {
      if (this.workbook.cells[xc].border) {
        format["border"] = this.workbook.cells[xc].border;
      }
      if (this.workbook.cells[xc].style) {
        format["style"] = this.workbook.cells[xc].style;
      }
      if (this.workbook.cells[xc].format) {
        format["format"] = this.workbook.cells[xc].format;
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
