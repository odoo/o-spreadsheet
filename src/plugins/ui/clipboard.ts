import { clip, overlap } from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  Border,
  Cell,
  CellType,
  Command,
  CommandResult,
  GridRenderingContext,
  LAYERS,
  Range,
  Sheet,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface ClipboardCell {
  cell: Cell | null;
  border: Border | null;
  col: number;
  row: number;
  sheetId: UID;
}

/**
 * Clipboard Plugin
 *
 * This clipboard manages all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends UIPlugin {
  static layers = [LAYERS.Clipboard];
  static getters = ["getClipboardContent", "isPaintingFormat", "getPasteZones"];
  static modes: Mode[] = ["normal", "readonly"];

  private status: "empty" | "visible" | "invisible" = "empty";
  private shouldCut?: boolean;
  private zones: Zone[] = [];
  private cells?: ClipboardCell[][];
  private originSheetId: UID = null as any;
  private _isPaintingFormat: boolean = false;
  private pasteOnlyValue: boolean = false;
  private pasteOnlyFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;
    if (cmd.type === "PASTE") {
      return this.isPasteAllowed(cmd.target, force);
    }
    return CommandResult.Success;
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
          this.interactivePaste(cmd.target, !!cmd.onlyFormat, !!cmd.onlyValue);
        } else {
          this.pasteFromModel(cmd.target);
        }
        break;
      case "PASTE_CELL":
        const [mainCellColOrigin, mainCellRowOrigin] = this.getters.getMainCell(
          cmd.originSheet,
          cmd.originCol,
          cmd.originRow
        );
        const [mainCellColTarget, mainCellRowTarget] = this.getters.getMainCell(
          cmd.sheetId,
          cmd.col,
          cmd.row
        );
        if (mainCellColTarget === cmd.col && mainCellRowTarget === cmd.row) {
          const merge = this.getters.getMerge(cmd.sheetId, cmd.col, cmd.row);
          if (merge) {
            this.dispatch("REMOVE_MERGE", {
              sheetId: cmd.sheetId,
              target: [merge],
            });
          }
        }
        if (mainCellColOrigin === cmd.originCol && mainCellRowOrigin === cmd.originRow) {
          this.pasteMerge(
            cmd.originCol,
            cmd.originRow,
            cmd.col,
            cmd.row,
            cmd.originSheet,
            cmd.sheetId,
            cmd.cut
          );
        }
        this.pasteCell(
          cmd.originSheet,
          cmd.origin,
          cmd.originBorder,
          cmd.originCol,
          cmd.originRow,
          cmd.col,
          cmd.row,
          cmd.onlyValue,
          cmd.onlyFormat
        );
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
   * - add a tab character between each consecutive cells
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
          return cells
            .map((c) =>
              c.cell
                ? this.getters.getCellText(c.cell, c.sheetId, this.getters.shouldShowFormulas())
                : ""
            )
            .join("\t");
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
    const activeSheetId = this.getters.getActiveSheetId();
    let { top, bottom } = clippedZones[0];
    for (let r = top; r <= bottom; r++) {
      const row: ClipboardCell[] = [];
      cells.push(row);
      for (let zone of clippedZones) {
        let { left, right } = zone;
        for (let c = left; c <= right; c++) {
          const cell = this.getters.getCell(activeSheetId, c, r);
          row.push({
            cell: cell ? Object.assign({}, cell) : null,
            border: this.getters.getCellBorder(activeSheetId, c, r),
            col: c,
            row: r,
            sheetId: activeSheetId,
          });
        }
      }
    }
    this.status = "visible";
    this.shouldCut = cut;
    this.zones = clippedZones;
    this.cells = cells;
    this.originSheetId = activeSheetId;
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
    const sheet = this.getters.getActiveSheet();
    this.addMissingDimensions(sheet, width, height, activeCol, activeRow);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        this.dispatch("UPDATE_CELL", {
          row: activeRow + i,
          col: activeCol + j,
          content: values[i][j],
          sheetId: sheet.id,
        });
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

  private isPasteAllowed(target: Zone[], force: boolean): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    const { zones, cells, status } = this;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    if (!zones || !cells || status === "empty") {
      return CommandResult.EmptyClipboard;
    } else if (target.length > 1 && (cells.length > 1 || cells[0].length > 1)) {
      return CommandResult.WrongPasteSelection;
    }
    if (!force) {
      const pasteZones = this.getters.getPasteZones(target);
      for (let zone of pasteZones) {
        if (this.getters.doesIntersectMerge(sheetId, zone)) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
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
          this.dispatch("CLEAR_FORMATTING", {
            sheetId: this.originSheetId,
            target: [{ top: cell.row, bottom: cell.row, left: cell.col, right: cell.col }],
          });
        }
      }
    }
  }

  private pasteZone(width: number, height: number, col: number, row: number) {
    // first, add missing cols/rows if needed
    this.addMissingDimensions(this.getters.getActiveSheet(), width, height, col, row);
    // then, perform the actual paste operation
    for (let r = 0; r < height; r++) {
      const rowCells = this.cells![r];
      for (let c = 0; c < width; c++) {
        const originCell = rowCells[c];
        this.dispatch("PASTE_CELL", {
          origin: originCell.cell,
          originBorder: originCell.border,
          originCol: originCell.col,
          originRow: originCell.row,
          originSheet: originCell.sheetId,
          col: col + c,
          row: row + r,
          sheetId: this.getters.getActiveSheetId(),
          cut: this.shouldCut,
          onlyValue: this.pasteOnlyValue,
          onlyFormat: this.pasteOnlyFormat,
        });
      }
    }
  }

  private pasteMerge(
    originCol: number,
    originRow: number,
    col: number,
    row: number,
    originSheet: UID,
    sheetId: UID,
    cut?: boolean
  ) {
    const merge = this.getters.getMerge(originSheet, originCol, originRow);
    const sheet = this.getters.getSheet(sheetId);
    if (!merge || !sheet) return;
    if (cut) {
      this.dispatch("REMOVE_MERGE", {
        sheetId: originSheet,
        target: [merge],
      });
    }
    this.dispatch("ADD_MERGE", {
      sheetId: this.getters.getActiveSheetId(),
      target: [
        {
          left: col,
          top: row,
          right: col + merge.right - merge.left,
          bottom: row + merge.bottom - merge.top,
        },
      ],
    });
  }

  private addMissingDimensions(sheet: Sheet, width, height, col, row) {
    const { cols, rows } = sheet;
    const missingRows = height + row - rows.length;
    if (missingRows > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: rows.length - 1,
        sheetId: this.getters.getActiveSheetId(),
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - cols.length;
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: cols.length - 1,
        sheetId: this.getters.getActiveSheetId(),
        quantity: missingCols,
        position: "after",
      });
    }
  }

  pasteCell(
    originSheet: UID,
    origin: Cell | null,
    originBorder: Border | null,
    originCol: number,
    originRow: number,
    col: number,
    row: number,
    onlyValue: boolean,
    onlyFormat: boolean
  ) {
    const sheetId = this.getters.getActiveSheetId();
    const targetCell = this.getters.getCell(sheetId, col, row);

    if (!onlyValue || onlyFormat) {
      this.dispatch("SET_BORDER", { sheetId, col, row, border: originBorder || undefined });
    }
    if (origin) {
      let style: Style | undefined | null = origin.style || null;
      let format = origin.format;
      let content: string = this.getters.getCellValue(origin, originSheet, true) || "";

      if (onlyValue) {
        style = targetCell ? targetCell.style : undefined;
        format = targetCell ? targetCell.format : undefined;

        if (origin.type === CellType.formula) {
          content = this.valueToContent(origin.value);
        }
      } else if (!onlyFormat && origin.type === CellType.formula) {
        const offsetX = col - originCol;
        const offsetY = row - originRow;
        if (this.shouldCut) {
          const ranges: Range[] = [];
          for (const range of origin.dependencies) {
            if (this.isZoneOverlapClippedZone(range.zone)) {
              ranges.push(...this.getters.createAdaptedRanges([range], offsetX, offsetY, sheetId));
            } else {
              ranges.push(range);
            }
          }
          content = this.getters.buildFormulaContent(sheetId, origin.formula.text, ranges);
        } else {
          const ranges = this.getters.createAdaptedRanges(
            origin.dependencies,
            offsetX,
            offsetY,
            sheetId
          );
          content = this.getters.buildFormulaContent(sheetId, origin.formula.text, ranges);
        }
      }
      const newCell = {
        style,
        format,
        sheetId,
        col,
        row,
      };
      if (!onlyFormat) {
        newCell["content"] = content;
      }
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
          style: null,
          format: "",
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

  /**
   * Check if the given zone and at least one of the clipped zones overlap
   */
  private isZoneOverlapClippedZone(zone: Zone): boolean {
    return this.zones.reduce(
      (isOverlapping, clippedZone) => isOverlapping || overlap(zone, clippedZone),
      false
    );
  }

  private valueToContent(cellValue: any): string {
    switch (typeof cellValue) {
      case "number":
        return cellValue.toString();
      case "string":
        return cellValue;
      case "boolean":
        return cellValue ? "TRUE" : "FALSE";
      default:
        return "";
    }
  }

  interactivePaste(target: Zone[], onlyFormat: boolean, onlyValue: boolean) {
    const result = this.dispatch("PASTE", { target, onlyFormat, onlyValue });

    if (result !== CommandResult.Success) {
      if (result === CommandResult.WrongPasteSelection) {
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
      }
      if (result === CommandResult.WillRemoveExistingMerge) {
        this.ui.askConfirmation(
          _lt("Pasting here will remove existing merge(s). Paste anyway?"),
          () => this.dispatch("PASTE", { target, onlyFormat, onlyValue, force: true })
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
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "#3266ca";
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of zones) {
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
