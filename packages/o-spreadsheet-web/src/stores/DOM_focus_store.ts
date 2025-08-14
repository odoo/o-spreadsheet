export class DOMFocusableElementStore {
  mutators = ["setFocusableElement", "focus"] as const;
  private focusableElement: HTMLElement | undefined = undefined;

  setFocusableElement(element: HTMLElement) {
    this.focusableElement = element;
    return "noStateChange";
  }

  focus() {
    if (this.focusableElement === document.activeElement) {
      return "noStateChange";
    }
    this.focusableElement?.focus();
    return;
  }
}
