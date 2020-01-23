export class ContentEditableHelper {
  currentState = {
    value: "",
    cursorStart: 0,
    cursorEnd: 0
  };
  colors = {};
  el: HTMLElement | null = null;

  constructor() {}

  updateEl(el: HTMLElement) {
    this.el = el;
    this.el.focus();
    this.currentState = {
      value: "",
      cursorStart: 0,
      cursorEnd: 0
    };

    this.colors = {};
  }
  selectRange(start, end) {
    this.currentState.cursorStart = start;
    this.currentState.cursorEnd = end;
  }
  selectLast() {
    this.currentState.cursorStart = this.currentState.value.length - 1;
    this.currentState.cursorEnd = this.currentState.value.length - 1;
  }
  insertText(value, color) {
    this.currentState.value += value;
    this.colors[value] = color;
    this.currentState.cursorEnd = this.currentState.cursorStart + value.length;
    this.el!.innerText = this.currentState.value;
  }
  removeSelection() {
    this.currentState.cursorStart = 0;
    this.currentState.cursorEnd = 0;
  }
  getCurrentSelection() {
    return {
      start: this.currentState.cursorStart,
      end: this.currentState.cursorEnd
    };
  }
}
