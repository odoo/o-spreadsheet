import { Plugin, signal, usePlugin } from "@odoo/owl";
import { ModelPlugin } from "../../../owl_plugins/model_owl_plugin";
import { UID } from "../../../types/misc";

type HoverSheetCallback = (sheetId: UID) => void;

export class BottomBarSheetHoverPlugin extends Plugin {
  hoveredSheetId = signal<UID | undefined>(undefined);

  sheetHoverAnimationEndCallback = signal<HoverSheetCallback | undefined>(undefined);

  private modelPlugin = usePlugin(ModelPlugin);

  hoverSheet(sheetId: UID) {
    this.hoveredSheetId.set(sheetId);
  }

  stopHoverSheet(sheetId: UID) {
    if (this.hoveredSheetId() === sheetId) {
      this.hoveredSheetId.set(undefined);
    }
  }

  shouldRunAnimationOnSheetHover(sheetId: UID) {
    return (
      this.modelPlugin.model().getters.getActiveSheetId() !== sheetId &&
      this.sheetHoverAnimationEndCallback() &&
      this.hoveredSheetId() === sheetId
    );
  }

  registerSheetHoverAnimationCallback(callback: HoverSheetCallback) {
    this.sheetHoverAnimationEndCallback.set(callback);
  }

  unregisterSheetHoverAnimationCallback(callback: HoverSheetCallback) {
    if (this.sheetHoverAnimationEndCallback() === callback) {
      this.sheetHoverAnimationEndCallback.set(undefined);
    }
  }

  onSheetHoverAnimationEnd(sheetId: UID) {
    if (this.shouldRunAnimationOnSheetHover(sheetId)) {
      this.sheetHoverAnimationEndCallback()?.(sheetId);
    }
  }
}
