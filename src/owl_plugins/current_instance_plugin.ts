import { Plugin, signal } from "@odoo/owl";

export class FocusInstancePlugin<T extends Object> extends Plugin {
  public focusedInstance = signal<T | null>(null);

  focus(instance: T) {
    this.focusedInstance.set(instance);
  }

  unfocus(instance: T) {
    if (this.focusedInstance() && this.focusedInstance() === instance) {
      this.focusedInstance.set(null);
    }
  }
}
