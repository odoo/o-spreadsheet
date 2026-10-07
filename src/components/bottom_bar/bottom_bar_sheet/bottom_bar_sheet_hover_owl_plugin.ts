import { Plugin, signal, usePlugin } from "@odoo/owl";
import { ModelPlugin } from "../../../owl_plugins/model_owl_plugin";
import { UID } from "../../../types/misc";

type HoverSheetCallback = (sheetId: UID) => void;

export class BottomBarSheetHoverPlugin extends Plugin {
  hoveredSheetId = signal<UID | undefined>(undefined);

  sheetHoverAnimationCallback = signal<HoverSheetCallback | undefined>(undefined);
  lastAnimationCallbackSheet = signal<UID | undefined>(undefined);

  private modelPlugin = usePlugin(ModelPlugin);

  hoverSheet(sheetId: UID) {
    this.hoveredSheetId.set(sheetId);
  }

  stopHoverSheet(sheetId: UID) {
    if (this.hoveredSheetId() === sheetId) {
      this.hoveredSheetId.set(undefined);
    }
    if (this.lastAnimationCallbackSheet() === sheetId) {
      this.lastAnimationCallbackSheet.set(undefined);
    }
  }

  shouldRunAnimationOnSheetHover(sheetId: UID) {
    return (
      this.modelPlugin.model().getters.getActiveSheetId() !== sheetId &&
      this.lastAnimationCallbackSheet() !== sheetId &&
      this.sheetHoverAnimationCallback() &&
      this.hoveredSheetId() === sheetId
    );
  }

  registerSheetHoverAnimationCallback(callback: HoverSheetCallback) {
    this.sheetHoverAnimationCallback.set(callback);
  }

  unregisterSheetHoverAnimationCallback(callback: HoverSheetCallback) {
    if (this.sheetHoverAnimationCallback() === callback) {
      this.sheetHoverAnimationCallback.set(undefined);
      this.lastAnimationCallbackSheet.set(undefined);
    }
  }

  onSheetHover(sheetId: UID) {
    if (this.shouldRunAnimationOnSheetHover(sheetId)) {
      this.sheetHoverAnimationCallback()?.(sheetId);
      this.lastAnimationCallbackSheet.set(sheetId);
    }
  }
}
