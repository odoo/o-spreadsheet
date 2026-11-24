import { computed, onWillDestroy, signal, usePlugin } from "@odoo/owl";
import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { SELECTION_BORDER_COLOR } from "../../constants";
import {
  applyClipboardHandlersPaste,
  expandHandlerData,
  getClipboardDataPositions,
  getPasteTargetFromHandlers,
  selectPastedZone,
} from "../../helpers/clipboard/clipboard_helpers";
import { HighlightPlugin } from "../../owl_plugins/highlight_plugin";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { clipboardHandlersRegistries } from "../../registries/clipboard_handlers_registries";
import { ClipboardOptions } from "../../types/clipboard";
import { Command } from "../../types/commands";
import { ClipboardCell, Highlight, UID, Zone } from "../../types/misc";

interface ClipboardContent {
  cells: ClipboardCell[][];
  zones: Zone[];
  sheetId: UID;
  [key: string]: unknown;
}

const PAINT_FORMAT_HANDLER_KEYS = [
  "cell",
  "border",
  "table",
  "conditionalFormat",
  "merge",
] as const;

export class PaintFormatPlugin extends OwlPluginWithModel {
  protected highlightPlugin = usePlugin(HighlightPlugin);

  private status = signal<"inactive" | "oneOff" | "persistent">("inactive");
  private copiedData = signal<ClipboardContent | undefined>(undefined);

  setup() {
    super.setup();
    this.highlightPlugin.register(this);
    onWillDestroy(() => {
      this.highlightPlugin.unRegister(this);
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
    this.copiedData.set(this.copyFormats());
    this.status.set(args.persistent ? "persistent" : "oneOff");
  }

  cancel() {
    this.status.set("inactive");
    this.copiedData.set(undefined);
  }

  pasteFormat(target: Zone[]) {
    this.model().dispatch("PAINT_FORMAT", {
      target,
      sheetId: this.model().getters.getActiveSheetId(),
    });
  }

  isActive = computed(() => {
    return this.status() !== "inactive";
  });

  private get clipboardHandlers(): {
    handlerName: string;
    handler: ClipboardHandler<any>;
  }[] {
    return PAINT_FORMAT_HANDLER_KEYS.map((handlerName) => {
      const HandlerClass = clipboardHandlersRegistries.cellHandlers.get(handlerName);
      return {
        handlerName,
        handler: new HandlerClass(this.model().getters, this.model().dispatch),
      };
    });
  }

  private copyFormats(): ClipboardContent | undefined {
    const sheetId = this.model().getters.getActiveSheetId();
    const zones = this.model().getters.getSelectedZones();

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
    const copiedData = this.copiedData();
    if (!copiedData) {
      return;
    }
    const options: ClipboardOptions = {
      isCutOperation: false,
      pasteOption: "onlyFormat",
    };
    const expandedData = expandHandlerData(this.clipboardHandlers, copiedData);
    const { target: pasteTarget, selectedZones } = getPasteTargetFromHandlers(
      sheetId,
      target,
      this.clipboardHandlers,
      expandedData,
      options
    );
    applyClipboardHandlersPaste(this.clipboardHandlers, expandedData, pasteTarget, options, {
      sheetId: copiedData.sheetId,
      zones: copiedData.zones,
    });
    selectPastedZone(this.model().selection, target, selectedZones);

    if (this.status() === "oneOff") {
      this.cancel();
    }
  }

  get highlights(): Highlight[] {
    const data = this.copiedData();
    if (!data) {
      return [];
    }
    return data.zones.map((zone) => ({
      range: this.model().getters.getRangeFromZone(data.sheetId, zone),
      color: SELECTION_BORDER_COLOR,
      dashed: true,
      sheetId: data.sheetId,
      noFill: true,
      thinLine: true,
      interactive: false,
    }));
  }
}
