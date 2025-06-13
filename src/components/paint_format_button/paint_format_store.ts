import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { BorderClipboardHandler } from "../../clipboard_handlers/borders_clipboard";
import { CellClipboardHandler } from "../../clipboard_handlers/cell_clipboard";
import { ConditionalFormatClipboardHandler } from "../../clipboard_handlers/conditional_format_clipboard";
import { MergeClipboardHandler } from "../../clipboard_handlers/merge_clipboard";
import { TableClipboardHandler } from "../../clipboard_handlers/tables_clipboard";
import { SELECTION_BORDER_COLOR } from "../../constants";
import {
  applyClipboardHandlersPaste,
  getClipboardDataPositions,
  getPasteTargetFromHandlers,
} from "../../helpers/clipboard/clipboard_helpers";
import { selectPastedZone } from "../../helpers/selection";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { HighlightStore } from "../../stores/highlight_store";
import { ClipboardCell, ClipboardOptions, Command, Highlight, UID, Zone } from "../../types";

interface ClipboardContent {
  cells: ClipboardCell[][];
  zones: Zone[];
  sheetId: UID;
  [key: string]: unknown;
}

export class PaintFormatStore extends SpreadsheetStore {
  mutators = ["activate", "cancel", "pasteFormat"] as const;

  protected highlightStore = this.get(HighlightStore);
  private clipboardHandlers: { handlerName: string; handler: ClipboardHandler<any> }[] = [
    {
      handlerName: "cell",
      handler: new CellClipboardHandler(this.getters, this.model.dispatch),
    },
    {
      handlerName: "border",
      handler: new BorderClipboardHandler(this.getters, this.model.dispatch),
    },
    {
      handlerName: "table",
      handler: new TableClipboardHandler(this.getters, this.model.dispatch),
    },
    {
      handlerName: "conditionalFormat",
      handler: new ConditionalFormatClipboardHandler(this.getters, this.model.dispatch),
    },
    {
      handlerName: "merge",
      handler: new MergeClipboardHandler(this.getters, this.model.dispatch),
    },
  ];

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
