import { iterateChildren } from "../helpers/dom_helpers";
import { NEWLINE } from "./../../constants";
import { HtmlContent } from "./composer/composer";

export class ContentEditableHelper {
  el: HTMLElement;
  constructor(el: HTMLElement | null) {
    this.el = el!;
  }

  updateEl(el: HTMLElement) {
    this.el = el;
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
      selection.addRange(range);
    } else {
      const textLength = this.getText().length;
      if (start < 0 || end > textLength) {
        console.warn(
          `wrong selection asked start ${start}, end ${end}, text content length ${textLength}`
        );
        if (start < 0) start = 0;
        if (end > textLength) end = textLength;
      }
      let startNode = this.findChildAtCharacterIndex(start);
      let endNode = this.findChildAtCharacterIndex(end);
      range.setStart(startNode.node, startNode.offset);
      selection.addRange(range);
      selection.extend(endNode.node, endNode.offset);
    }
  }

  /**
   * finds the dom element that contains the character at `offset`
   */
  private findChildAtCharacterIndex(offset: number): { node: Node; offset: number } {
    let it = iterateChildren(this.el);
    let current, previous;
    let usedCharacters = offset;
    let isFirstParagraph = true;
    do {
      current = it.next();
      if (!current.done && !current.value.hasChildNodes()) {
        if (current.value.textContent && current.value.textContent.length < usedCharacters) {
          usedCharacters -= current.value.textContent.length;
        } else if (
          current.value.textContent &&
          current.value.textContent.length >= usedCharacters
        ) {
          it.return(current.value);
        }
        previous = current.value;
      }
      // One new paragraph = one new line character, except for the first paragraph
      if (!current.done && current.value.nodeName === "P") {
        if (isFirstParagraph) {
          isFirstParagraph = false;
        } else {
          usedCharacters--;
        }
      }
    } while (!current.done && usedCharacters);

    if (current.value) {
      return { node: current.value, offset: usedCharacters };
    }
    return { node: previous, offset: usedCharacters };
  }

  /**
   * Sets (or Replaces all) the text inside the root element in the form of distinctive
   * span for each element provided in `contents`.
   *
   * Each span will have its own fontcolor and specific class if provided in the HtmlContent object.
   */
  setText(contents: HtmlContent[][]) {
    this.el.innerHTML = "";
    if (contents.length === 0) {
      return;
    }

    for (const line of contents) {
      const p = document.createElement("p");

      // Empty line
      if (line.length === 0 || line.every((content) => content.value === "" && !content.class)) {
        p.appendChild(document.createElement("br"));
        this.el.appendChild(p);
        continue;
      }

      for (const content of line) {
        if (!content.value && !content.class) {
          continue;
        }
        const span = document.createElement("span");
        span.innerText = content.value;
        if (content.color) {
          span.style.color = content.color;
        }
        if (content.class) {
          span.classList.add(content.class);
        }
        p.appendChild(span);
      }

      this.el.appendChild(p);
    }
  }

  scrollToSelection() {
    const focusedNode = document.getSelection()?.focusNode;
    if (focusedNode) {
      if (focusedNode instanceof Element || focusedNode instanceof HTMLElement) {
        focusedNode.scrollIntoView(false);
      } else {
        focusedNode.parentElement?.scrollIntoView(false);
      }
    }
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
    let startSizeBefore = this.findSizeBeforeElement(startElement!);
    let endSizeBefore = this.findSizeBeforeElement(endElement!);

    return {
      start: startSizeBefore + startSelectionOffset,
      end: endSizeBefore + endSelectionOffset,
    };
  }

  private findSizeBeforeElement(nodeToFind: Node): number {
    let usedCharacters = 0;

    let it = iterateChildren(this.el);
    let current = it.next();
    let isFirstParagraph = true;
    while (!current.done && current.value !== nodeToFind) {
      if (!current.value.hasChildNodes()) {
        if (current.value.textContent) {
          usedCharacters += current.value.textContent.length;
        }
      }
      // One new paragraph = one new line character, except for the first paragraph
      if (current.value.nodeName === "P") {
        if (isFirstParagraph) {
          isFirstParagraph = false;
        } else {
          usedCharacters++;
        }
      }
      current = it.next();
    }
    if (current.value !== nodeToFind) {
      throw new Error("Cannot find the node in the children of the element");
    }
    if (nodeToFind.nodeName === "P" && !isFirstParagraph && nodeToFind.textContent == "") {
      usedCharacters++;
    }
    return usedCharacters;
  }

  private getStartAndEndSelection() {
    const selection = document.getSelection()!;

    return {
      startElement: selection.anchorNode || this.el,
      startSelectionOffset: selection.anchorOffset,
      endElement: selection.focusNode || this.el,
      endSelectionOffset: selection.focusOffset,
    };
  }

  getText(): string {
    let text = "";

    let it = iterateChildren(this.el);
    let current = it.next();
    let isFirstParagraph = true;
    while (!current.done) {
      if (!current.value.hasChildNodes()) {
        text += current.value.textContent;
      }
      if (
        current.value.nodeName === "P" ||
        (current.value.nodeName === "DIV" && current.value !== this.el) // On paste, the HTML may contain <div> instead of <p>
      ) {
        if (isFirstParagraph) {
          isFirstParagraph = false;
        } else {
          text += NEWLINE;
        }
      }
      current = it.next();
    }
    return text;
  }
}
