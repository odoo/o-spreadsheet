import { BasePlugin } from "../base_plugin";
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
  UID,
} from "../types/index";
import { _lt } from "../translation";

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
  private originSheetId: UID = this.getters.getActiveSheetId();
  private _isPaintingFormat: boolean = false;
  private pasteOnlyValue: boolean = false;
  private pasteOnlyFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "PASTE") {
      return this.isPasteAllowed(cmd.target);
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
        this.pasteOnlyValue = "onlyValue" in cmd && !!cmd.onlyValue;
        const onlyFormat = "onlyFormat" in cmd ? !!cmd.onlyFormat : this._isPaintingFormat;
        this._isPaintingFormat = false;
        this.pasteOnlyFormat = !this.pasteOnlyValue && onlyFormat;
        if (cmd.interactive) {
          this.interactivePaste(cmd.target);
        } else {
          this.pasteFromModel(cmd.target);
        }
        break;
      case "PASTE_CELL":
        this.pasteCell(cmd.origin, cmd.col, cmd.row, cmd.onlyValue, cmd.onlyFormat);
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
    if (!this.cells) {
      return target;
    }
    const height = this.cells.length;
    const width = this.cells[0].length;
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
    this.originSheetId = this.getters.getActiveSheetId();
  }

  private pasteFromClipboard(target: Zone[], content: string) {
    this.status = "invisible";
    const values = content
      .replace(/\r/g, "")
      .split("\n")
      .map((vals) => vals.split("\t"));
    const { left: activeCol, top: activeRow } = target[0];
    const width = Math.max.apply(
      Math,
      values.map((a) => a.length)
    );
    const height = values.length;
    this.addMissingDimensions(width, height, activeCol, activeRow);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const xc = toXC(activeCol + j, activeRow + i);
        this.dispatch("SET_VALUE", { xc, text: values[i][j] });
      }
    }
    this.dispatch("SET_SELECTION", {
      anchor: [activeCol, activeRow],
      zones: [
        {
          left: activeCol,
          top: activeRow,
          right: activeCol + width - 1,
          bottom: activeRow + height - 1,
        },
      ],
    });
  }

  private isPasteAllowed(target: Zone[]): CommandResult {
    const { zones, cells, status } = this;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    if (!zones || !cells || status === "empty") {
      return { status: "CANCELLED", reason: CancelledReason.EmptyClipboard };
    } else if (target.length > 1 && (cells.length > 1 || cells[0].length > 1)) {
      return { status: "CANCELLED", reason: CancelledReason.WrongPasteSelection };
    }
    return { status: "SUCCESS" };
  }

  private pasteFromModel(target: Zone[]) {
    const { cells, shouldCut } = this;
    if (!cells) {
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
            sheetId: this.originSheetId,
            col: cell.col,
            row: cell.row,
          });
        }
      }
    }
  }

  private pasteZone(width: number, height: number, col: number, row: number) {
    // first, add missing cols/rows if needed
    this.addMissingDimensions(width, height, col, row);
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
          sheetId: this.originSheetId,
          cut: this.shouldCut,
          onlyValue: this.pasteOnlyValue,
          onlyFormat: this.pasteOnlyFormat,
        });
      }
    }
  }

  private addMissingDimensions(width, height, col, row) {
    const { cols, rows } = this.getters.getActiveSheet();
    const missingRows = height + row - rows.length;
    if (missingRows > 0) {
      this.dispatch("ADD_ROWS", {
        row: rows.length - 1,
        sheetId: this.getters.getActiveSheetId(),
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - cols.length;
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS", {
        column: cols.length - 1,
        sheetId: this.getters.getActiveSheetId(),
        quantity: missingCols,
        position: "after",
      });
    }
  }

  pasteCell(
    origin: Cell | null,
    col: number,
    row: number,
    onlyValue: boolean,
    onlyFormat: boolean
  ) {
    const targetCell = this.getters.getCell(col, row);
    const sheetId = this.getters.getActiveSheetId();
    if (origin) {
      let style = origin.style;
      let border = origin.border;
      let format = origin.format;
      let content: string | undefined = origin.content || "";

      if (onlyValue) {
        style = targetCell ? targetCell.style : undefined;
        border = targetCell ? targetCell.border : undefined;
        format = targetCell ? targetCell.format : undefined;

        if (targetCell) {
          if (targetCell.type === "date") {
            format = targetCell.value.format;
          }
        }
        if (origin.type === "formula" || origin.type === "date") {
          content = this.valueToContent(origin.value);
        }
      } else if (onlyFormat) {
        content = targetCell ? targetCell.content : "";
      } else if (origin.type === "formula") {
        const offsetX = col - origin.col;
        const offsetY = row - origin.row;
        content = this.getters.applyOffset(content, offsetX, offsetY);
      }
      const newCell = {
        style,
        border,
        format,
        sheetId,
        col,
        row,
        content,
      };

      this.dispatch("UPDATE_CELL", newCell);
    } else if (targetCell) {
      if (onlyValue) {
        this.dispatch("UPDATE_CELL", {
          sheetId: sheetId,
          col,
          row,
          content: "",
        });
      } else if (onlyFormat) {
        this.dispatch("UPDATE_CELL", {
          sheetId: sheetId,
          col,
          row,
          style: undefined,
          border: undefined,
          format: undefined,
        });
      } else {
        this.dispatch("CLEAR_CELL", {
          sheetId: this.getters.getActiveSheetId(),
          col: col,
          row: row,
        });
      }
    }
  }

  private valueToContent(cellValue: any): string {
    switch (typeof cellValue) {
      case "number":
        return cellValue.toString();
      case "string":
        return cellValue;
      case "boolean":
        return cellValue ? "TRUE" : "FALSE";
      case "object":
        return cellValue.value.toString();
      default:
        return "";
    }
  }

  interactivePaste(target: Zone[]) {
    const result = this.dispatch("PASTE", { target, onlyFormat: false });

    if (result.status === "CANCELLED") {
      if (result.reason === CancelledReason.WrongPasteSelection) {
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
      }
      if (result.reason === CancelledReason.WillRemoveExistingMerge) {
        this.ui.askConfirmation(
          _lt("Pasting here will remove existing merge(s). Paste anyway?"),
          () => this.dispatch("PASTE", { target, onlyFormat: false, force: true })
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const zones = this.zones;
    if (
      this.status !== "visible" ||
      !zones.length ||
      this.originSheetId !== this.getters.getActiveSheetId()
    ) {
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
