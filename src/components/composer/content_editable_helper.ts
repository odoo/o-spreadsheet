export class ContentEditableHelper {
  el: HTMLElement;
  constructor(el: HTMLElement | null) {
    this.el = el!;
  }

  updateEl(el: HTMLElement) {
    this.el = el;
    this.el.focus();
  }

  /**
   * select the text at position start to end, no matter the children
   */
  selectRange(start: number, end: number) {
    let selection = window.getSelection()!;
    this.removeSelection();
    let range = document.createRange();
    if (start == end && start === 0) {
      range.setStart(this.el, 0);
      range.setEnd(this.el, 0);
    } else {
      if (start < 0 || end > this.el!.textContent!.length) {
        console.warn(
          `wrong selection asked start ${start}, end ${end}, text content length ${
            this.el!.textContent!.length
          }`
        );
        if (start < 0) start = 0;
        if (end > this.el!.textContent!.length) end = this.el!.textContent!.length;
      }
      let startNode = this.findChildAtCharacterIndex(start);
      let endNode = this.findChildAtCharacterIndex(end);
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
    }
    selection.addRange(range);
  }

  /**
   * finds the dom element that contains the character at `offset`
   */
  private findChildAtCharacterIndex(offset: number): { node: Node; offset: number } {
    let it = this.iterateChildren(this.el);
    let current, previous;
    let usedCharacters = offset;
    do {
      current = it.next();
      if (!current.done && !current.value.hasChildNodes()) {
        if (current.value.textContent && current.value.textContent.length < usedCharacters) {
          usedCharacters -= current.value.textContent.length;
        } else {
          it.return(current.value);
        }
        previous = current.value;
      }
    } while (!current.done);

    if (current.value) {
      return { node: current.value, offset: usedCharacters };
    }
    return { node: previous, offset: usedCharacters };
  }

  /**
   * Iterate over the dom tree starting at `el` and over all the children depth first.
   * */
  private *iterateChildren(el): Generator<Node> {
    yield el;
    if (el.hasChildNodes()) {
      for (let child of el.childNodes) {
        yield* this.iterateChildren(child);
      }
    }
  }

  /**
   * insert text at the current selection point. If a selection of 1 or more elements is done,
   * the selection is replaced by the text to be inserted
   * */
  insertText(value: string, color: string = "#000") {
    document.execCommand("foreColor", false, color);
    document.execCommand("insertText", false, value);
  }

  /**
   * remove the current selection of the user
   * */
  removeSelection() {
    let selection = window.getSelection()!;
    selection.removeAllRanges();
  }

  removeAll() {
    if (this.el) {
      while (this.el.firstChild) {
        this.el.removeChild(this.el.firstChild);
      }
    }
  }

  /**
   * finds the indexes of the current selection.
   * */
  getCurrentSelection() {
    let { startElement, endElement, startSelectionOffset, endSelectionOffset } =
      this.getStartAndEndSelection();

    let startSizeBefore = this.findSelectionIndex(startElement!, startSelectionOffset);
    let endSizeBefore = this.findSelectionIndex(endElement!, endSelectionOffset);

    return {
      start: startSizeBefore,
      end: endSizeBefore,
    };
  }

  /**
   * Computes the text 'index' inside this.el based on the currently selected node and its offset.
   * The selected node is either a Text node or an Element node.
   *
   * case 1 -Text node:
   * the offset is the number of characters from the start of the node. We have to add this offset to the
   * content length of all previous nodes.
   *
   * case 2 - Element node:
   * the offset is the number of child nodes before the selected node. We have to add the content length of
   * all the bnodes prior to the selected node as well as the content of the child node before the offset.
   *
   * See the MDN documentation for more details.
   * https://developer.mozilla.org/en-US/docs/Web/API/Range/startOffset
   * https://developer.mozilla.org/en-US/docs/Web/API/Range/endOffset
   *
   */
  private findSelectionIndex(nodeToFind: Node, nodeOffset: number) {
    let it = this.iterateChildren(this.el);
    let usedCharacters = 0;
    let current = it.next();

    while (!current.done && current.value !== nodeToFind) {
      if (!current.value.hasChildNodes()) {
        if (current.value.textContent) {
          usedCharacters += current.value.textContent.length;
        }
      }
      current = it.next();
    }

    if (current.value === nodeToFind) {
      if (!current.value.hasChildNodes()) {
        usedCharacters += nodeOffset;
      } else {
        const children = [...current.value.childNodes].slice(0, nodeOffset);
        for (const child of children) {
          if (!child.textContent) continue;
          usedCharacters += child.textContent.length;
        }
      }
    }

    return usedCharacters;
  }

  private getStartAndEndSelection() {
    const selection = document.getSelection()!;

    const range = selection.getRangeAt(0);

    return {
      startElement: range.startContainer,
      startSelectionOffset: range.startOffset,
      endElement: range.endContainer,
      endSelectionOffset: range.endOffset,
    };
  }
}
