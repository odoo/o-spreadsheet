import { toRaw } from "@odoo/owl";

// The name is misleading and can be confused with the DOM focus.
export class FocusStore {
  public focusedElement: object | null = null;

  focus(element: object) {
    this.focusedElement = element;
  }

  unfocus(element: object) {
    if (this.focusedElement && toRaw(this.focusedElement) === toRaw(element)) {
      this.focusedElement = null;
    }
  }
}
