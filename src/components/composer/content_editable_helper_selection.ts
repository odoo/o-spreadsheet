export class ContentEditableSelectionHelper {
  private el: HTMLElement;
  constructor(el: HTMLElement) {
    this.el = document.createElement("span"); // create a dummy element to avoid null checks
  }

  updateEl(el: HTMLElement) {
    this.el = el;
  }

  getRange() {
    const selection = document.getSelection()!;
    return selection.getRangeAt(0);
  }

  getStartAndEndSelection() {
    const selection = document.getSelection()!;
    return {
      startElement: selection.anchorNode || this.el,
      startSelectionOffset: selection.anchorOffset,
      endElement: selection.focusNode || this.el,
      endSelectionOffset: selection.focusOffset,
    };
  }

  setEmptyRange() {
    const selection = document.getSelection()!;
    const range = document.createRange();
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }

  removeSelection() {
    const selection = document.getSelection()!;
    selection.removeAllRanges();
  }

  scrollSelectionIntoView() {
    const focusedNode = document.getSelection()?.focusNode;
    if (!focusedNode || !this.el.contains(focusedNode)) return;
    const element = focusedNode instanceof HTMLElement ? focusedNode : focusedNode.parentElement;
    element?.scrollIntoView({ block: "nearest" });
  }
}
