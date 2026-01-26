import { ClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_clipboard_handler";
import { SELECTION_BORDER_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import {
  applyClipboardHandlersPaste,
  getClipboardDataPositions,
  getPasteTargetFromHandlers,
  selectPastedZone,
} from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { HighlightStore } from "../../stores/highlight_store";
import { ClipboardCell, ClipboardOptions, Command, Highlight, Map2D, UID, Zone } from "../../types";

interface ClipboardContent {
  cells: Map2D<ClipboardCell>;
  zones: Zone[];
  sheetId: UID;
  [key: string]: unknown;
}

const PAINT_FORMAT_HANDLER_KEYS = [
  "cell",
  "border",
  "style",
  "table",
  "conditionalFormat",
  "merge",
] as const;

export class PaintFormatStore extends SpreadsheetStore {
  mutators = ["activate", "cancel", "pasteFormat"] as const;

  protected highlightStore = this.get(HighlightStore);

  private status: "inactive" | "oneOff" | "persistent" = "inactive";
  private copiedData?: ClipboardContent;

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.highlightStore.unRegister(this);
    });
  }

  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "PAINT_FORMAT":
        this.paintFormat(cmd.sheetId, cmd.target);
        break;
    }
  }

  activate(args: { persistent: boolean }) {
    this.copiedData = this.copyFormats();
    this.status = args.persistent ? "persistent" : "oneOff";
  }

  cancel() {
    this.status = "inactive";
    this.copiedData = undefined;
  }

  pasteFormat(target: Zone[]) {
    this.model.dispatch("PAINT_FORMAT", { target, sheetId: this.getters.getActiveSheetId() });
  }

  get isActive() {
    return this.status !== "inactive";
  }

  private get clipboardHandlers(): {
    handlerName: string;
    handler: ClipboardHandler<any>;
  }[] {
    return PAINT_FORMAT_HANDLER_KEYS.map((handlerName) => {
      const HandlerClass = clipboardHandlersRegistries.cellHandlers.get(handlerName);
      return {
        handlerName,
        handler: new HandlerClass(this.getters, this.model.dispatch),
      };
    });
  }

  private copyFormats(): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const zones = this.getters.getSelectedZones();

    const copiedData: Partial<ClipboardContent> = { zones, sheetId };
    for (const { handlerName, handler } of this.clipboardHandlers) {
      const handlerResult = handler.copy(getClipboardDataPositions(sheetId, zones), false);
      if (handlerResult !== undefined) {
        copiedData[handlerName] = handlerResult;
      }
    }

    return copiedData as ClipboardContent;
  }

  private paintFormat(sheetId: UID, target: Zone[]) {
    if (!this.copiedData) {
      return;
    }
    const options: ClipboardOptions = {
      isCutOperation: false,
      pasteOption: "onlyFormat",
    };
    const { target: pasteTarget, selectedZones } = getPasteTargetFromHandlers(
      sheetId,
      target,
      this.copiedData,
      this.clipboardHandlers,
      options
    );
    applyClipboardHandlersPaste(this.clipboardHandlers, this.copiedData, pasteTarget, options);
    selectPastedZone(this.model.selection, target, selectedZones);

    if (this.status === "oneOff") {
      this.cancel();
    }
  }

  get highlights(): Highlight[] {
    const data = this.copiedData;
    if (!data) {
      return [];
    }
    return data.zones.map((zone) => ({
      range: this.model.getters.getRangeFromZone(data.sheetId, zone),
      color: SELECTION_BORDER_COLOR,
      dashed: true,
      sheetId: data.sheetId,
      noFill: true,
      thinLine: true,
      interactive: false,
    }));
  }
}
