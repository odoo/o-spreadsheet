import { Plugin, signal } from "@odoo/owl";

export class FocusedSelectionInputPlugin extends Plugin {
  public focusedInstance = signal<Object | null>(null);

  focus(instance: Object) {
    this.focusedInstance.set(instance);
  }

  unfocus(instance: Object) {
    if (this.focusedInstance() && this.focusedInstance() === instance) {
      this.focusedInstance.set(null);
    }
  }
}
