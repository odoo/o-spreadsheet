export class ContentEditableHelper {
  currentState = {
    cursorStart: 0,
    cursorEnd: 0,
  };
  colors = {};
  el: HTMLElement | null = null;
  manualRange: boolean = false;

  constructor() {}

  updateEl(el: HTMLElement) {
    this.el = el;
    this.el.focus();
    this.currentState = {
      cursorStart: 0,
      cursorEnd: 0,
    };

    this.colors = {};
  }
  selectRange(start, end) {
    this.manualRange = true;
    this.currentState.cursorStart = start;
    this.currentState.cursorEnd = end;
  }
  selectLast() {
    const text = this.el!.textContent!;
    this.currentState.cursorStart = text.length - 1;
    this.currentState.cursorEnd = text.length - 1;
  }
  insertText(value, color) {
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
    this.currentState.cursorEnd = this.currentState.cursorStart + value.length;
    this.manualRange = false;
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
}
