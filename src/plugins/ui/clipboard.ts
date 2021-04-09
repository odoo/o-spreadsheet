import { clip, overlap } from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  CellPosition,
  CellType,
  ClipboardCell,
  ClipboardOptions,
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
type ClipboardSelection = { zones: Zone[]; anchor: [number, number] } | undefined;

interface ClipboardState {
  cells: ClipboardCell[][];
  merges: Zone[];
  operation: ClipboardOperation;
  zones: Zone[];
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
  static getters = ["getClipboardContent", "isPaintingFormat"];
  static modes: Mode[] = ["normal", "readonly"];

  private status: "visible" | "invisible" = "invisible";
  private state?: ClipboardState;
  private _isPaintingFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "PASTE") {
      return this.isPasteAllowed(cmd.target, !!cmd.force);
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
      case "CUT":
        this.state = this.getClipboardState(cmd.target, cmd.type);
        this.status = "visible";
        break;
      case "PASTE":
        if (!this.state) {
          throw new Error("Clipboard state is empty");
        }
        const pasteOption: ClipboardOptions | undefined =
          cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        this._isPaintingFormat = false;
        if (cmd.interactive) {
          this.interactivePaste(cmd.target, pasteOption);
        } else {
          const selection = this.paste(cmd.target, this.state, pasteOption);
          this.status = "invisible";
          if (selection) {
            this.dispatch("SET_SELECTION", selection);
          }
        }
        break;
      case "DELETE_CELL": {
        let cutZone: Zone = cmd.zone;
        const sheet = this.getters.getActiveSheet();
        if (cmd.shiftDimension === "COL") {
          cutZone = {
            ...cmd.zone,
            left: cmd.zone.right + 1,
            right: sheet.cols.length - 1,
          };
        } else {
          cutZone = {
            ...cmd.zone,
            top: cmd.zone.bottom + 1,
            bottom: sheet.rows.length - 1,
          };
        }
        const state = this.getClipboardState([cutZone], "CUT");
        this.paste([cmd.zone], state);
        break;
      }
      case "INSERT_CELL": {
        let zone: Zone = cmd.zone;
        let cutZone: Zone = cmd.zone;
        const sheet = this.getters.getActiveSheet();
        if (cmd.shiftDimension === "COL") {
          zone = {
            ...cmd.zone,
            left: cmd.zone.right + 1,
            right: cmd.zone.right + 1,
          };
          cutZone = { ...cmd.zone, right: sheet.cols.length - 1 };
        } else {
          zone = {
            ...cmd.zone,
            top: cmd.zone.bottom + 1,
            bottom: sheet.rows.length - 1,
          };
          cutZone = { ...cmd.zone, bottom: sheet.rows.length - 1 };
        }
        const state = this.getClipboardState([cutZone], "CUT");
        this.paste([zone], state);
        break;
      }
      case "PASTE_CELL":
        this.removeMergeIfTopLeft(cmd.position);
        this.pasteMergeIfExist(cmd.origin.position, cmd.position);
        this.pasteCell(
          cmd.origin,
          cmd.position,
          cmd.cut ? "CUT" : "COPY",
          cmd.originalZones,
          cmd.pasteOption
        );
        break;
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(cmd.target, cmd.text);
        break;
      case "ACTIVATE_PAINT_FORMAT":
        this.state = this.getClipboardState(cmd.target, "COPY");
        this._isPaintingFormat = true;
        this.status = "visible";
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
    if (!this.state || !this.state.cells.length) {
      return "\t";
    }
    return (
      this.state.cells
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
   */
  private pasteMergeIfExist(origin: CellPosition, target: CellPosition) {
    let { sheetId, col, row } = origin;

    const [mainCellColOrigin, mainCellRowOrigin] = this.getters.getMainCell(sheetId, col, row);
    if (mainCellColOrigin === col && mainCellRowOrigin === row) {
      const merge = this.getters.getMerge(sheetId, col, row);
      if (!merge) {
        return;
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

  /**
   * Compute the complete zones where to paste the current clipboard
   */
  private getPasteZones(target: Zone[], cells: ClipboardCell[][]): Zone[] {
    if (!cells.length || !cells[0].length) {
      return target;
    }
    const pasteZones: Zone[] = [];
    const height = cells.length;
    const width = cells[0].length;
    const selection = target[target.length - 1];

    const col = selection.left;
    const row = selection.top;
    const repetitionCol = Math.max(1, Math.floor((selection.right + 1 - col) / width));
    const repetitionRow = Math.max(1, Math.floor((selection.bottom + 1 - row) / height));

    for (let x = 1; x <= repetitionCol; x++) {
      for (let y = 1; y <= repetitionRow; y++) {
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

  /**
   * Save the current selected zones in the clipboard state.
   */
  private getClipboardState(zones: Zone[], operation: ClipboardOperation) {
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));
    const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
    let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];
    clippedZones = clippedZones.map((zone) => ({ ...zone }));

    const rows: ClipboardCell[][] = [];
    const merges: Zone[] = [];
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
          const merge = this.getters.getMerge(sheetId, col, row);
          if (merge && merge.top === row && merge.left === col) {
            merges.push(merge);
          }
        }
      }
    }
    return {
      cells: rows,
      operation,
      sheetId,
      zones: clippedZones,
      merges,
    };
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
    if (!this.state) {
      return CommandResult.EmptyClipboard;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (this.state.cells.length > 1 || this.state.cells[0].length > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    if (!force) {
      for (let zone of this.getPasteZones(target, this.state.cells)) {
        if (this.getters.doesIntersectMerge(sheetId, zone)) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
  }

  private paste(
    target: Zone[],
    state: ClipboardState,
    options?: ClipboardOptions
  ): ClipboardSelection {
    if (state.operation === "CUT") {
      this.clearCutZone(state.cells, state.sheetId, state.zones);
    }
    const selection = this.pasteCells(target, state, options);
    if (state.operation === "CUT") {
      this.dispatch("REMOVE_MERGE", { sheetId: state.sheetId, target: state.merges });
      this.state = undefined;
    }
    return selection;
  }

  private pasteCells(
    target: Zone[],
    state: ClipboardState,
    options?: ClipboardOptions
  ): ClipboardSelection {
    const height = state.cells.length;
    const width = state.cells[0].length;
    if (target.length > 1) {
      for (const zone of target) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(width, height, col, row, state, options);
          }
        }
      }
      return undefined;
    }

    const selection = target[0];
    const col = selection.left;
    const row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
    for (let x = 0; x < repX; x++) {
      for (let y = 0; y < repY; y++) {
        this.pasteZone(width, height, col + x * width, row + y * height, state, options);
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
      return {
        anchor: [newCol, newRow],
        zones: [newSelection],
      };
    }
    return undefined;
  }

  private clearCutZone(cells: ClipboardCell[][], sheetId: UID, zones: Zone[]) {
    for (const row of cells) {
      for (const cell of row) {
        if (cell.cell) {
          this.dispatch("CLEAR_CELL", cell.position);
        }
      }
    }
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: sheetId,
      target: zones,
    });
  }

  private pasteZone(
    width: number,
    height: number,
    col: number,
    row: number,
    state: ClipboardState,
    pasteOption?: ClipboardOptions
  ) {
    // first, add missing cols/rows if needed
    this.addMissingDimensions(this.getters.getActiveSheet(), width, height, col, row);
    // then, perform the actual paste operation
    const sheetId = this.getters.getActiveSheetId();
    for (let r = 0; r < height; r++) {
      const rowCells = state.cells[r];
      for (let c = 0; c < width; c++) {
        const origin = rowCells[c];
        this.dispatch("PASTE_CELL", {
          origin,
          position: { col: col + c, row: row + r, sheetId },
          originalZones: state.zones,
          cut: state.operation === "CUT",
          pasteOption,
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
  private pasteCell(
    origin: ClipboardCell,
    target: CellPosition,
    operation: ClipboardOperation,
    zones: Zone[],
    pasteOption?: ClipboardOptions
  ) {
    const { sheetId, col, row } = target;
    const targetCell = this.getters.getCell(sheetId, col, row);

    if (pasteOption !== "onlyValue") {
      this.dispatch("SET_BORDER", { sheetId, col, row, border: origin.border });
    }
    if (origin.cell) {
      if (pasteOption === "onlyFormat") {
        this.dispatch("UPDATE_CELL", {
          ...target,
          style: origin.cell.style,
          format: origin.cell.format,
        });
        return;
      }

      if (pasteOption === "onlyValue") {
        const content = this.valueToContent(origin.cell.value);
        this.dispatch("UPDATE_CELL", { ...target, content });
        return;
      }
      let content = this.getters.getCellValue(origin.cell, origin.position.sheetId, true) || "";

      if (origin.cell.type === CellType.formula) {
        const offsetX = col - origin.position.col;
        const offsetY = row - origin.position.row;
        content = this.getUpdatedContent(sheetId, origin.cell, offsetX, offsetY, zones, operation);
      }
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        style: origin.cell.style || null,
        format: origin.cell.format,
      });
    } else if (targetCell) {
      if (pasteOption === "onlyValue") {
        this.dispatch("UPDATE_CELL", { ...target, content: "" });
      } else if (pasteOption === "onlyFormat") {
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
    offsetY: number,
    zones: Zone[],
    operation: ClipboardOperation
  ): string {
    if (operation === "CUT") {
      const ranges: Range[] = [];
      for (const range of cell.dependencies) {
        if (this.isZoneOverlapClippedZone(zones, range.zone)) {
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
  private isZoneOverlapClippedZone(zones: Zone[], zone: Zone): boolean {
    return zones.some((clippedZone) => overlap(zone, clippedZone));
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

  private interactivePaste(target: Zone[], pasteOption?: ClipboardOptions) {
    const result = this.isPasteAllowed(target, false);

    if (result !== CommandResult.Success) {
      if (result === CommandResult.WrongPasteSelection) {
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
      }
      if (result === CommandResult.WillRemoveExistingMerge) {
        this.ui.askConfirmation(
          _lt("Pasting here will remove existing merge(s). Paste anyway?"),
          () => this.dispatch("PASTE", { target, pasteOption, force: true })
        );
      }
    } else {
      this.dispatch("PASTE", { target, pasteOption });
    }
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    if (
      this.status !== "visible" ||
      !this.state ||
      !this.state.zones ||
      !this.state.zones.length ||
      this.state.sheetId !== this.getters.getActiveSheetId()
    ) {
      return;
    }
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "#3266ca";
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of this.state.zones) {
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
