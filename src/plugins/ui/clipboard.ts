import { SELECTION_BORDER_COLOR } from "../../constants";
import { formatValue } from "../../helpers/cells/index";
import { clip } from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  CellPosition,
  ClipboardCell,
  ClipboardOptions,
  Command,
  CommandResult,
  Dimension,
  FormulaCell,
  GridRenderingContext,
  isCoreCommand,
  LAYERS,
  Sheet,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

type ClipboardOperation = "CUT" | "COPY";

interface InsertDeleteCellsTargets {
  cut: Zone[];
  paste: Zone[];
}

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
  static getters = ["getClipboardContent", "getClipboardOperation", "isPaintingFormat"];
  static modes: Mode[] = ["normal"];

  private status: "visible" | "invisible" = "invisible";
  private state?: ClipboardState;
  private _isPaintingFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "CUT":
        return this.isCutAllowed(cmd.target);
      case "PASTE":
        const pasteOption = cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        return this.isPasteAllowed(this.state, cmd.target, pasteOption, !!cmd.force);
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        return this.isPasteAllowed(state, paste);
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        return this.isPasteAllowed(state, paste);
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
        this.state = this.getClipboardState(cmd.target, cmd.type);
        this.status = "visible";
        break;
      case "CUT":
        if (cmd.interactive) {
          const cmdResult = this.isCutAllowed(cmd.target);
          this.interactiveCommand(cmdResult, cmd);
        } else {
          this.state = this.getClipboardState(cmd.target, cmd.type);
          this.status = "visible";
        }
        break;
      case "PASTE":
        if (!this.state) {
          break;
        }
        const pasteOption = cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        this._isPaintingFormat = false;
        if (cmd.interactive) {
          const cmdResult = this.isPasteAllowed(this.state, cmd.target, pasteOption);
          this.interactiveCommand(cmdResult, cmd);
        } else {
          this.selectPastedZone(this.state, cmd.target);
          this.paste(this.state, cmd.target, pasteOption);
          this.status = "invisible";
        }
        break;
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        if (cmd.interactive) {
          const cmdResult = this.isPasteAllowed(state, paste);
          this.interactiveCommand(cmdResult, cmd);
        } else {
          this.paste(state, paste);
        }
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        if (cmd.interactive) {
          const cmdResult = this.isPasteAllowed(state, paste);
          this.interactiveCommand(cmdResult, cmd);
        } else {
          this.paste(state, paste);
        }
        break;
      }
      case "PASTE_FROM_OS_CLIPBOARD":
        this.pasteFromClipboard(cmd.target, cmd.text);
        break;
      case "ACTIVATE_PAINT_FORMAT":
        this.state = this.getClipboardState(cmd.target, "COPY");
        this._isPaintingFormat = true;
        this.status = "visible";
        break;
      default:
        if (isCoreCommand(cmd)) {
          this.status = "invisible";
        }
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
              c.cell ? this.getters.getCellText(c.cell, this.getters.shouldShowFormulas()) : ""
            )
            .join("\t");
        })
        .join("\n") || "\t"
    );
  }

  getClipboardOperation(): ClipboardOperation | undefined {
    return this.state?.operation;
  }

  isPaintingFormat(): boolean {
    return this._isPaintingFormat;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private interactiveCommand(cmdResult: CommandResult, cmd: Command) {
    switch (cmdResult) {
      case CommandResult.Success:
        this.dispatch(cmd.type, { ...cmd, interactive: false });
        break;
      case CommandResult.WrongPasteSelection:
      case CommandResult.WrongCutSelection:
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
        break;
      case CommandResult.WillRemoveExistingMerge:
        this.ui.notifyUser(
          _lt(
            "This operation is not possible due to a merge. Please remove the merges first than try again."
          )
        );
        break;
    }
  }

  private getDeleteCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheet = this.getters.getActiveSheet();
    let cut: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        left: zone.right + 1,
        right: sheet.cols.length - 1,
      };
    } else {
      cut = {
        ...zone,
        top: zone.bottom + 1,
        bottom: sheet.rows.length - 1,
      };
    }
    return { cut: [cut], paste: [zone] };
  }

  private getInsertCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheet = this.getters.getActiveSheet();
    let cut: Zone;
    let paste: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        right: sheet.cols.length - 1,
      };
      paste = {
        ...zone,
        left: zone.right + 1,
        right: zone.right + 1,
      };
    } else {
      cut = {
        ...zone,
        bottom: sheet.rows.length - 1,
      };
      paste = { ...zone, top: zone.bottom + 1, bottom: sheet.rows.length - 1 };
    }
    return { cut: [cut], paste: [paste] };
  }

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
   * Get the clipboard state from the given zones.
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
    const zone = {
      left: activeCol,
      top: activeRow,
      right: activeCol + width - 1,
      bottom: activeRow + height - 1,
    };
    this.dispatch("SET_SELECTION", {
      anchor: [activeCol, activeRow],
      zones: [zone],
      anchorZone: zone,
    });
  }

  private isCutAllowed(target: Zone[]) {
    if (target.length !== 1) {
      return CommandResult.WrongCutSelection;
    }
    return CommandResult.Success;
  }

  private isPasteAllowed(
    state: ClipboardState | undefined,
    target: Zone[],
    pasteOption: ClipboardOptions | undefined = undefined,
    force: boolean = false
  ): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    if (!state) {
      return CommandResult.EmptyClipboard;
    }
    // cannot paste only format or only value if the previous operation is a CUT
    if (state.operation === "CUT" && pasteOption !== undefined) {
      return CommandResult.WrongPasteOption;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (state.cells.length > 1 || state.cells[0].length > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    if (!force) {
      for (let zone of this.getPasteZones(target, state.cells)) {
        if (this.getters.doesIntersectMerge(sheetId, zone)) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  private paste(state: ClipboardState, target: Zone[], options?: ClipboardOptions) {
    if (state.operation === "COPY") {
      this.pasteFromCopy(state, target, options);
    } else {
      this.pasteFromCut(state, target);
    }
  }

  private pasteFromCopy(state: ClipboardState, target: Zone[], options?: ClipboardOptions) {
    if (target.length === 1) {
      // in this specific case, due to the isPasteAllowed function:
      // state.cells can contains several cells.
      // So if the target zone is larger than the copied zone,
      // we duplicate each cells as many times as possible to fill the zone.
      const selection = target[0];
      const height = state.cells.length;
      const width = state.cells[0].length;
      const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
      const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
      for (let x = 0; x < repX; x++) {
        for (let y = 0; y < repY; y++) {
          this.pasteZone(state, selection.left + x * width, selection.top + y * height, options);
        }
      }
    } else {
      // in this case, due to the isPasteAllowed function: state.cells contains
      // only one cell
      for (const zone of target) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(state, col, row, options);
          }
        }
      }
    }
  }

  private pasteFromCut(state: ClipboardState, target: Zone[]) {
    this.clearClippedZones(state);
    const selection = target[0];
    /**
     * The paste from a "CUT" operation involve (for all the formulas of each cell
     * present on all sheets) the updating of the references of the cells (or
     * the ranges) which have been cut. For these reasons we only paste the cutting
     * zone once, even if the target contains more than one zone or a zone larger
     * than the cutting zone.
     */
    this.pasteZone(state, selection.left, selection.top);
    /**
     * Precision on updating references: if ranges dimensions exceed those of the
     * cut zone, these references must not be updated. For this reason, the update
     * of the references cannot be done during the "pasteCell" function because
     * we lack information to validate this case. A new command "MOVE_RANGE" was
     * therefore created to perform this job.
     */
    this.dispatch("MOVE_RANGES", {
      sheetId: state.sheetId,
      targetSheetId: this.getters.getActiveSheetId(),
      zone: state.zones[0],
      col: selection.left,
      row: selection.top,
    });
    this.dispatch("REMOVE_MERGE", { sheetId: state.sheetId, target: state.merges });
    this.state = undefined;
  }

  /**
   * Update the selection with the newly pasted zone
   */
  private selectPastedZone(state: ClipboardState, target: Zone[]) {
    const height = state.cells.length;
    const width = state.cells[0].length;
    const selection = target[0];
    const col = selection.left;
    const row = selection.top;

    if (state.operation === "CUT") {
      const newSelection = {
        left: col,
        top: row,
        right: col + width - 1,
        bottom: row + height - 1,
      };
      this.dispatch("SET_SELECTION", {
        anchor: [col, row],
        zones: [newSelection],
        anchorZone: newSelection,
      });
    } else if (height > 1 || width > 1) {
      const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
      const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
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
        anchorZone: newSelection,
      });
    }
  }

  /**
   * Clear the clipped zones: remove the cells and clear the formatting
   */
  private clearClippedZones(state: ClipboardState) {
    for (const row of state.cells) {
      for (const cell of row) {
        if (cell.cell) {
          this.dispatch("CLEAR_CELL", cell.position);
        }
      }
    }
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: state.sheetId,
      target: state.zones,
    });
  }

  private pasteZone(
    state: ClipboardState,
    col: number,
    row: number,
    pasteOption?: ClipboardOptions
  ) {
    const height = state.cells.length;
    const width = state.cells[0].length;
    // This condition is used to determine if we have to paste the CF or not.
    // We have to do it when the command handled is "PASTE", not "INSERT_CELL"
    // or "DELETE_CELL". So, the state should be the local state
    const shouldPasteCF = pasteOption !== "onlyValue" && this.state && this.state === state;
    const sheet = this.getters.getActiveSheet();
    // first, add missing cols/rows if needed
    this.addMissingDimensions(sheet, width, height, col, row);
    // then, perform the actual paste operation
    for (let r = 0; r < height; r++) {
      const rowCells = state.cells[r];
      for (let c = 0; c < width; c++) {
        const origin = rowCells[c];
        const position = { col: col + c, row: row + r, sheetId: sheet.id };
        this.removeMergeIfTopLeft(position);
        this.pasteMergeIfExist(origin.position, position);
        this.pasteCell(origin, position, state.operation, pasteOption);
        if (shouldPasteCF) {
          this.dispatch("PASTE_CONDITIONAL_FORMAT", {
            origin: origin.position,
            target: position,
            operation: state.operation,
          });
        }
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
        const content = formatValue(origin.cell.evaluated.value);
        this.dispatch("UPDATE_CELL", { ...target, content });
        return;
      }
      let content = origin.cell.content;

      if (origin.cell.isFormula()) {
        const offsetX = col - origin.position.col;
        const offsetY = row - origin.position.row;
        content = this.getUpdatedContent(sheetId, origin.cell, offsetX, offsetY, operation);
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
    operation: ClipboardOperation
  ): string {
    if (operation === "CUT") {
      return this.getters.buildFormulaContent(sheetId, cell.normalizedText, cell.dependencies);
    }
    const ranges = this.getters.createAdaptedRanges(cell.dependencies, offsetX, offsetY, sheetId);
    return this.getters.buildFormulaContent(sheetId, cell.normalizedText, ranges);
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
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of this.state.zones) {
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
