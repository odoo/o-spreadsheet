import { CellClipboardHandler } from "../../clipboard_handlers/cell_clipboard";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { HighlightStore } from "../../stores/highlight_store";
import { ClipboardCell, Highlight, UID, Zone } from "../../types";

interface ClipboardContent {
  cells: ClipboardCell[][];
  zones: Zone[];
  sheetId: UID;
}

export class PaintFormatStore extends SpreadsheetStore {
  mutators = ["activate", "cancel", "pasteFormat"] as const;

  protected highlightStore = this.get(HighlightStore);
  private cellClipboardHandler = new CellClipboardHandler(this.getters, this.model.dispatch);

  private status: "inactive" | "oneOff" | "persistent" = "inactive";
  private copiedData?: ClipboardContent;

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.highlightStore.unRegister(this);
    });
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
    if (this.copiedData) {
      const sheetId = this.getters.getActiveSheetId();
      this.cellClipboardHandler.paste({ zones: target, sheetId }, this.copiedData, {
        isCutOperation: false,
        pasteOption: "onlyFormat",
      });
    }
    if (this.status === "oneOff") {
      this.cancel();
    }
  }

  get isActive() {
    return this.status !== "inactive";
  }

  private copyFormats(): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const zones = this.getters.getSelectedZones();

    return this.cellClipboardHandler.copy(getClipboardDataPositions(sheetId, zones));
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
