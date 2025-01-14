import { deepEquals, toHex } from "../../helpers";
import { getCurrentSelection, iterateChildren } from "../helpers/dom_helpers";
import { NEWLINE } from "./../../constants";
import { HtmlContent } from "./composer/composer";

export class ContentEditableHelper {
  // todo make el private and expose dedicated methods
  el: HTMLElement;
  constructor(el: HTMLElement) {
    this.el = el;
  }

  updateEl(el: HTMLElement) {
    this.el = el;
  }

  /**
   * select the text at position start to end, no matter the children
   */
  selectRange(start: number, end: number) {
    let selection = window.getSelection()!;
    const { start: currentStart, end: currentEnd } = this.getCurrentSelection();

    if (currentStart === start && currentEnd === end) {
      return;
    }
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      selection.addRange(range);
    }
    const currentRange = selection.getRangeAt(0);
    let range: Range;
    if (this.el.contains(currentRange.startContainer)) {
      range = currentRange;
    } else {
      range = document.createRange();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (start === end && start === 0) {
      range.setStart(this.el, 0);
      range.setEnd(this.el, 0);
    } else {
      const textLength = this.getText().length;
      if (start < 0 || end > textLength) {
        console.warn(
          `wrong selection asked start ${start}, end ${end}, text content length ${textLength}`
        );
        if (start < 0) start = 0;
        if (end > textLength) end = textLength;
        if (start > textLength) start = textLength;
      }
      let startNode = this.findChildAtCharacterIndex(start);
      let endNode = this.findChildAtCharacterIndex(end);
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
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
   * Sets (or Replaces all) the text inside the root element in the form of distinctive paragraphs and
   * span for each element provided in `contents`.
   *
   * The function will apply the diff between the current content and the new content to avoid the systematic
   * destruction of DOM elements which interferes with IME[1]
   *
   * Each line of text will be encapsulated in a paragraph element.
   * Each span will have its own fontcolor and specific class if provided in the HtmlContent object.
   *
   * [1] https://developer.mozilla.org/en-US/docs/Glossary/Input_method_editor
   */
  setText(contents: HtmlContent[][]) {
    if (contents.length === 0) {
      this.removeAll();
      return;
    }

    const childElements = Array.from(this.el.childNodes);
    const contentLength = contents.length;

    for (let i = 0; i < contentLength; i++) {
      const line = contents[i];
      const childElement = childElements[i];

      let newChild = false;
      let p: HTMLParagraphElement;
      if (childElement && childElement.nodeName === "P") {
        p = childElement as HTMLParagraphElement;
      } else {
        newChild = true;
        p = document.createElement("p");
      }

      const lineLength = line.length;
      const existingChildren = Array.from(p.childNodes);

      for (let j = 0; j < lineLength; j++) {
        const content = line[j];
        const child = existingChildren[j];
        // child nodes can be multiple types of nodes: Span, Text, Div, etc...
        // We can only modify a node in place if it has the same type as the content
        // that we would insert, which are spans.
        // Otherwise, it means that the node has been input by the user, through the keyboard or a copy/paste
        // @ts-ignore (somehow required because jest does not like child.tagName despite the prior check)
        const childIsSpan = child && "tagName" in child && child.tagName === "SPAN";
        if (childIsSpan && compareContentToSpanElement(content, child as HTMLSpanElement)) {
          continue;
        }
        // this is an empty line in the content
        if (!content.value && !content.class) {
          if (child) p.removeChild(child);
          continue;
        }
        const span = document.createElement("span");
        span.innerText = content.value;
        span.style.color = content.color || "";
        if (content.class) {
          span.classList.add(content.class);
        }
        if (child) {
          p.replaceChild(span, child);
        } else {
          p.appendChild(span);
        }
      }

      if (existingChildren.length > lineLength) {
        for (let i = lineLength; i < existingChildren.length; i++) {
          p.removeChild(existingChildren[i]);
        }
      }

      // Empty line
      if (!p.hasChildNodes()) {
        const span = document.createElement("span");
        span.appendChild(document.createElement("br"));
        p.appendChild(span);
      }

      // replace p if necessary
      if (newChild) {
        if (childElement) {
          this.el.replaceChild(p, childElement);
        } else {
          this.el.appendChild(p);
        }
      }
    }
    if (childElements.length > contentLength) {
      for (let i = contentLength; i < childElements.length; i++) {
        this.el.removeChild(childElements[i]);
      }
    }
  }

  scrollSelectionIntoView() {
    const focusedNode = document.getSelection()?.focusNode;
    if (!focusedNode || !this.el.contains(focusedNode)) return;
    const element = focusedNode instanceof HTMLElement ? focusedNode : focusedNode.parentElement;
    element?.scrollIntoView?.({ block: "nearest" });
  }

  /**
   * remove the current selection of the user
   * */
  removeSelection() {
    let selection = window.getSelection()!;
    selection.removeAllRanges();
  }

  private removeAll() {
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
    return getCurrentSelection(this.el);
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

function compareContentToSpanElement(content: HtmlContent, node: HTMLElement): boolean {
  const contentColor = content.color ? toHex(content.color) : "";
  const nodeColor = node.style?.color ? toHex(node.style.color) : "";

  const sameColor = contentColor === nodeColor;
  const sameClass = deepEquals([content.class], [...node.classList]);
  const sameContent = node.innerText === content.value;
  return sameColor && sameClass && sameContent;
}
