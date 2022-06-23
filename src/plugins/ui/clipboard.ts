import { SELECTION_BORDER_COLOR } from "../../constants";
import { formatValue, mergeOverlappingZones, positions, union } from "../../helpers/index";
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
  static getters = ["getClipboardContent", "isCutOperation", "isPaintingFormat"] as const;

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
      case "CUT":
        this.state = this.getClipboardState(cmd.target, cmd.type);
        this.status = "visible";
        break;
      case "PASTE":
        if (!this.state) {
          break;
        }
        const pasteOption = cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        this._isPaintingFormat = false;
        const height = this.state.cells.length;
        const width = this.state.cells[0].length;
        const isCutOperation = this.state.operation === "CUT";
        this.paste(this.state, cmd.target, pasteOption);
        this.selectPastedZone(width, height, isCutOperation, cmd.target);
        this.status = "invisible";
        break;
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        this.paste(state, paste);
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        this.paste(state, paste);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we add a col/row inside or before the cut area, we invalidate the clipboard
        if (this.state?.operation !== "CUT") {
          return;
        }
        const isClipboardDirty = this.isColRowDirtyingClipboard(
          cmd.position === "before" ? cmd.base : cmd.base + 1,
          cmd.dimension
        );
        if (isClipboardDirty) {
          this.state = undefined;
        }
        break;
      }
      case "REMOVE_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we remove a col/row inside or before the cut area, we invalidate the clipboard
        if (this.state?.operation !== "CUT") {
          return;
        }
        for (let el of cmd.elements) {
          const isClipboardDirty = this.isColRowDirtyingClipboard(el, cmd.dimension);
          if (isClipboardDirty) {
            this.state = undefined;
            break;
          }
        }
        this.status = "invisible";
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

  isCutOperation(): boolean {
    return this.state ? this.state.operation === "CUT" : false;
  }

  isPaintingFormat(): boolean {
    return this._isPaintingFormat;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private getDeleteCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheetId = this.getters.getActiveSheetId();
    let cut: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        left: zone.right + 1,
        right: this.getters.getNumberCols(sheetId) - 1,
      };
    } else {
      cut = {
        ...zone,
        top: zone.bottom + 1,
        bottom: this.getters.getNumberRows(sheetId) - 1,
      };
    }
    return { cut: [cut], paste: [zone] };
  }

  private getInsertCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheetId = this.getters.getActiveSheetId();
    let cut: Zone;
    let paste: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        right: this.getters.getNumberCols(sheetId) - 1,
      };
      paste = {
        ...zone,
        left: zone.right + 1,
        right: zone.right + 1,
      };
    } else {
      cut = {
        ...zone,
        bottom: this.getters.getNumberRows(sheetId) - 1,
      };
      paste = { ...zone, top: zone.bottom + 1, bottom: this.getters.getNumberRows(sheetId) - 1 };
    }
    return { cut: [cut], paste: [paste] };
  }

  /**
   * If the position is the top-left of an existing merge, remove it
   */
  private removeMergeIfTopLeft(position: CellPosition) {
    const { sheetId, col, row } = position;
    const { col: left, row: top } = this.getters.getMainCellPosition(sheetId, col, row);
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

    const { col: mainCellColOrigin, row: mainCellRowOrigin } = this.getters.getMainCellPosition(
      sheetId,
      col,
      row
    );
    if (mainCellColOrigin === col && mainCellRowOrigin === row) {
      const merge = this.getters.getMerge(sheetId, col, row);
      if (!merge) {
        return;
      }
      ({ sheetId, col, row } = target);
      this.dispatch("ADD_MERGE", {
        sheetId,
        force: true,
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
    const lefts = new Set(zones.map((z) => z.left));
    const rights = new Set(zones.map((z) => z.right));
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));

    const areZonesCompatible =
      (tops.size === 1 && bottoms.size === 1) || (lefts.size === 1 && rights.size === 1);

    // In order to don't paste several times the same cells in intersected zones
    // --> we merge zones that have common cells
    const clippedZones = areZonesCompatible
      ? mergeOverlappingZones(zones)
      : [zones[zones.length - 1]];

    const cellsPosition = clippedZones.map((zone) => positions(zone)).flat();
    const columnsIndex = [...new Set(cellsPosition.map((p) => p.col))].sort((a, b) => a - b);
    const rowsIndex = [...new Set(cellsPosition.map((p) => p.row))].sort((a, b) => a - b);

    const cellsInClipboard: ClipboardCell[][] = [];
    const merges: Zone[] = [];
    const sheetId = this.getters.getActiveSheetId();

    for (let row of rowsIndex) {
      let cellsInRow: ClipboardCell[] = [];
      for (let col of columnsIndex) {
        cellsInRow.push({
          cell: this.getters.getCell(sheetId, col, row),
          border: this.getters.getCellBorder(sheetId, col, row) || undefined,
          position: { col, row, sheetId },
        });
        const merge = this.getters.getMerge(sheetId, col, row);
        if (merge && merge.top === row && merge.left === col) {
          merges.push(merge);
        }
      }
      cellsInClipboard.push(cellsInRow);
    }

    return {
      cells: cellsInClipboard,
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
    const sheetId = this.getters.getActiveSheetId();
    this.addMissingDimensions(sheetId, width, height, activeCol, activeRow);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        this.dispatch("UPDATE_CELL", {
          row: activeRow + i,
          col: activeCol + j,
          content: values[i][j],
          sheetId,
        });
      }
    }
    const zone = {
      left: activeCol,
      top: activeRow,
      right: activeCol + width - 1,
      bottom: activeRow + height - 1,
    };
    this.selection.selectZone({ cell: { col: activeCol, row: activeRow }, zone });
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
    ignoreMerges: boolean = false
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
    if (!ignoreMerges) {
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
      const height = state.cells.length;
      const width = state.cells[0].length;
      const pasteZones = this.pastedZones(target, width, height);
      for (const zone of pasteZones) {
        this.pasteZone(state, zone.left, zone.top, options);
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
    this.pasteZone(state, selection.left, selection.top);
    this.dispatch("MOVE_RANGES", {
      target: state.zones,
      sheetId: state.sheetId,
      targetSheetId: this.getters.getActiveSheetId(),
      col: selection.left,
      row: selection.top,
    });
    this.dispatch("REMOVE_MERGE", { sheetId: state.sheetId, target: state.merges });
    this.state = undefined;
  }

  /**
   * The clipped zone is copied as many times as it fits in the target.
   * This returns the list of zones where the clipped zone is copy-pasted.
   */
  private pastedZones(target: Zone[], originWidth: number, originHeight: number): Zone[] {
    const selection = target[0];
    const repeatHorizontally = Math.max(
      1,
      Math.floor((selection.right + 1 - selection.left) / originWidth)
    );
    const repeatVertically = Math.max(
      1,
      Math.floor((selection.bottom + 1 - selection.top) / originHeight)
    );
    const zones: Zone[] = [];
    for (let x = 0; x < repeatHorizontally; x++) {
      for (let y = 0; y < repeatVertically; y++) {
        const top = selection.top + y * originHeight;
        const left = selection.left + x * originWidth;
        zones.push({
          left,
          top,
          bottom: top + originHeight - 1,
          right: left + originWidth - 1,
        });
      }
    }
    return zones;
  }
  /**
   * Update the selection with the newly pasted zone
   */
  private selectPastedZone(width: number, height: number, isCutOperation: boolean, target: Zone[]) {
    const selection = target[0];
    const col = selection.left;
    const row = selection.top;
    if (height > 1 || width > 1 || isCutOperation) {
      const zones = this.pastedZones(target, width, height);
      const newZone = isCutOperation ? zones[0] : union(...zones);
      this.selection.selectZone({ cell: { col, row }, zone: newZone });
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
    const sheetId = this.getters.getActiveSheetId();
    // first, add missing cols/rows if needed
    this.addMissingDimensions(sheetId, width, height, col, row);
    // then, perform the actual paste operation
    for (let r = 0; r < height; r++) {
      const rowCells = state.cells[r];
      for (let c = 0; c < width; c++) {
        const origin = rowCells[c];
        const position = { col: col + c, row: row + r, sheetId: sheetId };
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
    sheetId: UID,
    width: number,
    height: number,
    col: number,
    row: number
  ) {
    const missingRows = height + row - this.getters.getNumberRows(sheetId);
    if (missingRows > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: this.getters.getNumberRows(sheetId) - 1,
        sheetId,
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - this.getters.getNumberCols(sheetId);
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: this.getters.getNumberCols(sheetId) - 1,
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
      const targetBorders = this.getters.getCellBorder(sheetId, col, row);
      const originBorders = origin.border;
      const border = {
        top: targetBorders?.top || originBorders?.top,
        bottom: targetBorders?.bottom || originBorders?.bottom,
        left: targetBorders?.left || originBorders?.left,
        right: targetBorders?.right || originBorders?.right,
      };
      this.dispatch("SET_BORDER", { sheetId, col, row, border });
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

      if (origin.cell.isFormula() && operation === "COPY") {
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
    const ranges = this.getters.createAdaptedRanges(cell.dependencies, offsetX, offsetY, sheetId);
    return this.getters.buildFormulaContent(sheetId, cell, ranges);
  }

  /**
   * Check if a col/row added/removed at the given position is dirtying the clipboard
   */
  private isColRowDirtyingClipboard(position: number, dimension: Dimension) {
    if (!this.state || !this.state.zones) return false;
    for (let zone of this.state.zones) {
      if (dimension === "COL" && position <= zone.right) {
        return true;
      }
      if (dimension === "ROW" && position <= zone.bottom) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    const viewport = this.getters.getActiveViewport();
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
