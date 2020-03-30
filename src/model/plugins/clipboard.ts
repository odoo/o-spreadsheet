import { applyOffset } from "../../formulas/index";
import { toXC } from "../../helpers";
import { Cell, GridCommand, NewCell, Zone, HandleReturnType } from "../../types/index";
import { BasePlugin } from "../base_plugin";
import { updateCell } from "../history";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

/**
 * Clipboard Plugin
 *
 * This clipboard manage all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends BasePlugin {
  static getters = ["getClipboardContent", "isPaintingFormat"];

  status: "empty" | "visible" | "invisible" = "empty";
  shouldCut?: boolean;
  zones: Zone[] = [];
  cells?: (Cell | null)[][];
  private _isPaintingFormat: boolean = false;
  onlyFormat: boolean = false;

  canDispatch(cmd: GridCommand): boolean {
    return cmd.type === "PASTE" ? this.isPasteAllowed(cmd.target) : true;
  }

  handle(cmd: GridCommand): HandleReturnType {
    switch (cmd.type) {
      case "COPY":
        this.cutOrCopy(cmd.target, false);
        break;
      case "CUT":
        this.cutOrCopy(cmd.target, true);
        break;
      case "PASTE":
        const onlyFormat = "onlyFormat" in cmd ? !!cmd.onlyFormat : this._isPaintingFormat;
        this._isPaintingFormat = false;
        this.onlyFormat = onlyFormat;
        return this.pasteFromModel(cmd.target);
      case "PASTE_FROM_OS_CLIPBOARD":
        return this.pasteFromClipboard(cmd.target, cmd.text);
      case "ACTIVATE_PAINT_FORMAT":
        this._isPaintingFormat = true;
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
          return cells.map(c => (c ? this.getters.getCellText(c) : "")).join("\t");
        })
        .join("\n") || "\t"
    );
  }

  isPaintingFormat(): boolean {
    return this._isPaintingFormat;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private cutOrCopy(zones: Zone[], cut: boolean) {
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
          const cell = this.getters.getCell(c, r);
          row.push(cell ? Object.assign({}, cell) : null);
        }
      }
    }

    this.status = "visible";
    this.shouldCut = cut;
    this.zones = clippedZones;
    this.cells = cells;
  }

  private pasteFromClipboard(target: Zone[], content: string): GridCommand[] {
    const result: GridCommand[] = [];
    this.status = "invisible";
    const values = content
      .replace(/\r/g, "")
      .split("\n")
      .map(vals => vals.split("\t"));
    const { left: activeCol, top: activeRow } = target[0];
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const xc = toXC(activeCol + j, activeRow + i);
        result.push({ type: "SET_VALUE", xc, text: values[i][j] });
      }
    }
    return result;
  }

  private isPasteAllowed(target: Zone[]): boolean {
    const cells = this.cells;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    return !(cells && target.length > 1 && (cells.length > 1 || cells[0].length > 1));
  }

  private pasteFromModel(target: Zone[]): GridCommand[] | void {
    const { zones, cells, shouldCut, status, workbook } = this;
    if (!zones || !cells || status === "empty") {
      return;
    }
    this.status = shouldCut ? "empty" : "invisible";

    const height = cells.length;
    const width = cells[0].length;
    const commands: GridCommand[] = [];
    if (target.length > 1) {
      for (let zone of target) {
        for (let i = zone.left; i <= zone.right; i++) {
          for (let j = zone.top; j <= zone.bottom; j++) {
            commands.push(...this.pasteZone(width, height, i, j));
          }
        }
      }
      return commands;
    }
    const selection = target[target.length - 1];
    let col = selection.left;
    let row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
    for (let x = 0; x < repX; x++) {
      for (let y = 0; y < repY; y++) {
        commands.push(...this.pasteZone(width, height, col + x * width, row + y * height));
      }
    }

    if (height > 1 || width > 1) {
      const newSelection = {
        left: col,
        top: row,
        right: col + repX * width - 1,
        bottom: row + repY * height - 1
      };
      const anchor = workbook.selection.anchor;
      const newCol = clip(anchor.col, col, col + repX * width - 1);
      const newRow = clip(anchor.row, row, row + repY * height - 1);
      commands.push({
        type: "SET_SELECTION",
        anchor: [newCol, newRow],
        zones: [newSelection]
      });
    }
    return commands;
  }

  private pasteZone(width: number, height: number, col: number, row: number): GridCommand[] {
    const result: GridCommand[] = [];
    for (let r = 0; r < height; r++) {
      const rowCells = this.cells![r];
      for (let c = 0; c < width; c++) {
        const originCell = rowCells[c];
        const targetCell = this.getters.getCell(col + c, row + r);
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

          result.push({
            type: "UPDATE_CELL",
            sheet: this.workbook.activeSheet.name,
            col: col + c,
            row: row + r,
            ...newCell
          });
          if (this.shouldCut) {
            result.push({
              type: "CLEAR_CELL",
              sheet: this.workbook.activeSheet.name,
              col: originCell.col,
              row: originCell.row
            });
          }
        }
        if (!originCell && targetCell) {
          if (this.onlyFormat) {
            if (targetCell.style || targetCell.border) {
              updateCell(this.workbook, targetCell, "style", undefined);
              updateCell(this.workbook, targetCell, "border", undefined);
            }
          } else {
            result.push({
              type: "CLEAR_CELL",
              sheet: this.workbook.activeSheet.name,
              col: col + c,
              row: row + r
            });
          }
        }
      }
    }
    return result;
  }
}
