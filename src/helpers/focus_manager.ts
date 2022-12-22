export class FocusableElement {
  private focusableElement: HTMLElement | undefined = undefined;

  setFocusableElement(element: HTMLElement) {
    this.focusableElement = element;
  }

  focus() {
    this.focusableElement?.focus();
  }
}
