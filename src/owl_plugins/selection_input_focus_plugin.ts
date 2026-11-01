import { Plugin, signal } from "@odoo/owl";

// The name is misleading and can be confused with the DOM focus.
export class SelectionInputFocusPlugin extends Plugin {
  // mutators = ["focus", "unfocus"] as const;
  public focusedElement = signal<object | null>(null);

  focus(element: object) {
    this.focusedElement.set(element);
  }

  unfocus(element: object) {
    if (this.focusedElement() && this.focusedElement() === element) {
      this.focusedElement.set(null);
    }
  }
}
