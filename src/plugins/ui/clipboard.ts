import { SELECTION_BORDER_COLOR } from "../../constants";
import { formatValue } from "../../helpers/cells/index";
import {
  clip,
  isZoneInside,
  overlap,
  positions,
  rangesToZones,
  sumOfArray,
  zoneToDimension,
  zoneToXc,
} from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  ApplyRangeChange,
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
  Range,
  Sheet,
  UID,
  Zone,
  ZoneDimension,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

type ClipboardOperation = "CUT" | "COPY";

interface CellsAndMerges {
  cells: ClipboardCell[][];
  merges: Zone[];
}

interface InsertDeleteCellsTargets {
  cut: Zone[];
  paste: Zone[];
}

interface ClipboardState {
  clipboardDims: ZoneDimension;
  operation: ClipboardOperation;
  ranges: Range[];
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
  static modes: Mode[] = ["normal"];

  private status: "visible" | "invisible" = "invisible";
  private state?: ClipboardState;
  private _isPaintingFormat: boolean = false;

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    if (this.state && (!sheetId || sheetId === this.state.sheetId)) {
      for (let range of this.state.ranges) {
        const change = applyChange(range);
        if (change.changeType === "REMOVE") {
          const copy = this.state.ranges.slice();
          copy.splice(this.state.ranges.indexOf(range), 1);
          if (copy.length > 0) {
            this.history.update("state", "ranges", copy);
            this.history.update(
              "state",
              "clipboardDims",
              this.getClippedZoneDims(rangesToZones(copy))
            );
          } else {
            this.history.update("state", undefined);
          }
        } else if (change.changeType !== "NONE") {
          this.history.update("state", "ranges", this.state.ranges.indexOf(range), change.range);
          this.history.update(
            "state",
            "clipboardDims",
            this.getClippedZoneDims(rangesToZones(this.state.ranges))
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "PASTE":
        return this.isPasteAllowed(this.state, cmd.target, !!cmd.force);
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        return this.isPasteAllowed(state, paste, false);
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        return this.isPasteAllowed(state, paste, false);
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
        const pasteOption: ClipboardOptions | undefined =
          cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        this._isPaintingFormat = false;
        if (cmd.interactive) {
          this.interactivePaste(this.state, cmd.target, cmd);
        } else {
          const height = this.state.clipboardDims.height;
          const width = this.state.clipboardDims.width;
          this.paste(this.state, cmd.target, pasteOption);
          this.selectPastedZone(width, height, cmd.target);
          this.status = "invisible";
        }
        break;
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        if (cmd.interactive) {
          this.interactivePaste(state, paste, cmd);
        } else {
          this.paste(state, paste);
        }
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardState(cut, "CUT");
        if (cmd.interactive) {
          this.interactivePaste(state, paste, cmd);
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
      case "ADD_MERGE": {
        if (!this.state) return;
        let isClipboardDirty = false;
        for (let mergedZone of cmd.target) {
          for (let clipboardZone of rangesToZones(this.state.ranges)) {
            if (overlap(clipboardZone, mergedZone) && !isZoneInside(mergedZone, clipboardZone)) {
              isClipboardDirty = true;
              break;
            }
          }
        }
        if (isClipboardDirty) {
          this.state = undefined;
        }
        this.status = "invisible";
        break;
      }
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
    if (!this.state || !this.state.clipboardDims.width || !this.state.clipboardDims.height) {
      return "\t";
    }

    const { cells } = this.getCellsInRanges(this.state.ranges);
    return (
      cells
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

  isPaintingFormat(): boolean {
    return this._isPaintingFormat;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

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
  private getPasteZones(target: Zone[], dims: ZoneDimension): Zone[] {
    if (!dims.height || !dims.width) {
      return target;
    }
    const pasteZones: Zone[] = [];
    const height = dims.height;
    const width = dims.width;
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
  private getClipboardState(zones: Zone[], operation: ClipboardOperation): ClipboardState {
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));

    const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
    let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];
    clippedZones = clippedZones.map((zone) => ({ ...zone }));

    const clipboardDims = this.getClippedZoneDims(clippedZones);

    const sheetId = this.getters.getActiveSheetId();
    const ranges = clippedZones.map((zone) =>
      this.getters.getRangeFromSheetXC(sheetId, zoneToXc(zone))
    );

    return {
      operation,
      sheetId,
      ranges: ranges,
      clipboardDims,
    };
  }

  /**
   * Get dimensions of the clipped zones.
   *
   * If given multiple zones, the zones should be compatibles, ie. they should all be aligned inside the same
   * rows/columns
   */
  private getClippedZoneDims(clippedZones: Zone[]): ZoneDimension {
    if (clippedZones.length === 1) {
      return zoneToDimension(clippedZones[0]);
    }

    // As the zones are compatible, they all have either the same height or width,
    // and we need only to compute the other dimension.
    const dims = zoneToDimension(clippedZones[0]);
    const zonesDimensions = clippedZones.map(zoneToDimension);
    const isVertical = clippedZones[0].left === clippedZones[1].left;
    if (isVertical) {
      dims.height = sumOfArray(zonesDimensions.map((dim) => dim.height));
    } else {
      dims.width = sumOfArray(zonesDimensions.map((dim) => dim.width));
    }

    return dims;
  }

  /**
   * Get the cells and merges from the given ranges.
   */
  private getCellsInRanges(ranges: Range[]): CellsAndMerges {
    const cellsInClipboard: ClipboardCell[][] = [];
    const merges: Zone[] = [];

    const sheetId = ranges[0].sheetId;
    const cellsPosition = ranges.map((range) => positions(range.zone)).flat();
    const columnsIndex = [...new Set(cellsPosition.map((p) => p[0]))].sort((a, b) => a - b);
    const rowsIndex = [...new Set(cellsPosition.map((p) => p[1]))].sort((a, b) => a - b);

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
      merges: merges,
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

  private isPasteAllowed(
    state: ClipboardState | undefined,
    target: Zone[],
    force: boolean
  ): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    if (!state) {
      return CommandResult.EmptyClipboard;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (state.clipboardDims.height > 1 || state.clipboardDims.width > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    if (!force) {
      for (let zone of this.getPasteZones(target, state.clipboardDims)) {
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
    if (!state) return;
    const { cells, merges } = this.getCellsInRanges(state.ranges);

    if (state.operation === "CUT") {
      this.clearClippedZones(state);
    }
    if (target.length > 1) {
      for (const zone of target) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(state, cells, col, row, options);
          }
        }
      }
    } else {
      const height = state.clipboardDims.height;
      const width = state.clipboardDims.width;
      const selection = target[0];
      const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
      const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
      for (let x = 0; x < repX; x++) {
        for (let y = 0; y < repY; y++) {
          this.pasteZone(
            state,
            cells,
            selection.left + x * width,
            selection.top + y * height,
            options
          );
        }
      }
    }

    if (state.operation === "CUT") {
      this.dispatch("REMOVE_MERGE", { sheetId: state.sheetId, target: merges });
      this.state = undefined;
    }
  }

  /**
   * Update the selection with the newly pasted zone
   */
  private selectPastedZone(width: number, height: number, target: Zone[]) {
    const selection = target[0];
    const col = selection.left;
    const row = selection.top;
    const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / width));
    const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / height));
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
        anchorZone: newSelection,
      });
    }
  }

  /**
   * Clear the clipped zones: remove the cells and clear the formatting
   */
  private clearClippedZones(state: ClipboardState) {
    for (let zone of rangesToZones(state.ranges)) {
      for (const [col, row] of positions(zone)) {
        this.dispatch("CLEAR_CELL", {
          sheetId: state.sheetId,
          col: col,
          row: row,
        });
      }
    }
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: state.sheetId,
      target: rangesToZones(state.ranges),
    });
  }

  private pasteZone(
    state: ClipboardState,
    cells: ClipboardCell[][],
    col: number,
    row: number,
    pasteOption?: ClipboardOptions
  ) {
    const height = state.clipboardDims.height;
    const width = state.clipboardDims.width;
    // This condition is used to determine if we have to paste the CF or not.
    // We have to do it when the command handled is "PASTE", not "INSERT_CELL"
    // or "DELETE_CELL". So, the state should be the local state
    const shouldPasteCF = pasteOption !== "onlyValue" && this.state && this.state === state;
    const sheet = this.getters.getActiveSheet();
    // first, add missing cols/rows if needed
    this.addMissingDimensions(sheet, width, height, col, row);
    // then, perform the actual paste operation
    for (let r = 0; r < height; r++) {
      const rowCells = cells[r];
      for (let c = 0; c < width; c++) {
        const origin = rowCells[c];
        const position = { col: col + c, row: row + r, sheetId: sheet.id };
        this.removeMergeIfTopLeft(position);
        this.pasteMergeIfExist(origin.position, position);
        this.pasteCell(origin, position, state.operation, state.ranges, pasteOption);
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
    ranges: Range[],
    pasteOption?: ClipboardOptions
  ) {
    const { sheetId, col, row } = target;
    const targetCell = this.getters.getCell(sheetId, col, row);
    const zones = rangesToZones(ranges);

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
      for (const range of cell.dependencies.references) {
        if (this.isZoneOverlapClippedZone(zones, range.zone)) {
          ranges.push(...this.getters.createAdaptedRanges([range], offsetX, offsetY, sheetId));
        } else {
          ranges.push(range);
        }
      }
      const dependencies = { ...cell.dependencies, references: ranges };
      return this.getters.buildFormulaContent(sheetId, cell.normalizedText, dependencies);
    }
    const ranges = this.getters.createAdaptedRanges(
      cell.dependencies.references,
      offsetX,
      offsetY,
      sheetId
    );
    const dependencies = { ...cell.dependencies, references: ranges };
    return this.getters.buildFormulaContent(sheetId, cell.normalizedText, dependencies);
  }

  /**
   * Check if the given zone and at least one of the clipped zones overlap
   */
  private isZoneOverlapClippedZone(zones: Zone[], zone: Zone): boolean {
    return zones.some((clippedZone) => overlap(zone, clippedZone));
  }

  private interactivePaste(state: ClipboardState, target: Zone[], cmd: Command) {
    const result = this.isPasteAllowed(state, target, false);

    if (result !== CommandResult.Success) {
      if (result === CommandResult.WrongPasteSelection) {
        this.ui.notifyUser(_lt("This operation is not allowed with multiple selections."));
      }
      if (result === CommandResult.WillRemoveExistingMerge) {
        this.ui.notifyUser(
          _lt(
            "This operation is not possible due to a merge. Please remove the merges first than try again."
          )
        );
      }
    } else {
      this.dispatch(cmd.type, { ...cmd, interactive: false });
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
      !this.state.ranges ||
      !this.state.ranges.length ||
      this.state.sheetId !== this.getters.getActiveSheetId()
    ) {
      return;
    }
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const range of this.state.ranges) {
      const [x, y, width, height] = this.getters.getRect(range.zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
