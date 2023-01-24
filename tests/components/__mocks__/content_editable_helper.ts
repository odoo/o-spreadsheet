import {
  HtmlContent,
  selectionIndicatorClass,
} from "../../../src/components/composer/composer/composer";

const initialSelectionState = {
  isSelectingRange: false,
  position: -1,
};
export class ContentEditableHelper {
  currentState = {
    cursorStart: 0,
    cursorEnd: 0,
  };
  colors = {};
  el: HTMLElement | null = null;
  manualRange: boolean = false;
  selectionState: { isSelectingRange: boolean; position: number } = initialSelectionState;
  contents: HtmlContent[][] = [];

  updateEl(el: HTMLElement) {
    this.el = el;
    this.currentState = {
      cursorStart: 0,
      cursorEnd: 0,
    };
    this.attachEventHandlers();
    this.colors = {};
  }
  selectRange(start: number, end: number) {
    this.manualRange = true;
    // We cannot set the cursor position beyond the text of the editor
    if (!this.el || !this.el.textContent || start < 0 || end > this.el.textContent.length) return;
    this.currentState.cursorStart = start;
    this.currentState.cursorEnd = end;
  }

  setText(values: HtmlContent[][]) {
    this.removeAll();
    this.selectionState = initialSelectionState;
    this.contents = values;
    for (const line of values) {
      for (const content of line) {
        this.insertText(content.value, { color: content.color, className: content.class });
      }
      if (line !== values[values.length - 1]) {
        this.insertText("\n");
      }
    }
  }

  insertText(value: string, { color, className }: { color?: string; className?: string } = {}) {
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
    if (className === selectionIndicatorClass) {
      this.selectionState = {
        isSelectingRange: true,
        position: this.currentState.cursorEnd,
      };
    }
  }

  removeAll() {
    this.selectionState = initialSelectionState;
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
    // @ts-ignore
    this.el.addEventListener("focus", (ev: FocusEvent) => (window.mockContentHelper = this));
  }

  /**
   * Mock default keydown events
   */
  private onKeyDown(el: HTMLElement, ev: KeyboardEvent) {
    if (ev.defaultPrevented) {
      return;
    }
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
      case "ArrowRight":
        this.currentState.cursorEnd += 1;
        this.currentState.cursorStart = ev.shiftKey
          ? this.currentState.cursorStart
          : this.currentState.cursorEnd;
        break;
      case "ArrowLeft":
        this.currentState.cursorEnd -= 1;
        this.currentState.cursorStart = ev.shiftKey
          ? this.currentState.cursorStart
          : this.currentState.cursorEnd;
        break;
    }
  }

  scrollSelectionIntoView() {}

  getText() {
    return this.el!.textContent || "";
  }
}
