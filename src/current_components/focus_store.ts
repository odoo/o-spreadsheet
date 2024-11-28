// The name is misleading and can be confused with the DOM focus.
export class FocusStore {
  mutators = ["focus", "unfocus"] as const;
  public focusedElement: object | null = null;

  focus(element: object) {
    this.focusedElement = element;
  }

  unfocus(element: object) {
    if (this.focusedElement && this.focusedElement === element) {
      this.focusedElement = null;
    }
  }
}
