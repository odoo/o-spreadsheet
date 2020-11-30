export class ContentEditableHelper {
  currentState = {
    cursorStart: 0,
    cursorEnd: 0,
  };
  colors = {};
  el: HTMLElement | null = null;
  manualRange: boolean = false;

  updateEl(el: HTMLElement) {
    this.el = el;
    this.currentState = {
      cursorStart: 0,
      cursorEnd: 0,
    };
    this.attachEventHandlers();
    this.colors = {};
  }
  selectRange(start, end) {
    this.el!.focus();
    // @ts-ignore
    window.mockContentHelper = this;
    this.manualRange = true;
    this.currentState.cursorStart = start;
    this.currentState.cursorEnd = end;
  }
  insertText(value, color?: string) {
    const text = this.el!.textContent!;

    if (this.manualRange) {
      let start = text.substring(0, this.currentState.cursorStart);
      let end = text.substring(this.currentState.cursorEnd);
      let newValue = start + value + end;
      while (this.el!.firstChild) {
        this.el!.removeChild(this.el!.firstChild);
      }
      this.el!.append(newValue);
    } else {
      this.el!.append(value);
    }
    if (this.currentState.cursorStart === this.currentState.cursorEnd) {
      const position = this.currentState.cursorStart + value.length;
      this.currentState.cursorEnd = position;
      this.currentState.cursorStart = position;
    } else {
      this.currentState.cursorEnd = this.currentState.cursorStart + value.length;
      this.manualRange = false;
    }
    this.colors[value] = color;

    this.el!.dispatchEvent(new Event("input"));
  }
  removeSelection() {
    this.currentState.cursorStart = 0;
    this.currentState.cursorEnd = 0;
  }
  removeAll() {
    this.currentState.cursorStart = 0;
    this.currentState.cursorEnd = 0;
    while (this.el!.firstChild) {
      this.el!.removeChild(this.el!.firstChild);
    }
  }
  getCurrentSelection() {
    if (this.manualRange) {
      return { start: this.currentState.cursorStart, end: this.currentState.cursorEnd };
    }
    const v = this.el!.textContent || "";
    return {
      start: v.length,
      end: v.length,
    };
  }

  private attachEventHandlers() {
    if (this.el === null) return;
    this.el.addEventListener("keydown", (ev: KeyboardEvent) => this.onKeyDown(this.el!, ev));
  }

  /**
   * Mock default keydown events
   */
  private onKeyDown(el: HTMLElement, ev: KeyboardEvent) {
    switch (ev.key) {
      case "Home":
        this.currentState.cursorStart = 0;
        this.currentState.cursorEnd = 0;
        break;
      case "End":
        const end = el.textContent ? el.textContent.length : 0;
        this.currentState.cursorStart = end;
        this.currentState.cursorEnd = end;
        break;
    }
  }
}
