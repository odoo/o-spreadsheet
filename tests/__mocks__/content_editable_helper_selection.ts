export class ContentEditableSelectionHelper {
  private el: HTMLElement;
  currentState = {
    cursorStart: 0,
    cursorEnd: 0,
  };
  anchorNode: Node | null = null;
  focusNode: Node | null = null;
  anchorOffset: number = 0;
  focusOffset: number = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.attachEventHandlers();
  }

  updateEl(el: HTMLElement) {
    this.el = el;
    this.currentState = {
      cursorStart: 0,
      cursorEnd: 0,
    };
    this.attachEventHandlers();
  }

  getRange() {
    return {
      setStart: (node: Node, offset: number) => {
        this.anchorNode = node;
        this.anchorOffset = offset;
      },
      setEnd: (node: Node, offset: number) => {
        this.focusNode = node;
        this.focusOffset = offset;
      },
    };
  }

  getStartAndEndSelection() {
    return {
      startElement: this.anchorNode || this.el,
      startSelectionOffset: this.anchorOffset,
      endElement: this.focusNode || this.el,
      endSelectionOffset: this.focusOffset,
    };
  }

  setEmptyRange() {
    return this.getRange();
  }

  removeSelection() {
    this.currentState.cursorStart = 0;
    this.currentState.cursorEnd = 0;
  }

  removeAll() {
    this.currentState.cursorStart = 0;
    this.currentState.cursorEnd = 0;
  }

  scrollSelectionIntoView() {}

  setSelection(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number) {
    this.anchorNode = anchorNode;
    this.focusNode = focusNode;
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.currentState.cursorStart = anchorOffset;
    this.currentState.cursorEnd = focusOffset;
    // update this.currentState
  }

  private attachEventHandlers() {
    if (this.el === null) return;
    this.el.addEventListener("keydown", (ev: KeyboardEvent) => this.onKeyDown(this.el, ev));
    this.el.addEventListener("focus", (ev: FocusEvent) => {
      // @ts-ignore
      window.mockContentHelper = this;
    });
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
}
