import { ClipboardCellsState } from "../../helpers/clipboard/clipboard_cells_state";
import { ClipboardFigureState } from "../../helpers/clipboard/clipboard_figure_state";
import { ClipboardOsState } from "../../helpers/clipboard/clipboard_os_state";
import { isZoneValid, positions } from "../../helpers/index";
import {
  ClipboardContent,
  ClipboardMIMEType,
  ClipboardOperation,
  ClipboardState,
} from "../../types/clipboard";
import {
  Command,
  CommandResult,
  Dimension,
  GridRenderingContext,
  isCoreCommand,
  LAYERS,
  LocalCommand,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface InsertDeleteCellsTargets {
  cut: Zone[];
  paste: Zone[];
}

/**
 * Clipboard Plugin
 *
 * This clipboard manages all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends UIPlugin {
  static layers = [LAYERS.Clipboard];
  static getters = [
    "getClipboardContent",
    "getClipboardTextContent",
    "isCutOperation",
    "isPaintingFormat",
  ] as const;

  private status: "visible" | "invisible" = "invisible";
  private state?: ClipboardState;
  private lastPasteState?: ClipboardState;

  private _isPaintingFormat: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CUT":
        const zones = this.getters.getSelectedZones();
        const state = this.getClipboardState(zones, cmd.type);
        return state.isCutAllowed(zones);
      case "PASTE":
        if (!this.state) {
          return CommandResult.EmptyClipboard;
        }
        const pasteOption = cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        return this.state.isPasteAllowed(cmd.target, { pasteOption });
      case "PASTE_FROM_OS_CLIPBOARD": {
        const state = new ClipboardOsState(cmd.text, this.getters, this.dispatch, this.selection);
        return state.isPasteAllowed(cmd.target);
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardStateForCopyCells(cut, "CUT");
        return state.isPasteAllowed(paste);
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardStateForCopyCells(cut, "CUT");
        return state.isPasteAllowed(paste);
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
      case "CUT":
        const zones = this.getters.getSelectedZones();
        this.state = this.getClipboardState(zones, cmd.type);
        this.status = "visible";
        break;
      case "PASTE":
        if (!this.state) {
          break;
        }
        const pasteOption = cmd.pasteOption || (this._isPaintingFormat ? "onlyFormat" : undefined);
        this._isPaintingFormat = false;
        this.state.paste(cmd.target, { pasteOption, shouldPasteCF: true, selectTarget: true });
        if (this.state.operation === "CUT") {
          this.state = undefined;
        }
        this.lastPasteState = this.state;
        this.status = "invisible";
        break;
      case "CLEAN_CLIPBOARD_HIGHLIGHT":
        this.status = "invisible";
        break;
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        if (!isZoneValid(cut[0])) {
          for (const { col, row } of positions(cmd.zone)) {
            this.dispatch("CLEAR_CELL", { col, row, sheetId: this.getters.getActiveSheetId() });
          }
          break;
        }
        const state = this.getClipboardStateForCopyCells(cut, "CUT");
        state.paste(paste);
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const state = this.getClipboardStateForCopyCells(cut, "CUT");
        state.paste(paste);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we add a col/row inside or before the cut area, we invalidate the clipboard
        if (this.state?.operation !== "CUT" || cmd.sheetId !== this.state?.sheetId) {
          return;
        }
        const isClipboardDirty = this.state.isColRowDirtyingClipboard(
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
        if (this.state?.operation !== "CUT" || cmd.sheetId !== this.state?.sheetId) {
          return;
        }
        for (let el of cmd.elements) {
          const isClipboardDirty = this.state.isColRowDirtyingClipboard(el, cmd.dimension);
          if (isClipboardDirty) {
            this.state = undefined;
            break;
          }
        }
        this.status = "invisible";
        break;
      }
      case "PASTE_FROM_OS_CLIPBOARD":
        this.state = new ClipboardOsState(cmd.text, this.getters, this.dispatch, this.selection);
        this.state.paste(cmd.target);
        this.lastPasteState = this.state;
        this.status = "invisible";
        break;
      case "REPEAT_PASTE": {
        this.lastPasteState?.paste(cmd.target, {
          pasteOption: cmd.pasteOption,
          shouldPasteCF: true,
          selectTarget: true,
        });
        break;
      }
      case "ACTIVATE_PAINT_FORMAT": {
        const zones = this.getters.getSelectedZones();
        this.state = this.getClipboardStateForCopyCells(zones, "COPY");
        this._isPaintingFormat = true;
        this.status = "visible";
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
  getClipboardContent(): ClipboardContent {
    return this.state?.getClipboardContent() || { [ClipboardMIMEType.PlainText]: "\t" };
  }

  getClipboardTextContent(): string {
    return this.state?.getClipboardContent()[ClipboardMIMEType.PlainText] || "\t";
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

  private getClipboardStateForCopyCells(zones: Zone[], operation: ClipboardOperation) {
    return new ClipboardCellsState(zones, operation, this.getters, this.dispatch, this.selection);
  }

  /**
   * Get the clipboard state from the given zones.
   */
  private getClipboardState(zones: Zone[], operation: ClipboardOperation): ClipboardState {
    const selectedFigureId = this.getters.getSelectedFigureId();
    if (selectedFigureId) {
      return new ClipboardFigureState(operation, this.getters, this.dispatch);
    }
    return new ClipboardCellsState(zones, operation, this.getters, this.dispatch, this.selection);
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    if (this.status !== "visible" || !this.state) {
      return;
    }
    this.state.drawClipboard(renderingContext);
  }
}
