import { clipboardHandlersRegistries } from "../../clipboard_handlers";
import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { cellStyleToCss, cssPropertiesToCss } from "../../components/helpers";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import { isZoneValid, positions, union } from "../../helpers/index";
import {
  ClipboardContent,
  ClipboardData,
  ClipboardMIMEType,
  ClipboardOptions,
  ClipboardPasteTarget,
} from "../../types/clipboard";
import {
  ClipboardCell,
  Command,
  CommandResult,
  Dimension,
  GridRenderingContext,
  HeaderIndex,
  isCoreCommand,
  LocalCommand,
  UID,
  Zone,
} from "../../types/index";
import { xmlEscape } from "../../xlsx/helpers/xml_helpers";
import { UIPlugin } from "../ui_plugin";

interface InsertDeleteCellsTargets {
  cut: Zone[];
  paste: Zone[];
}

type MinimalClipboardData = {
  cells?: ClipboardCell[][];
  zones?: Zone[];
  figureId?: UID;
  [key: string]: unknown;
};
/**
 * Clipboard Plugin
 *
 * This clipboard manages all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends UIPlugin {
  static layers = ["Clipboard"] as const;
  static getters = [
    "getClipboardContent",
    "getClipboardTextContent",
    "isCutOperation",
    "isPaintingFormat",
  ] as const;

  private status: "visible" | "invisible" = "invisible";
  private paintFormatStatus: "inactive" | "oneOff" | "persistent" = "inactive";
  private originSheetId?: UID;
  private copiedData?: MinimalClipboardData;
  private _isCutOperation?: boolean;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CUT":
        const zones = this.getters.getSelectedZones();
        return this.isCutAllowedOn(zones);
      case "PASTE_FROM_OS_CLIPBOARD": {
        const copiedData = this.convertOSClipboardData(cmd.text);
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        return this.isPasteAllowed(cmd.target, copiedData, { pasteOption });
      }
      case "PASTE": {
        if (!this.copiedData) {
          return CommandResult.EmptyClipboard;
        }
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        return this.isPasteAllowed(cmd.target, this.copiedData, { pasteOption });
      }
      case "COPY_PASTE_CELLS_ABOVE": {
        const zones = this.getters.getSelectedZones();
        if (zones.length > 1 || (zones[0].top === 0 && zones[0].bottom === 0)) {
          return CommandResult.InvalidCopyPasteSelection;
        }
        break;
      }
      case "COPY_PASTE_CELLS_ON_LEFT": {
        const zones = this.getters.getSelectedZones();
        if (zones.length > 1 || (zones[0].left === 0 && zones[0].right === 0)) {
          return CommandResult.InvalidCopyPasteSelection;
        }
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.copy("CUT", cut);
        return this.isPasteAllowed(paste, copiedData, {});
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.copy("CUT", cut);
        return this.isPasteAllowed(paste, copiedData, {});
      }
      case "ACTIVATE_PAINT_FORMAT": {
        if (this.paintFormatStatus !== "inactive") {
          return CommandResult.AlreadyInPaintingFormatMode;
        }
        return CommandResult.Success;
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
      case "CUT":
        const zones = this.getters.getSelectedZones();
        this.status = "visible";
        this.originSheetId = this.getters.getActiveSheetId();
        this.copiedData = this.copy(cmd.type, zones);
        break;
      case "PASTE_FROM_OS_CLIPBOARD": {
        this.copiedData = this.convertOSClipboardData(cmd.text);
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        this.paste(cmd.target, {
          pasteOption,
          selectTarget: true,
        });
        this.status = "invisible";
        break;
      }
      case "PASTE": {
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        this.paste(cmd.target, {
          pasteOption,
          selectTarget: true,
        });
        if (this.paintFormatStatus === "oneOff") {
          this.paintFormatStatus = "inactive";
        }
        this.status = "invisible";
        if (this._isCutOperation) {
          this.copiedData = undefined;
        }
        break;
      }
      case "COPY_PASTE_CELLS_ABOVE":
        {
          const zone = this.getters.getSelectedZone();
          const multipleRowsInSelection = zone.top !== zone.bottom;
          const copyTarget = {
            ...zone,
            bottom: multipleRowsInSelection ? zone.top : zone.top - 1,
            top: multipleRowsInSelection ? zone.top : zone.top - 1,
          };
          this.originSheetId = this.getters.getActiveSheetId();
          this.copiedData = this.copy("COPY", [copyTarget]);
          this.paste([zone], {
            pasteOption: undefined,
            selectTarget: true,
          });
        }
        break;
      case "COPY_PASTE_CELLS_ON_LEFT":
        {
          const zone = this.getters.getSelectedZone();
          const multipleColsInSelection = zone.left !== zone.right;
          const copyTarget = {
            ...zone,
            right: multipleColsInSelection ? zone.left : zone.left - 1,
            left: multipleColsInSelection ? zone.left : zone.left - 1,
          };
          this.originSheetId = this.getters.getActiveSheetId();
          this.copiedData = this.copy("COPY", [copyTarget]);
          this.paste([zone], {
            pasteOption: undefined,
            selectTarget: true,
          });
        }
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
        this.copiedData = this.copy("CUT", cut);
        this.paste(paste, {});
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        this.copiedData = this.copy("CUT", cut);
        this.paste(paste, {});
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we add a col/row inside or before the cut area, we invalidate the clipboard
        if (this._isCutOperation !== true || cmd.sheetId !== this.copiedData?.sheetId) {
          return;
        }
        const isClipboardDirty = this.isColRowDirtyingClipboard(
          cmd.position === "before" ? cmd.base : cmd.base + 1,
          cmd.dimension
        );
        if (isClipboardDirty) {
          this.copiedData = undefined;
        }
        break;
      }
      case "REMOVE_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we remove a col/row inside or before the cut area, we invalidate the clipboard
        if (this._isCutOperation !== true || cmd.sheetId !== this.copiedData?.sheetId) {
          return;
        }
        for (let el of cmd.elements) {
          const isClipboardDirty = this.isColRowDirtyingClipboard(el, cmd.dimension);
          if (isClipboardDirty) {
            this.copiedData = undefined;
            break;
          }
        }
        this.status = "invisible";
        break;
      }
      case "REPEAT_PASTE": {
        this.paste(cmd.target, {
          pasteOption: cmd.pasteOption,
          selectTarget: true,
        });
        break;
      }
      case "ACTIVATE_PAINT_FORMAT": {
        const zones = this.getters.getSelectedZones();
        this.copiedData = this.copy("COPY", zones);
        this.status = "visible";
        if (cmd.persistent) {
          this.paintFormatStatus = "persistent";
        } else {
          this.paintFormatStatus = "oneOff";
        }
        break;
      }
      case "DELETE_SHEET":
        if (this._isCutOperation !== true) {
          return;
        }
        if (this.originSheetId === cmd.sheetId) {
          this.copiedData = undefined;
          this.status = "invisible";
        }
        break;
      case "CANCEL_PAINT_FORMAT": {
        this.paintFormatStatus = "inactive";
        this.status = "invisible";
        break;
      }
      default:
        if (isCoreCommand(cmd)) {
          this.status = "invisible";
        }
    }
  }

  private convertOSClipboardData(clipboardData: string): {} {
    this._isCutOperation = false;
    const handlers: ClipboardHandler<any>[] = clipboardHandlersRegistries.figureHandlers
      .getAll()
      .map((handler) => new handler(this.getters, this.dispatch));
    clipboardHandlersRegistries.cellHandlers
      .getAll()
      .forEach((handler) => handlers.push(new handler(this.getters, this.dispatch)));
    let copiedData = {};
    for (const handler of handlers) {
      const data = handler.convertOSClipboardData(clipboardData);
      copiedData = { ...copiedData, ...data };
    }
    return copiedData;
  }

  private selectClipboardHandlers(data: {}): ClipboardHandler<any>[] {
    if ("figureId" in data) {
      return clipboardHandlersRegistries.figureHandlers
        .getAll()
        .map((handler) => new handler(this.getters, this.dispatch));
    }
    return clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(this.getters, this.dispatch));
  }

  private isCutAllowedOn(zones: Zone[]) {
    const clipboardData = this.getClipboardData(zones);
    for (const handler of this.selectClipboardHandlers(clipboardData)) {
      const result = handler.isCutAllowed(clipboardData);
      if (result !== CommandResult.Success) {
        return result;
      }
    }
    return CommandResult.Success;
  }

  private isPasteAllowed(target: Zone[], copiedData: {}, options: ClipboardOptions | undefined) {
    for (const handler of this.selectClipboardHandlers(copiedData)) {
      const result = handler.isPasteAllowed(this.getters.getActiveSheetId(), target, copiedData, {
        ...options,
        isCutOperation: this.isCutOperation(),
      });
      if (result !== CommandResult.Success) {
        return result;
      }
    }
    return CommandResult.Success;
  }

  private isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean {
    if (!this.copiedData || !this.copiedData.zones) {
      return false;
    }
    const { zones } = this.copiedData;
    for (let zone of zones) {
      if (dimension === "COL" && position <= zone.right) {
        return true;
      }
      if (dimension === "ROW" && position <= zone.bottom) {
        return true;
      }
    }
    return false;
  }

  private copy(operation: "COPY" | "CUT", zones: Zone[]): MinimalClipboardData {
    let copiedData = {};
    this._isCutOperation = operation === "CUT";
    const clipboardData = this.getClipboardData(zones);
    for (const handler of this.selectClipboardHandlers(clipboardData)) {
      const data = handler.copy(clipboardData);
      copiedData = { ...copiedData, ...data };
    }
    return copiedData;
  }

  private paste(zones: Zone[], options: ClipboardOptions | undefined) {
    if (!this.copiedData) {
      return;
    }
    let zone: Zone | undefined = undefined;
    let selectedZones: Zone[] = [];
    let target: ClipboardPasteTarget = {
      zones,
    };
    const handlers = this.selectClipboardHandlers(this.copiedData);
    for (const handler of handlers) {
      const currentTarget = handler.getPasteTarget(zones, this.copiedData, {
        ...options,
        isCutOperation: this.isCutOperation(),
      });
      if (currentTarget.figureId) {
        target.figureId = currentTarget.figureId;
      }
      for (const targetZone of currentTarget.zones) {
        selectedZones.push(targetZone);
        if (zone === undefined) {
          zone = targetZone;
          continue;
        }
        zone = union(zone, targetZone);
      }
    }
    if (zone !== undefined) {
      this.addMissingDimensions(
        this.getters.getActiveSheetId(),
        zone.right - zone.left + 1,
        zone.bottom - zone.top + 1,
        zone.left,
        zone.top
      );
    }
    handlers.forEach((handler) =>
      handler.paste(target, this.copiedData, { ...options, isCutOperation: this.isCutOperation() })
    );
    if (!options?.selectTarget) {
      return;
    }
    const selection = zones[0];
    const col = selection.left;
    const row = selection.top;
    this.selection.getBackToDefault();
    this.selection.selectZone(
      { cell: { col, row }, zone: union(...selectedZones) },
      { scrollIntoView: false }
    );
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
  getClipboardTextContent(): string {
    return this.getPlainTextContent();
  }

  getClipboardContent(): ClipboardContent {
    return {
      [ClipboardMIMEType.PlainText]: this.getPlainTextContent(),
      [ClipboardMIMEType.Html]: this.getHTMLContent(),
    };
  }

  private getPlainTextContent(): string {
    if (!this.copiedData?.cells) {
      return "\t";
    }
    return (
      this.copiedData.cells
        .map((cells) => {
          return cells
            .map((c) =>
              this.getters.shouldShowFormulas() && c.cell?.isFormula
                ? c.cell?.content || ""
                : c.evaluatedCell?.formattedValue || ""
            )
            .join("\t");
        })
        .join("\n") || "\t"
    );
  }

  private getHTMLContent(): string | undefined {
    if (!this.copiedData?.cells) {
      return undefined;
    }
    const cells = this.copiedData.cells;
    if (cells.length === 1 && cells[0].length === 1) {
      return this.getters.getCellText(cells[0][0].position);
    }
    if (!cells[0][0]) {
      return "";
    }

    let htmlTable = '<table border="1" style="border-collapse:collapse">';
    for (const row of cells) {
      htmlTable += "<tr>";
      for (const cell of row) {
        if (!cell) {
          continue;
        }
        const cssStyle = cssPropertiesToCss(
          cellStyleToCss(this.getters.getCellComputedStyle(cell.position))
        );
        const cellText = this.getters.getCellText(cell.position);
        htmlTable += `<td style="${cssStyle}">` + xmlEscape(cellText) + "</td>";
      }
      htmlTable += "</tr>";
    }
    htmlTable += "</table>";
    return htmlTable;
  }

  isCutOperation(): boolean {
    return this._isCutOperation ?? false;
  }

  isPaintingFormat(): boolean {
    return this.paintFormatStatus !== "inactive";
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

  private getClipboardData(zones: Zone[]): ClipboardData {
    const selectedFigureId = this.getters.getSelectedFigureId();
    if (selectedFigureId) {
      return { figureId: selectedFigureId };
    }
    return getClipboardDataPositions(zones);
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawLayer(renderingContext: GridRenderingContext) {
    if (this.status !== "visible" || !this.copiedData) {
      return;
    }
    const { sheetId, zones } = this.copiedData;
    if (sheetId !== this.getters.getActiveSheetId() || !zones || !zones.length) {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3.3 * thinLineWidth;
    for (const zone of zones) {
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      if (width > 0 && height > 0) {
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
