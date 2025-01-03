export class DOMFocusableElementStore {
  mutators = ["setFocusableElement"] as const;
  focusableElement: HTMLElement | undefined = undefined;

  setFocusableElement(element: HTMLElement) {
    this.focusableElement = element;
  }
}
