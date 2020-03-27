import { BasePlugin } from "../base_plugin";
import { GridCommand, Style, Zone, BorderCommand, Border, Cell } from "../types";
import { selectedCell, getCell, addCell, deleteCell } from "../core";
import { stringify, toXC } from "../../helpers";
import { updateCell } from "../history";
import { DEFAULT_FONT_WEIGHT, DEFAULT_FONT_SIZE, DEFAULT_FONT } from "../../constants";
import { fontSizeMap } from "../../fonts";
import { WorkbookData, DEFAULT_STYLE } from "../import_export";

/**
 * Manage:
 * - styles
 * - borders
 * - value formatters
 */

const commandToSides = {
  top: ["top"],
  left: ["left"],
  right: ["right"],
  bottom: ["bottom"],
  all: ["top", "left", "bottom", "right"]
};

export class FormattingPlugin extends BasePlugin {
  static getters = [
    "getCurrentStyle",
    "getCellWidth",
    "getCellHeight",
    "getCellStyle",
    "getCellBorder"
  ];
  private ctx = document.createElement("canvas").getContext("2d")!;

  styles: { [key: number]: Style } = {};
  borders: { [key: number]: Border } = {};

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if (cmd.style) {
          this.setStyle(cmd.sheet, cmd.target, cmd.style);
        }
        if (cmd.border) {
          for (let zone of cmd.target) {
            this.setBorder(cmd.sheet, zone, cmd.border);
          }
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.target);
        break;
      case "SET_FORMATTER":
        this.setFormatter(cmd.sheet, cmd.target, cmd.formatter);
        break;
    }
  }

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

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  getCurrentStyle(): Style {
    const cell = selectedCell(this.workbook);
    return cell && cell.style ? this.styles[cell.style] : {};
  }

  setStyle(sheet: string, target: Zone[], style: Style) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.setStyleToCell(col, row, style);
        }
      }
    }
  }

  private setStyleToCell(col: number, row: number, style) {
    const cell = getCell(this.workbook, col, row);
    const currentStyle = cell && cell.style ? this.styles[cell.style] : {};
    const nextStyle = Object.assign({}, currentStyle, style);
    const id = this.registerStyle(nextStyle);
    const xc = toXC(col, row);
    if (cell) {
      updateCell(this.workbook, cell, "style", id);
      delete cell.width;
    } else {
      addCell(this.workbook, xc, { style: id, content: "" });
    }
  }

  private registerStyle(style) {
    const strStyle = stringify(style);
    for (let k in this.styles) {
      if (stringify(this.styles[k]) === strStyle) {
        return parseInt(k, 10);
      }
    }
    const id = this.workbook.nextId++;
    this.styles[id] = style;
    return id;
  }

  // ---------------------------------------------------------------------------
  // Borders
  // ---------------------------------------------------------------------------
  setBorder(sheet: string, zone: Zone, command: BorderCommand) {
    if (command === "clear") {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.clearBorder(sheet, col, row);
        }
      }
      return;
    }
    if (command === "external") {
      this.setBorder(sheet, zone, "left");
      this.setBorder(sheet, zone, "right");
      this.setBorder(sheet, zone, "top");
      this.setBorder(sheet, zone, "bottom");
      return;
    }
    if (command === "hv") {
      this.setBorder(sheet, zone, "h");
      this.setBorder(sheet, zone, "v");
      return;
    }
    const { left, top, right, bottom } = zone;
    if (command === "h") {
      for (let r = top + 1; r <= bottom; r++) {
        this.setBorder(sheet, { left, top: r, right, bottom: r }, "top");
      }
      return;
    }
    if (command === "v") {
      for (let c = left + 1; c <= right; c++) {
        this.setBorder(sheet, { left: c, top, right: c, bottom }, "left");
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
        this.setBorderToCell(sheet, col, row, border);
      }
    }
  }

  clearBorder(sheet: string, col: number, row: number) {
    const cell = getCell(this.workbook, col, row);
    if (cell) {
      if (!cell.content && !cell.style) {
        deleteCell(this.workbook, cell.xc, true);
      } else {
        updateCell(this.workbook, cell, "border", undefined);
      }
    }
    if (col > 0) {
      this.clearSide(sheet, col - 1, row, "right");
    }
    if (row > 0) {
      this.clearSide(sheet, col, row - 1, "bottom");
    }
    if (col < this.workbook.cols.length - 1) {
      this.clearSide(sheet, col + 1, row, "left");
    }
    if (row < this.workbook.rows.length - 1) {
      this.clearSide(sheet, col, row + 1, "top");
    }
  }

  private clearSide(sheet: string, col: number, row: number, side: string) {
    const cell = getCell(this.workbook, col, row);
    if (cell && cell.border) {
      const border = this.borders[cell.border];
      if (side in border) {
        const newBorder = Object.assign({}, border);
        delete newBorder[side];
        if (!cell.content && !cell.style && Object.keys(newBorder).length === 0) {
          deleteCell(this.workbook, cell.xc, true);
        } else {
          const id = this.registerBorder(newBorder);
          updateCell(this.workbook, cell, "border", id);
        }
      }
    }
  }

  private setBorderToCell(sheet: string, col: number, row: number, border: Border) {
    const cell = getCell(this.workbook, col, row);
    const currentBorder = cell && cell.border ? this.borders[cell.border] : {};
    const nextBorder = Object.assign({}, currentBorder, border);
    const id = this.registerBorder(nextBorder);
    if (cell) {
      updateCell(this.workbook, cell, "border", id);
    } else {
      const xc = toXC(col, row);
      addCell(this.workbook, xc, { border: id });
    }
  }

  private registerBorder(border: Border) {
    const strBorder = stringify(border);
    for (let k in this.borders) {
      if (stringify(this.borders[k]) === strBorder) {
        return parseInt(k, 10);
      }
    }
    const id = this.workbook.nextId++;
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
          this.removeFormatting(col, row);
        }
      }
    }
  }

  private removeFormatting(col: number, row: number) {
    const cell = getCell(this.workbook, col, row);
    if (cell) {
      if (cell.content) {
        addCell(this.workbook, cell.xc, { content: cell.content }, { preserveFormatting: false });
      } else {
        deleteCell(this.workbook, cell.xc, true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------------------------

  private setFormatter(sheet: string, zones: Zone[], format: string) {
    for (let zone of zones) {
      for (let rowIndex = zone.top; rowIndex <= zone.bottom; rowIndex++) {
        const row = this.workbook.rows[rowIndex];
        for (let colIndex = zone.left; colIndex <= zone.right; colIndex++) {
          const cell = row.cells[colIndex];
          if (cell) {
            // the undefined fallback is there to make updateCell delete the key
            if (!format && cell.value === "" && !cell.border && !cell.style) {
              deleteCell(this.workbook, cell.xc, true);
            } else {
              updateCell(this.workbook, cell, "format", format || undefined);
            }
          } else if (format) {
            const xc = toXC(colIndex, rowIndex);
            addCell(this.workbook, xc, { format: format });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    if (data.styles) {
      this.styles = data.styles;
    }
    if (data.borders) {
      this.borders = data.borders;
    }
    this.styles[0] = Object.assign({}, DEFAULT_STYLE, this.styles[0]);
  }

  export(data: WorkbookData) {
    data.styles = this.styles;
    data.borders = this.borders;
  }
}

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
