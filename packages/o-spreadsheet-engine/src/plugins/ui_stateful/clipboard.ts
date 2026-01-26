import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { convertImageToPng } from "../../components/helpers/convert_image_to_png";
import { cellStyleToCss, cssPropertiesToCss } from "../../components/helpers/css";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { UuidGenerator } from "../../helpers";
import {
  applyClipboardHandlersPaste,
  getClipboardDataPositions,
  getPasteTargetFromHandlers,
  mapReplacer,
  selectPastedZone,
} from "../../helpers/clipboard/clipboard_helpers";
import { getMaxFigureSize } from "../../helpers/figures/figure/figure";
import { isZoneValid } from "../../helpers/zones";
import { getCurrentVersion } from "../../migrations/data";
import { clipboardHandlersRegistries } from "../../registries/clipboardHandlersRegistries";
import { _t } from "../../translation";
import {
  ClipboardCopyOptions,
  ClipboardData,
  ClipboardMIMEType,
  ClipboardOptions,
  Map2D,
  MinimalClipboardData,
  OSClipboardContent,
  SpreadsheetClipboardData,
} from "../../types/clipboard";
import { Command, CommandResult, isCoreCommand, LocalCommand } from "../../types/commands";
import { FileStore } from "../../types/files";
import { Dimension, HeaderIndex, UID, Zone } from "../../types/misc";
import { GridRenderingContext } from "../../types/rendering";
import { xmlEscape } from "../../xlsx/helpers/xml_helpers";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
  static layers = ["Clipboard"] as const;
  static getters = [
    "getClipboardTextAndImageContent",
    "getClipboardId",
    "getClipboardTextContent",
    "isCutOperation",
    "adaptClipboardContentFromJSON",
  ] as const;

  private status: "visible" | "invisible" = "invisible";
  private originSheetId?: UID;
  private copiedData?: MinimalClipboardData;
  private _isCutOperation: boolean = false;
  private clipboardId = new UuidGenerator().uuidv4();
  private fileStore?: FileStore;
  private uuidGenerator: UuidGenerator;

  constructor(config: UIPluginConfig) {
    super(config);
    this.fileStore = config.external.fileStore;
    this.uuidGenerator = new UuidGenerator();
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CUT":
        const zones = this.getters.getSelectedZones();
        return this.isCutAllowedOn(zones);
      case "PASTE_FROM_OS_CLIPBOARD": {
        const copiedData = this.convertTextToClipboardData(cmd.clipboardContent.text ?? "");
        const pasteOption = cmd.pasteOption;
        return this.isPasteAllowed(cmd.target, copiedData, { pasteOption, isCutOperation: false });
      }
      case "PASTE": {
        if (!this.copiedData) {
          return CommandResult.EmptyClipboard;
        }
        const pasteOption = cmd.pasteOption;
        return this.isPasteAllowed(cmd.target, this.copiedData, {
          pasteOption: pasteOption,
          isCutOperation: this._isCutOperation,
        });
      }
      case "COPY_PASTE_CELLS_ABOVE": {
        const zones = this.getters.getSelectedZones();
        if (zones.length > 1 || (zones[0].top === 0 && zones[0].bottom === 0)) {
          return CommandResult.InvalidCopyPasteSelection;
        }
        const zone = this.getters.getSelectedZone();
        const copiedData = this.getCopiedDataAbove(zone);
        return this.isPasteAllowed(zones, copiedData, {
          isCutOperation: false,
        });
      }
      case "COPY_PASTE_CELLS_ON_LEFT": {
        const zones = this.getters.getSelectedZones();
        if (zones.length > 1 || (zones[0].left === 0 && zones[0].right === 0)) {
          return CommandResult.InvalidCopyPasteSelection;
        }
        const zone = this.getters.getSelectedZone();
        const copiedData = this.getCopiedDataOnLeft(zone);
        return this.isPasteAllowed(zones, copiedData, {
          isCutOperation: false,
        });
      }
      case "COPY_PASTE_CELLS_ON_ZONE": {
        const zones = this.getters.getSelectedZones();
        if (zones.length > 1) {
          return CommandResult.InvalidCopyPasteSelection;
        }
        const zone = this.getters.getSelectedZone();
        const copiedData = this.getCopiedDataOnLeft(zone);
        return this.isPasteAllowed(zones, copiedData, {
          isCutOperation: false,
        });
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.copy(cut, "shiftCells");
        return this.isPasteAllowed(paste, copiedData, { isCutOperation: true });
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.copy(cut, "shiftCells");
        return this.isPasteAllowed(paste, copiedData, { isCutOperation: true });
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
        this._isCutOperation = cmd.type === "CUT";
        this.copiedData = this.copy(zones);
        break;
      case "PASTE_FROM_OS_CLIPBOARD": {
        this._isCutOperation = false;

        const htmlData = cmd.clipboardContent.data;
        // TODO: support multiple image import
        if (cmd.clipboardContent.imageData) {
          const sheetId = this.getters.getActiveSheetId();
          const figureId = this.uuidGenerator.uuidv4();
          const definition = cmd.clipboardContent.imageData;

          const size = getMaxFigureSize(this.getters, definition.size);
          this.dispatch("CREATE_IMAGE", {
            definition,
            size,
            col: cmd.target[0].left,
            row: cmd.target[0].top,
            offset: { x: 0, y: 0 },
            sheetId,
            figureId,
          });
        }
        if (htmlData) {
          this.copiedData = htmlData;
        } else {
          this.copiedData = this.convertTextToClipboardData(cmd.clipboardContent.text ?? "");
        }
        const pasteOption = cmd.pasteOption;
        this.paste(cmd.target, this.copiedData, {
          pasteOption,
          selectTarget: true,
          isCutOperation: false,
        });
        this.status = "invisible";
        this.copiedData = undefined;
        break;
      }
      case "PASTE": {
        const pasteOption = cmd.pasteOption;
        this.paste(cmd.target, this.copiedData, {
          pasteOption,
          selectTarget: true,
          isCutOperation: this._isCutOperation,
        });
        this.status = "invisible";
        if (this._isCutOperation) {
          this.copiedData = undefined;
          this._isCutOperation = false;
        }
        break;
      }
      case "COPY_PASTE_CELLS_ABOVE":
        {
          const zone = this.getters.getSelectedZone();
          this.originSheetId = this.getters.getActiveSheetId();
          const copiedData = this.getCopiedDataAbove(zone);
          this.paste([zone], copiedData, {
            isCutOperation: false,
            selectTarget: true,
          });
        }
        break;
      case "COPY_PASTE_CELLS_ON_LEFT":
        {
          const zone = this.getters.getSelectedZone();
          this.originSheetId = this.getters.getActiveSheetId();
          const copiedData = this.getCopiedDataOnLeft(zone);
          this.paste([zone], copiedData, {
            isCutOperation: false,
            selectTarget: true,
          });
        }
        break;
      case "COPY_PASTE_CELLS_ON_ZONE":
        {
          const zone = this.getters.getSelectedZone();
          this.originSheetId = this.getters.getActiveSheetId();
          const copiedData = this.getCopiedDataAboveOnLeft(zone);
          this.paste([zone], copiedData, {
            isCutOperation: false,
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
          this.dispatch("CLEAR_CELLS", {
            target: [cmd.zone],
            sheetId: this.getters.getActiveSheetId(),
          });
          break;
        }
        const copiedData = this.copy(cut, "shiftCells");
        this.paste(paste, copiedData, { isCutOperation: true });
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.copy(cut, "shiftCells");
        this.paste(paste, copiedData, { isCutOperation: true });
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we add a col/row inside or before the cut area, we invalidate the clipboard
        if (!this._isCutOperation || cmd.sheetId !== this.copiedData?.sheetId) {
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
        if (!this._isCutOperation || cmd.sheetId !== this.copiedData?.sheetId) {
          return;
        }
        for (const el of cmd.elements) {
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
        this.paste(cmd.target, this.copiedData, {
          isCutOperation: false,
          pasteOption: cmd.pasteOption,
          selectTarget: true,
        });
        break;
      }
      case "DELETE_SHEET":
        if (!this._isCutOperation) {
          return;
        }
        if (this.originSheetId === cmd.sheetId) {
          this.copiedData = undefined;
          this.status = "invisible";
        }
        break;
      default:
        if (isCoreCommand(cmd)) {
          this.status = "invisible";
        }
    }
  }

  private getCopiedDataAbove(zone: Zone) {
    const multipleRowsInSelection = zone.top !== zone.bottom;
    const copyTarget = {
      ...zone,
      bottom: multipleRowsInSelection ? zone.top : zone.top - 1,
      top: multipleRowsInSelection ? zone.top : zone.top - 1,
    };
    return this.copy([copyTarget]);
  }

  private getCopiedDataOnLeft(zone: Zone) {
    const multipleColsInSelection = zone.left !== zone.right;
    const copyTarget = {
      ...zone,
      right: multipleColsInSelection ? zone.left : zone.left - 1,
      left: multipleColsInSelection ? zone.left : zone.left - 1,
    };
    return this.copy([copyTarget]);
  }

  private getCopiedDataAboveOnLeft(zone: Zone) {
    const copyTarget = {
      ...zone,
      right: zone.left,
      bottom: zone.top,
    };
    return this.copy([copyTarget]);
  }

  private convertTextToClipboardData(clipboardData: string): {} {
    const handlers = this.selectClipboardHandlers({ figureId: true }).concat(
      this.selectClipboardHandlers({})
    );
    const copiedData = {};
    for (const { handlerName, handler } of handlers) {
      const data = handler.convertTextToClipboardData(clipboardData);
      if (data) copiedData[handlerName] = data;
      if (handlerName === "cell" && data) copiedData["cellContent"] = data.cellContent;
      const minimalKeys = ["sheetId", "zones", "figureId"];
      for (const key of minimalKeys) {
        if (data && key in data) {
          copiedData[key] = data[key];
        }
      }
    }
    return copiedData;
  }

  private selectClipboardHandlers(data: {}): {
    handlerName: string;
    handler: ClipboardHandler<any>;
  }[] {
    const handlersRegistry =
      "figureId" in data
        ? clipboardHandlersRegistries.figureHandlers
        : clipboardHandlersRegistries.cellHandlers;
    return handlersRegistry.getKeys().map((handlerName) => {
      const Handler = handlersRegistry.get(handlerName);
      return { handlerName, handler: new Handler(this.getters, this.dispatch) };
    });
  }

  private isCutAllowedOn(zones: Zone[]) {
    const clipboardData = this.getClipboardData(zones);
    for (const { handler } of this.selectClipboardHandlers(clipboardData)) {
      const result = handler.isCutAllowed(clipboardData);
      if (result !== CommandResult.Success) {
        return result;
      }
    }
    return CommandResult.Success;
  }

  private isPasteAllowed(target: Zone[], copiedData: {}, options: ClipboardOptions) {
    for (const { handler } of this.selectClipboardHandlers(copiedData)) {
      const result = handler.isPasteAllowed(this.getters.getActiveSheetId(), target, copiedData, {
        ...options,
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
    for (const zone of zones) {
      if (dimension === "COL" && position <= zone.right) {
        return true;
      }
      if (dimension === "ROW" && position <= zone.bottom) {
        return true;
      }
    }
    return false;
  }

  private copy(zones: Zone[], mode: ClipboardCopyOptions = "copyPaste"): MinimalClipboardData {
    const copiedData = {};
    const clipboardData = this.getClipboardData(zones);
    for (const { handlerName, handler } of this.selectClipboardHandlers(clipboardData)) {
      const data = handler.copy(clipboardData, this._isCutOperation, mode);
      if (data) copiedData[handlerName] = data;
      if (handlerName === "cell" && data) copiedData["cellContent"] = data.cellContent;
      const minimalKeys = ["sheetId", "zones", "figureId"];
      for (const key of minimalKeys) {
        if (data && key in data) {
          copiedData[key] = data[key];
        }
      }
    }
    return copiedData;
  }

  private paste(
    zones: Zone[],
    copiedData: MinimalClipboardData | undefined,
    options: ClipboardOptions
  ) {
    if (!copiedData) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    const handlers = this.selectClipboardHandlers(copiedData);
    const { target, zone, selectedZones } = getPasteTargetFromHandlers(
      sheetId,
      zones,
      copiedData,
      handlers,
      options
    );
    if (zone !== undefined) {
      this.addMissingDimensions(
        sheetId,
        zone.right - zone.left + 1,
        zone.bottom - zone.top + 1,
        zone.left,
        zone.top
      );
    }
    applyClipboardHandlersPaste(handlers, copiedData, target, options);
    if (!options?.selectTarget) {
      return;
    }
    selectPastedZone(this.selection, zones, selectedZones);
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
        sheetName: this.getters.getSheetName(sheetId),
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
        sheetName: this.getters.getSheetName(sheetId),
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

  getClipboardId(): string {
    return this.clipboardId;
  }

  async getClipboardTextAndImageContent(): Promise<OSClipboardContent> {
    const file = await this.getImageContent();
    const mime = file?.type;
    const content: OSClipboardContent = {
      [ClipboardMIMEType.PlainText]: this.getPlainTextContent(),
      [ClipboardMIMEType.Html]: await this.getHTMLContent(),
    };
    if (mime && file) {
      content[mime] = file;
    }
    return content;
  }

  adaptClipboardContentFromJSON(data: SpreadsheetClipboardData): SpreadsheetClipboardData {
    const handlers = clipboardHandlersRegistries.cellHandlers.getKeys();
    for (const handler of handlers) {
      //@ts-ignore
      if (handler in data.data && "cellContent" in data.data[handler]) {
        //@ts-ignore
        const content = data.data[handler].cellContent;
        //@ts-ignore
        data.data[handler].cellContent = new Map2D(content.width, content.height, content.map);
      }
    }
    return data;
  }

  private getSheetData(): SpreadsheetClipboardData {
    const data = {
      version: getCurrentVersion(),
      clipboardId: this.clipboardId,
    };
    if (this.copiedData && "figureId" in this.copiedData) {
      return data;
    }
    return {
      ...data,
      ...this.copiedData,
    };
  }

  private getPlainTextContent(): string {
    if (!this.copiedData?.cellContent) {
      return "\t";
    }
    return (
      this.copiedData.cellContent
        .toMatrix()
        .map((cells) => {
          return cells
            .map((c) =>
              this.getters.shouldShowFormulas() && c?.tokens?.length
                ? c?.content || ""
                : c?.evaluatedCell?.formattedValue || ""
            )
            .join("\t");
        })
        .join("\n") || "\t"
    );
  }

  private async getHTMLContent(): Promise<string> {
    let innerHTML: string = "";
    const cells = this.copiedData?.cellContent?.toMatrix();
    if (!cells) {
      if (this.copiedData?.figureId) {
        const figureId = this.copiedData.figureId;
        const figureSheetId = this.getters.getFigureSheetId(figureId)!;
        const figure = this.getters.getFigure(figureSheetId, figureId)!;
        if (figure.tag === "image") {
          innerHTML = await this.craftImageHTML(figureId);
        } else {
          innerHTML = "\t";
        }
      } else {
        innerHTML = "\t";
      }
    } else if (cells.length === 1 && cells[0].length === 1) {
      const position = cells[0][0]?.position;
      innerHTML = position ? `${this.getters.getCellText(position)}` : "";
    } else {
      let htmlTable = `<table border="1" style="border-collapse:collapse">`;
      for (const row of cells) {
        htmlTable += "<tr>";
        let skipped = 0;
        for (const cell of row) {
          if (!cell) {
            skipped++;
            continue;
          }
          if (skipped) {
            htmlTable += `<td/>`.repeat(skipped);
            skipped = 0;
          }
          const cssStyle = cssPropertiesToCss(
            cellStyleToCss(this.getters.getCellComputedStyle(cell.position))
          );
          const styleStr = cssStyle ? ` style="${cssStyle}"` : "";
          const cellText = this.getters.getCellText(cell.position);
          htmlTable += `<td${styleStr}>` + xmlEscape(cellText) + "</td>";
        }
        htmlTable += "</tr>";
      }
      htmlTable += "</table>";
      innerHTML = htmlTable;
    }
    const serializedData = JSON.stringify(this.getSheetData(), mapReplacer);
    return `<div data-osheet-clipboard='${xmlEscape(serializedData)}'>${innerHTML}</div>`;
  }

  private readFileAsDataURL(blob: Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  private async craftImageHTML(figureId: UID): Promise<string> {
    if (!this.fileStore) {
      return "\t";
    }
    const imageUrl = this.getters.getImage(figureId).path;
    const file = (await this.fileStore?.getFile(imageUrl)) || null;

    if (file) {
      const imageUrl = (await this.readFileAsDataURL(file)) as string;
      return `<img src="${xmlEscape(imageUrl)}" />`;
    } else {
      return "\t";
    }
  }

  private async getImageContent(): Promise<File | undefined> {
    const figureId = this.copiedData?.figureId;
    if (!figureId) {
      return;
    }

    const figureSheetId = this.getters.getFigureSheetId(figureId)!;
    const figure = this.getters.getFigure(figureSheetId, figureId)!;
    let file: File | Blob | null | undefined;
    if (figure.tag === "image") {
      if (!this.fileStore) {
        return;
      }
      const imageUrl = this.getters.getImage(figureId).path;
      file = await this.fileStore?.getFile(imageUrl);

      // we can only write on image/png format in the clipboard
      // So we convert the image to png if it's not already
      if (file.type !== "image/png") {
        if (file.size > MAX_FILE_SIZE) {
          this.ui.notifyUI({
            text: _t(
              "The file you are trying to copy is too large (>%sMB).\nIt will not be added to your OS clipboard.\nYou can download it directly instead.",
              Math.round(MAX_FILE_SIZE / (1024 * 1024))
            ),
            sticky: false,
            type: "warning",
          });
          return undefined;
        }
        file = await convertImageToPng(imageUrl);
      }
    }
    if (!file) {
      return undefined;
    } else {
      return file instanceof File ? file : new File([file], "image.png", { type: "image/png" });
    }
  }

  isCutOperation(): boolean {
    return this._isCutOperation ?? false;
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
    const sheetId = this.getters.getActiveSheetId();
    const selectedFigureId = this.getters.getSelectedFigureId();
    if (selectedFigureId) {
      return { figureId: selectedFigureId, sheetId };
    }
    const data = getClipboardDataPositions(sheetId, zones);
    if (!this._isCutOperation) {
      [...data.rowsIndexes].forEach((r) => {
        if (this.getters.isRowFiltered(sheetId, r)) {
          data.rowsIndexes.remove(r);
        }
      });
    }
    return data;
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
