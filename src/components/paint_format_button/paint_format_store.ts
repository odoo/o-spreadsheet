import { clipboardHandlersRegistries } from "../../clipboard_handlers";
import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { union } from "../../helpers";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { HighlightStore } from "../../stores/highlight_store";
import { ClipboardCell, Command, Highlight, UID, Zone } from "../../types";

interface ClipboardContent {
  cells: ClipboardCell[][];
  zones: Zone[];
  sheetId: UID;
}

// Include only the format-related handlers from clipboardHandlersRegistries
const PAINT_FORMAT_HANDLER_KEYS = ["cell", "border", "table", "conditionalFormat"] as const;

export class PaintFormatStore extends SpreadsheetStore {
  mutators = ["activate", "cancel", "pasteFormat"] as const;

  protected highlightStore = this.get(HighlightStore);

  private status: "inactive" | "oneOff" | "persistent" = "inactive";
  private copiedData?: ClipboardContent;

  private _clipboardHandlers?: {
    handlerName: string;
    handler: ClipboardHandler<any>;
  }[];

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
    this._clipboardHandlers = undefined;
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
    if (!this._clipboardHandlers) {
      this._clipboardHandlers = PAINT_FORMAT_HANDLER_KEYS.map((handlerName) => {
        const Handler = clipboardHandlersRegistries.cellHandlers.get(handlerName);
        return {
          handlerName,
          handler: new Handler(this.getters, this.model.dispatch),
        };
      });
    }
    return this._clipboardHandlers;
  }

  private copyFormats(): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const zones = this.getters.getSelectedZones();
    const copiedData: Partial<ClipboardContent> = { zones, sheetId };

    for (const { handlerName, handler } of this.clipboardHandlers) {
      const handlerResult = handler.copy(getClipboardDataPositions(sheetId, zones));
      if (handlerResult !== undefined) {
        copiedData[handlerName] = handlerResult;
      }
    }

    return copiedData as ClipboardContent;
  }

  private paintFormat(sheetId: UID, target: Zone[]) {
    const selectedZones: Zone[] = [];
    const copiedData = this.copiedData;
    if (!copiedData) {
      return;
    }

    for (const { handlerName, handler } of this.clipboardHandlers) {
      const handlerData = copiedData[handlerName];
      if (!handlerData) {
        continue;
      }

      const pasteTarget = handler.getPasteTarget(sheetId, target, handlerData, {
        isCutOperation: false,
        pasteOption: "onlyFormat",
      });
      selectedZones.push(...pasteTarget.zones);

      handler.paste({ zones: target, sheetId }, handlerData, {
        isCutOperation: false,
        pasteOption: "onlyFormat",
      });
    }

    const firstCell = {
      col: target[0].left,
      row: target[0].top,
    };
    this.model.selection.getBackToDefault();
    this.model.selection.selectZone(
      { cell: firstCell, zone: union(...selectedZones) },
      { scrollIntoView: false }
    );

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
      zone,
      color: SELECTION_BORDER_COLOR,
      dashed: true,
      sheetId: data.sheetId,
      noFill: true,
      thinLine: true,
      interactive: false,
    }));
  }
}
