import { clip, isDefined, overlap } from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  CellPosition,
  CellType,
  ClipboardCell,
  Command,
  CommandResult,
  FormulaCell,
  GridRenderingContext,
  LAYERS,
  Range,
  Sheet,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

type ClipboardOperation = "CUT" | "COPY";

interface ClipboardOptions {
  onlyFormat: boolean;
  onlyValue: boolean;
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

  private status: "visible" | "invisible" = "invisible";
  private operation?: ClipboardOperation;
  private clippedZones?: Zone[];
  private clippedCells?: ClipboardCell[][];
  private originSheetId?: UID;
  private _isPaintingFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "PASTE") {
      const force = "force" in cmd ? !!cmd.force : false;
      return this.isPasteAllowed(cmd.target, force);
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
      case "CUT":
        this.prepareOriginZones(cmd.target, cmd.type);
        break;
      case "PASTE":
        const onlyValue = "onlyValue" in cmd && !!cmd.onlyValue;
        let onlyFormat = "onlyFormat" in cmd ? !!cmd.onlyFormat : this._isPaintingFormat;
        this._isPaintingFormat = false;
        onlyFormat = !onlyValue && onlyFormat;
        if (cmd.interactive) {
          this.interactivePaste(cmd.target, { onlyFormat, onlyValue });
        } else {
          if (this.operation && this.operation === "CUT") {
            this.clearCutZone();
          }
          this.pasteFromModel(cmd.target, { onlyFormat, onlyValue });
          this.status = "invisible";
          if (this.operation && this.operation === "CUT") {
            this.clippedCells = undefined;
            this.clippedZones = undefined;
          }
        }
        break;
      case "PASTE_CELL":
        this.removeMergeIfTopLeft(cmd.position);
        this.pasteMergeIfExist(cmd.origin.position, cmd.position, cmd.cut);
        this.pasteCell(cmd.origin, cmd.position, {
          onlyValue: cmd.onlyValue,
          onlyFormat: cmd.onlyFormat,
        });
        break;
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(cmd.target, cmd.text);
        break;
      case "ACTIVATE_PAINT_FORMAT":
        this._isPaintingFormat = true;
        this.prepareOriginZones(cmd.target, "COPY");
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
    if (!this.clippedCells) {
      return "\t";
    }
    return (
      this.clippedCells
        .map((cells) => {
          return cells
            .map((c) =>
              c.cell
                ? this.getters.getCellText(
                    c.cell,
                    c.position.sheetId,
                    this.getters.shouldShowFormulas()
                  )
                : ""
            )
            .join("\t");
        })
        .join("\n") || "\t"
    );
  }

  getPasteZones(target: Zone[]): Zone[] {
    if (!this.clippedCells) {
      return target;
    }
    const height = this.clippedCells.length;
    const width = this.clippedCells[0].length;
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

  /**
   * If the position is the top-left of an existing merge, remove it
   */
  private removeMergeIfTopLeft(position: CellPosition) {
    const { sheetId, col, row } = position;
    const [left, top] = this.getters.getMainCell(sheetId, col, row);
    if (top === row && left === col) {
      const merge = this.getters.getMerge(sheetId, col, row);
      if (merge) {
        this.dispatch("REMOVE_MERGE", { sheetId, target: [merge] });
      }
    }
  }

  /**
   * If the origin position given is the top left of a merge, merge the target
   * position.
   *
   * If cut is set to true, remove the origin merge
   */
  private pasteMergeIfExist(origin: CellPosition, target: CellPosition, cut?: boolean) {
    let { sheetId, col, row } = origin;
    const [mainCellColOrigin, mainCellRowOrigin] = this.getters.getMainCell(sheetId, col, row);
    if (mainCellColOrigin === col && mainCellRowOrigin === row) {
      const merge = this.getters.getMerge(sheetId, col, row);
      if (!merge) {
        return;
      }
      if (cut) {
        this.dispatch("REMOVE_MERGE", { sheetId, target: [merge] });
      }
      ({ sheetId, col, row } = target);
      this.dispatch("ADD_MERGE", {
        sheetId,
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
  }

  private prepareOriginZones(zones: Zone[], operation: ClipboardOperation) {
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));
    const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
    let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];
    clippedZones = clippedZones.map((zone) => ({ ...zone }));

    const rows: ClipboardCell[][] = [];
    const sheetId = this.getters.getActiveSheetId();
    const { top, bottom } = clippedZones[0];
    for (let row = top; row <= bottom; row++) {
      const cells: ClipboardCell[] = [];
      rows.push(cells);
      for (let zone of clippedZones) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(sheetId, col, row);
          const border = this.getters.getCellBorder(sheetId, col, row) || undefined;
          cells.push({ cell, border, position: { col, row, sheetId } });
        }
      }
    }
    this.status = "visible";
    this.operation = operation;
    this.clippedZones = clippedZones;
    this.clippedCells = rows;
    this.originSheetId = sheetId;
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
    const { clippedZones, clippedCells } = this;
    // cannot paste if we have a clipped zone larger than a cell and multiple
    // zones selected
    if (!clippedZones || !clippedCells) {
      return CommandResult.EmptyClipboard;
    } else if (target.length > 1 && (clippedCells.length > 1 || clippedCells[0].length > 1)) {
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

  private pasteFromModel(target: Zone[], options: ClipboardOptions) {
    const { clippedCells: cells } = this;
    if (!cells) {
      return;
    }
    const height = cells.length;
    const width = cells[0].length;
    if (target.length > 1) {
      for (const zone of target) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(width, height, col, row, options);
          }
        }
      }
      return;
    }

    const selection = target[0];
    const col = selection.left;
    const row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
    for (let x = 0; x < repX; x++) {
      for (let y = 0; y < repY; y++) {
        this.pasteZone(width, height, col + x * width, row + y * height, options);
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
    if (!this.clippedCells || !this.clippedZones) {
      return;
    }
    for (const row of this.clippedCells) {
      for (const cell of row.filter(isDefined)) {
        this.dispatch("CLEAR_CELL", cell.position);
      }
    }
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: this.originSheetId!,
      target: this.clippedZones,
    });
  }

  private pasteZone(
    width: number,
    height: number,
    col: number,
    row: number,
    { onlyFormat, onlyValue }: ClipboardOptions
  ) {
    // first, add missing cols/rows if needed
    this.addMissingDimensions(this.getters.getActiveSheet(), width, height, col, row);
    // then, perform the actual paste operation
    const sheetId = this.getters.getActiveSheetId();
    for (let r = 0; r < height; r++) {
      const rowCells = this.clippedCells![r];
      for (let c = 0; c < width; c++) {
        const origin = rowCells[c];
        this.dispatch("PASTE_CELL", {
          origin,
          position: { col: col + c, row: row + r, sheetId },
          cut: this.operation === "CUT",
          onlyValue,
          onlyFormat,
        });
      }
    }
  }

  /**
   * Add columns and/or rows to ensure that col + width and row + height are still
   * in the sheet
   */
  private addMissingDimensions(
    sheet: Sheet,
    width: number,
    height: number,
    col: number,
    row: number
  ) {
    const { cols, rows, id: sheetId } = sheet;
    const missingRows = height + row - rows.length;
    if (missingRows > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: rows.length - 1,
        sheetId,
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - cols.length;
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: cols.length - 1,
        sheetId,
        quantity: missingCols,
        position: "after",
      });
    }
  }

  /**
   * Paste the cell at the given position to the target position
   */
  private pasteCell(origin: ClipboardCell, target: CellPosition, options: ClipboardOptions) {
    const { sheetId, col, row } = target;
    const { onlyValue, onlyFormat } = options;
    const targetCell = this.getters.getCell(sheetId, col, row);

    if (!onlyValue || onlyFormat) {
      this.dispatch("SET_BORDER", { sheetId, col, row, border: origin.border });
    }
    if (origin.cell) {
      if (onlyFormat) {
        this.dispatch("UPDATE_CELL", {
          ...target,
          style: origin.cell.style,
          format: origin.cell.format,
        });
        return;
      }

      if (onlyValue) {
        const content = this.valueToContent(origin.cell.value);
        this.dispatch("UPDATE_CELL", { ...target, content });
        return;
      }
      let content = this.getters.getCellValue(origin.cell, origin.position.sheetId, true) || "";

      if (origin.cell.type === CellType.formula) {
        const offsetX = col - origin.position.col;
        const offsetY = row - origin.position.row;
        content = this.getUpdatedContent(sheetId, origin.cell, offsetX, offsetY);
      }
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        style: origin.cell.style || null,
        format: origin.cell.format,
      });
    } else if (targetCell) {
      if (onlyValue) {
        this.dispatch("UPDATE_CELL", { ...target, content: "" });
      } else if (onlyFormat) {
        this.dispatch("UPDATE_CELL", { ...target, style: null, format: "" });
      } else {
        this.dispatch("CLEAR_CELL", target);
      }
    }
  }

  /**
   * Get the newly updated formula, after applying offsets
   */
  private getUpdatedContent(
    sheetId: UID,
    cell: FormulaCell,
    offsetX: number,
    offsetY: number
  ): string {
    if (this.operation === "CUT") {
      const ranges: Range[] = [];
      for (const range of cell.dependencies) {
        if (this.isZoneOverlapClippedZone(range.zone)) {
          ranges.push(...this.getters.createAdaptedRanges([range], offsetX, offsetY, sheetId));
        } else {
          ranges.push(range);
        }
      }
      return this.getters.buildFormulaContent(sheetId, cell.formula.text, ranges);
    }
    const ranges = this.getters.createAdaptedRanges(cell.dependencies, offsetX, offsetY, sheetId);
    return this.getters.buildFormulaContent(sheetId, cell.formula.text, ranges);
  }

  /**
   * Check if the given zone and at least one of the clipped zones overlap
   */
  private isZoneOverlapClippedZone(zone: Zone): boolean {
    return (this.clippedZones || []).reduce(
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

  private interactivePaste(target: Zone[], options: ClipboardOptions) {
    const result = this.dispatch("PASTE", { target, ...options });

    if (result !== CommandResult.Success) {
      if (result === CommandResult.WrongPasteSelection) {
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
      }
      if (result === CommandResult.WillRemoveExistingMerge) {
        this.ui.askConfirmation(
          _lt("Pasting here will remove existing merge(s). Paste anyway?"),
          () => this.dispatch("PASTE", { target, ...options, force: true })
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const zones = this.clippedZones;
    if (
      this.status !== "visible" ||
      !zones ||
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
