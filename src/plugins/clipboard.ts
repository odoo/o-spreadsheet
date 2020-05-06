import { BasePlugin } from "../base_plugin";
import { applyOffset } from "../formulas/index";
import { clip, toXC } from "../helpers/index";
import { Mode } from "../model";
import {
  Cell,
  Command,
  GridRenderingContext,
  LAYERS,
  Zone,
  CancelledReason,
  CommandResult,
} from "../types/index";

interface ClipboardCell {
  cell: Cell | null;
  col: number;
  row: number;
}

/**
 * Clipboard Plugin
 *
 * This clipboard manages all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends BasePlugin {
  static layers = [LAYERS.Clipboard];
  static getters = ["getClipboardContent", "isPaintingFormat", "getPasteZones"];
  static modes: Mode[] = ["normal", "readonly"];

  private status: "empty" | "visible" | "invisible" = "empty";
  private shouldCut?: boolean;
  private zones: Zone[] = [];
  private cells?: ClipboardCell[][];
  private originSheet: string = this.workbook.activeSheet.name;
  private _isPaintingFormat: boolean = false;
  private onlyFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;
    if (cmd.type === "PASTE") {
      return this.isPasteAllowed(cmd.target, force);
    }
    return {
      status: "SUCCESS",
    };
  }

  handle(cmd: Command) {
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
        this.pasteFromModel(cmd.target);
        break;
      case "PASTE_CELL":
        this.pasteCell(cmd.origin, cmd.col, cmd.row, cmd.cut);
        break;
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(cmd.target, cmd.text);
        break;
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
        .map((cells) => {
          return cells.map((c) => (c.cell ? this.getters.getCellText(c.cell) : "")).join("\t");
        })
        .join("\n") || "\t"
    );
  }

  getPasteZones(target: Zone[]): Zone[] {
    const height = this.cells!.length;
    const width = this.cells![0].length;
    const selection = target[target.length - 1];
    const pasteZones: Zone[] = [];
    let col = selection.left;
    let row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
    for (let x = 1; x <= repX; x++) {
      for (let y = 1; y <= repY; y++) {
        pasteZones.push({
          left: col,
          top: row,
          right: col - 1 + x * width,
          bottom: row - 1 + y * height,
        });
      }
    }
    return pasteZones;
  }

  isPaintingFormat(): boolean {
    return this._isPaintingFormat;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private cutOrCopy(zones: Zone[], cut: boolean) {
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));
    const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
    let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];
    clippedZones = clippedZones.map((z) => Object.assign({}, z));

    const cells: ClipboardCell[][] = [];
    let { top, bottom } = clippedZones[0];
    for (let r = top; r <= bottom; r++) {
      const row: ClipboardCell[] = [];
      cells.push(row);
      for (let zone of clippedZones) {
        let { left, right } = zone;
        for (let c = left; c <= right; c++) {
          const cell = this.getters.getCell(c, r);
          row.push({
            cell: cell ? Object.assign({}, cell) : null,
            col: c,
            row: r,
          });
        }
      }
    }
    this.status = "visible";
    this.shouldCut = cut;
    this.zones = clippedZones;
    this.cells = cells;
    this.originSheet = this.workbook.activeSheet.name;
  }

  private pasteFromClipboard(target: Zone[], content: string) {
    this.status = "invisible";
    const values = content
      .replace(/\r/g, "")
      .split("\n")
      .map((vals) => vals.split("\t"));
    const { left: activeCol, top: activeRow } = target[0];
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const xc = toXC(activeCol + j, activeRow + i);
        this.dispatch("SET_VALUE", { xc, text: values[i][j] });
      }
    }
  }

  private isPasteAllowed(target: Zone[], force: boolean): CommandResult {
    const cells = this.cells;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    if (cells && target.length > 1 && (cells.length > 1 || cells[0].length > 1)) {
      return { status: "CANCELLED", reason: CancelledReason.WrongPasteSelection };
    }
    return { status: "SUCCESS" };
  }

  private pasteFromModel(target: Zone[]) {
    const { zones, cells, shouldCut, status } = this;
    if (!zones || !cells || status === "empty") {
      return;
    }
    this.status = shouldCut ? "empty" : "invisible";
    if (shouldCut) {
      this.clearCutZone();
    }
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
      const newSelection = {
        left: col,
        top: row,
        right: col + repX * width - 1,
        bottom: row + repY * height - 1,
      };
      const [anchorCol, anchorRow] = this.getters.getSelection().anchor;
      const newCol = clip(anchorCol, col, col + repX * width - 1);
      const newRow = clip(anchorRow, row, row + repY * height - 1);
      this.dispatch("SET_SELECTION", {
        anchor: [newCol, newRow],
        zones: [newSelection],
      });
    }
  }

  private clearCutZone() {
    for (let row of this.cells!) {
      for (let cell of row) {
        if (cell) {
          this.dispatch("CLEAR_CELL", {
            sheet: this.workbook.activeSheet.name,
            col: cell.col,
            row: cell.row,
          });
        }
      }
    }
  }

  private pasteZone(width: number, height: number, col: number, row: number) {
    const { cols, rows } = this.workbook;
    // first, add missing cols/rows if needed
    const missingRows = height + row - rows.length;
    if (missingRows > 0) {
      this.dispatch("ADD_ROWS", {
        row: rows.length - 1,
        sheet: this.workbook.activeSheet.name,
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - cols.length;
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS", {
        column: cols.length - 1,
        sheet: this.workbook.activeSheet.name,
        quantity: missingCols,
        position: "after",
      });
    }
    // then, perform the actual paste operation
    for (let r = 0; r < height; r++) {
      const rowCells = this.cells![r];
      for (let c = 0; c < width; c++) {
        const originCell = rowCells[c];
        this.dispatch("PASTE_CELL", {
          origin: originCell.cell,
          originCol: originCell.col,
          originRow: originCell.row,
          col: col + c,
          row: row + r,
          sheet: this.originSheet,
          cut: this.shouldCut,
        });
      }
    }
  }

  pasteCell(origin: Cell | null, col: number, row: number, cut?: boolean) {
    const { cols, rows } = this.workbook;
    const targetCell = this.getters.getCell(col, row);
    if (origin) {
      let content: string | undefined = origin.content || "";
      if (origin.type === "formula") {
        const offsetX = col - origin.col;
        const offsetY = row - origin.row;
        content = applyOffset(content, offsetX, offsetY, cols.length, rows.length);
      }
      if (this.onlyFormat) {
        content = targetCell ? targetCell.content : "";
      }
      let newCell = {
        style: origin.style,
        border: origin.border,
        format: origin.format,
        sheet: this.workbook.activeSheet.name,
        col: col,
        row: row,
        content,
      };

      this.dispatch("UPDATE_CELL", newCell);
    }
    if (!origin && targetCell) {
      if (this.onlyFormat) {
        if (targetCell.style || targetCell.border) {
          this.history.updateCell(targetCell, "style", undefined);
          this.history.updateCell(targetCell, "border", undefined);
        }
      } else {
        this.dispatch("CLEAR_CELL", {
          sheet: this.workbook.activeSheet.name,
          col: col,
          row: row,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const zones = this.zones;
    if (this.status !== "visible" || !zones.length) {
      return;
    }
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "#3266ca";
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of zones) {
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
    ctx.restore();
  }
}
