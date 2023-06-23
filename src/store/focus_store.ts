export class FocusStore {
  public focusedElement: unknown | null = null;

  focus(element: unknown) {
    this.focusedElement = element;
  }

  unfocus(element: unknown) {
    if (this.focusedElement === element) {
      this.focusedElement = null;
    }
  }
}
