import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import {
  addCell,
  deleteCell,
  formatCell,
  getCell,
  selectCell,
  setValue,
  activateCell
} from "./core";
import { evaluateCells } from "./evaluation";
import { updateSelection } from "./selection";
import { Cell, NewCell, Zone, GridCommand, CommandResult } from "./types";
import { updateCell } from "./history";
import { BasePlugin } from "./base_plugin";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Clipboard {
  status: "empty" | "visible" | "invisible";
  shouldCut?: boolean;
  zones: Zone[];
  cells?: (Cell | null)[][];
}

// -----------------------------------------------------------------------------
// ClipboardPlugin
// -----------------------------------------------------------------------------
export class ClipboardPlugin extends BasePlugin {
  clipboard: Clipboard = {
    status: "empty",
    zones: []
  };
  isPaintingFormat: boolean = false;

  dispatch(command: GridCommand): CommandResult | void {
    switch (command.type) {
      case "COPY":
        this.cutOrCopy(command.target, false);
        break;
      case "CUT":
        this.cutOrCopy(command.target, true);
        break;
      case "PASTE":
        const onlyFormat =
          "onlyFormat" in command ? (command.onlyFormat as boolean) : this.isPaintingFormat;
        this.isPaintingFormat = false;
        const isAllowed = this.pasteFromModel(command.target, onlyFormat);
        if (!isAllowed) {
          return "CANCELLED";
        }
        break;
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(command.target, command.text);
        break;
      case "ACTIVATE_PAINT_FORMAT":
        this.isPaintingFormat = true;
        this.cutOrCopy(command.target, false);
        break;
    }
  }

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
    if (!this.clipboard.cells) {
      return "\t";
    }
    return (
      this.clipboard.cells
        .map(cells => {
          return cells.map(c => (c ? formatCell(this.workbook, c) : "")).join("\t");
        })
        .join("\n") || "\t"
    );
  }

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

    this.clipboard.status = "visible";
    this.clipboard.shouldCut = cut;
    this.clipboard.zones = clippedZones;
    this.clipboard.cells = cells;
  }

  private pasteFromClipboard(target: Zone[], content: string) {
    const workbook = this.workbook;
    this.clipboard.status = "invisible";
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

  private pasteFromModel(target: Zone[], onlyFormat: boolean): boolean {
    const workbook = this.workbook;
    const { zones, cells, shouldCut, status } = this.clipboard;
    if (!zones || !cells) {
      return true;
    }
    if (status === "empty") {
      return true;
    }
    this.clipboard.status = shouldCut ? "empty" : "invisible";

    const clippedHeight = cells.length;
    const clippedWidth = cells[0].length;
    if (target.length > 1) {
      if (clippedWidth > 1 || clippedHeight > 1) {
        // cannot paste if we have a clipped zone larger than a cell and multiple
        // zones selected
        return false;
      }
      for (let zone of target) {
        for (let i = zone.left; i <= zone.right; i++) {
          for (let j = zone.top; j <= zone.bottom; j++) {
            pasteZone(i, j);
          }
        }
      }
      return true;
    }
    const selection = target[target.length - 1];
    let col = selection.left;
    let row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / clippedWidth));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / clippedHeight));
    for (let x = 0; x < repX; x++) {
      for (let y = 0; y < repY; y++) {
        pasteZone(col + x * clippedWidth, row + y * clippedHeight);
      }
    }
    function pasteZone(col: number, row: number) {
      for (let r = 0; r < clippedHeight; r++) {
        const rowCells = cells![r];
        for (let c = 0; c < clippedWidth; c++) {
          const xc = toXC(col + c, row + r);
          const originCell = rowCells[c];
          const targetCell = getCell(workbook, col + c, row + r);
          if (originCell) {
            let content = originCell.content || "";
            if (originCell.type === "formula") {
              const offsetX = col + c - originCell.col;
              const offsetY = row + r - originCell.row;
              const maxX = workbook.cols.length;
              const maxY = workbook.rows.length;
              content = applyOffset(content, offsetX, offsetY, maxX, maxY);
            }
            let newCell: NewCell = {
              style: originCell.style,
              border: originCell.border,
              format: originCell.format
            };
            if (onlyFormat) {
              newCell.content = targetCell ? targetCell.content : "";
            } else {
              newCell.content = content;
            }

            addCell(workbook, xc, newCell);
            if (shouldCut) {
              deleteCell(workbook, originCell.xc, true);
            }
          }
          if (!originCell && targetCell) {
            if (onlyFormat) {
              if (targetCell.style || targetCell.border) {
                updateCell(workbook, targetCell, "style", undefined);
                updateCell(workbook, targetCell, "border", undefined);
              }
            } else {
              deleteCell(workbook, xc, true);
            }
          }
        }
      }
    }

    evaluateCells(workbook);

    if (clippedHeight > 1 || clippedWidth > 1) {
      const anchor = Object.assign({}, workbook.selection.anchor);
      selectCell(workbook, col, row);
      updateSelection(workbook, col + repX * clippedWidth - 1, row + repY * clippedHeight - 1);
      const newCol = clip(anchor.col, col, col + repX * clippedWidth - 1);
      const newRow = clip(anchor.row, row, row + repY * clippedHeight - 1);
      workbook.selection.anchor.col = newCol;
      workbook.selection.anchor.row = newRow;
      activateCell(workbook, newCol, newRow);
    }
    return true;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}
