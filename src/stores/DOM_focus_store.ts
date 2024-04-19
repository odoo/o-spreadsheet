export class DOMFocusableElementStore {
  mutators = ["setFocusableElement", "focus"] as const;
  private focusableElement: HTMLElement | undefined = undefined;

  setFocusableElement(element: HTMLElement) {
    this.focusableElement = element;
  }

  focus() {
    this.focusableElement?.focus();
  }
}
