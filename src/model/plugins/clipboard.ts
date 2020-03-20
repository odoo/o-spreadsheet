import { applyOffset } from "../../formulas/index";
import { toXC } from "../../helpers";
import { BasePlugin } from "../base_plugin";
import {
  activateCell,
  addCell,
  deleteCell,
  formatCell,
  getCell,
  selectCell,
  setValue
} from "../core";
import { updateCell } from "../history";
import { updateSelection } from "../selection";
import { Cell, CommandResult, GridCommand, NewCell, Zone } from "../types";

// -----------------------------------------------------------------------------
// ClipboardPlugin
// -----------------------------------------------------------------------------
export class ClipboardPlugin extends BasePlugin {
  static getters = ["getClipboardContent"];

  // internal state
  status: "empty" | "visible" | "invisible" = "empty";
  shouldCut?: boolean;
  zones: Zone[] = [];
  cells?: (Cell | null)[][];
  isPaintingFormat: boolean = false;
  onlyFormat: boolean = false;

  predispatch(cmd: GridCommand): CommandResult | void {
    switch (cmd.type) {
      case "PASTE":
        if (!this.isPasteAllowed(cmd.target)) {
          return "CANCELLED";
        }
        break;
    }
  }

  dispatch(cmd: GridCommand) {
    switch (cmd.type) {
      case "COPY":
        this.cutOrCopy(cmd.target, false);
        break;
      case "CUT":
        this.cutOrCopy(cmd.target, true);
        break;
      case "PASTE":
        const onlyFormat = "onlyFormat" in cmd ? !!cmd.onlyFormat : this.isPaintingFormat;
        this.isPaintingFormat = false;
        this.onlyFormat = onlyFormat;
        this.pasteFromModel(cmd.target);
        break;
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(cmd.target, cmd.text);
        break;
      case "ACTIVATE_PAINT_FORMAT":
        this.isPaintingFormat = true;
        this.cutOrCopy(cmd.target, false);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Format the current clipboard to a string suitable for being pasted in other
   * programs.
   *
   * - add a tab character between each concecutive cells
   * - add a newline character between each line
   *
   * Note that it returns \t if the clipboard is empty. This is necessary for the
   * clipboard copy event to add it as data, otherwise an empty string is not
   * considered as a copy content.
   */
  getClipboardContent(): string {
    if (!this.cells) {
      return "\t";
    }
    return (
      this.cells
        .map(cells => {
          return cells.map(c => (c ? formatCell(this.workbook, c) : "")).join("\t");
        })
        .join("\n") || "\t"
    );
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private cutOrCopy(zones: Zone[], cut: boolean) {
    const workbook = this.workbook;
    const tops = new Set(zones.map(z => z.top));
    const bottoms = new Set(zones.map(z => z.bottom));
    const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
    let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];
    clippedZones = clippedZones.map(z => Object.assign({}, z));

    const cells: (Cell | null)[][] = [];
    let { top, bottom } = clippedZones[0];
    for (let r = top; r <= bottom; r++) {
      const row: (Cell | null)[] = [];
      cells.push(row);
      for (let zone of clippedZones) {
        let { left, right } = zone;
        for (let c = left; c <= right; c++) {
          const cell = getCell(workbook, c, r);
          row.push(cell ? Object.assign({}, cell) : null);
        }
      }
    }

    this.status = "visible";
    this.shouldCut = cut;
    this.zones = clippedZones;
    this.cells = cells;
  }

  private pasteFromClipboard(target: Zone[], content: string) {
    const workbook = this.workbook;
    this.status = "invisible";
    const values = content
      .replace(/\r/g, "")
      .split("\n")
      .map(vals => vals.split("\t"));
    const { left: activeCol, top: activeRow } = target[0];
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const xc = toXC(activeCol + j, activeRow + i);
        setValue(workbook, xc, values[i][j]);
      }
    }
  }

  private isPasteAllowed(target: Zone[]): boolean {
    const cells = this.cells;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    return !(cells && target.length > 1 && (cells.length > 1 || cells[0].length > 1));
  }

  private pasteFromModel(target: Zone[]) {
    const { zones, cells, shouldCut, status, workbook } = this;
    if (!zones || !cells || status === "empty") {
      return;
    }
    this.status = shouldCut ? "empty" : "invisible";

    const height = cells.length;
    const width = cells[0].length;
    if (target.length > 1) {
      for (let zone of target) {
        for (let i = zone.left; i <= zone.right; i++) {
          for (let j = zone.top; j <= zone.bottom; j++) {
            this.pasteZone(width, height, i, j);
          }
        }
      }
      return;
    }
    const selection = target[target.length - 1];
    let col = selection.left;
    let row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
    for (let x = 0; x < repX; x++) {
      for (let y = 0; y < repY; y++) {
        this.pasteZone(width, height, col + x * width, row + y * height);
      }
    }

    if (height > 1 || width > 1) {
      const anchor = Object.assign({}, workbook.selection.anchor);
      selectCell(workbook, col, row);
      updateSelection(workbook, col + repX * width - 1, row + repY * height - 1);
      const newCol = clip(anchor.col, col, col + repX * width - 1);
      const newRow = clip(anchor.row, row, row + repY * height - 1);
      workbook.selection.anchor.col = newCol;
      workbook.selection.anchor.row = newRow;
      activateCell(workbook, newCol, newRow);
    }
  }

  private pasteZone(width: number, height: number, col: number, row: number) {
    for (let r = 0; r < height; r++) {
      const rowCells = this.cells![r];
      for (let c = 0; c < width; c++) {
        const xc = toXC(col + c, row + r);
        const originCell = rowCells[c];
        const targetCell = getCell(this.workbook, col + c, row + r);
        if (originCell) {
          let content = originCell.content || "";
          if (originCell.type === "formula") {
            const offsetX = col + c - originCell.col;
            const offsetY = row + r - originCell.row;
            const maxX = this.workbook.cols.length;
            const maxY = this.workbook.rows.length;
            content = applyOffset(content, offsetX, offsetY, maxX, maxY);
          }
          let newCell: NewCell = {
            style: originCell.style,
            border: originCell.border,
            format: originCell.format
          };
          if (this.onlyFormat) {
            newCell.content = targetCell ? targetCell.content : "";
          } else {
            newCell.content = content;
          }

          addCell(this.workbook, xc, newCell);
          if (this.shouldCut) {
            deleteCell(this.workbook, originCell.xc, true);
          }
        }
        if (!originCell && targetCell) {
          if (this.onlyFormat) {
            if (targetCell.style || targetCell.border) {
              updateCell(this.workbook, targetCell, "style", undefined);
              updateCell(this.workbook, targetCell, "border", undefined);
            }
          } else {
            deleteCell(this.workbook, xc, true);
          }
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}
