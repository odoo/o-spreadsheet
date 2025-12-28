import { NEWLINE } from "@odoo/o-spreadsheet-engine/constants";
import { deepEquals } from "../../helpers";
import {
  getBoundingRectAsPOJO,
  getCurrentSelection,
  iterateChildren,
} from "../helpers/dom_helpers";
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
    const selection = window.getSelection()!;
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
      const startNode = this.findChildAtCharacterIndex(start);
      const endNode = this.findChildAtCharacterIndex(end);

      // setEnd (setStart) will result in a collapsed range if the end point is before the start point
      // https://developer.mozilla.org/en-US/docs/Web/API/Range/setEnd
      if (start <= end) {
        range.setStart(startNode.node, startNode.offset);
        range.setEnd(endNode.node, endNode.offset);
      } else {
        range.setStart(endNode.node, endNode.offset);
        range.setEnd(startNode.node, startNode.offset);
      }
    }
  }

  /**
   * finds the dom element that contains the character at `offset`
   */
  private findChildAtCharacterIndex(offset: number): { node: Node; offset: number } {
    const it = iterateChildren(this.el);
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
    if (previous.tagName !== "BR") {
      return { node: previous, offset: usedCharacters };
    } else {
      return { node: this.el, offset: this.el.childNodes.length };
    }
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
  setText(contentInLines: HtmlContent[][]) {
    const contents: HtmlContent[] = [];
    for (let i = 0; i < contentInLines.length; i++) {
      const line = contentInLines[i];
      contents.push(...line, { value: NEWLINE });
    }
    // contents.pop(); // remove last NEWLINE added

    if (contents.length === 0) {
      this.removeAll();
      return;
    }

    const childElements = Array.from(this.el.childNodes);
    const childrenLength = childElements.length;
    const contentLength = contents.length;

    for (let i = 0; i < contentLength; i++) {
      const content = contents[i];
      const child = childElements[i];

      const childIsSpan = child && "tagName" in child && child.tagName === "SPAN";
      if (childIsSpan && compareContentToSpanElement(content, child as HTMLSpanElement)) {
        continue;
      }
      if (
        (child && "tagName" in child && child.tagName === "SPAN" && content.value === NEWLINE) ||
        (content.value === "" && content.classes?.length === 0)
      ) {
        continue;
      }

      let newElement: HTMLElement;
      if (content.value === NEWLINE || (content.value === "" && content.classes?.length === 0)) {
        newElement = document.createElement("span");
        newElement.innerText = content.value;
      } else {
        newElement = document.createElement("span");
        newElement.innerText = content.value;
        newElement.style.color = content.color || "";
        if (content.opacity !== undefined && content.opacity !== 1) {
          newElement.style.opacity = content.opacity.toString();
        }
        newElement.addEventListener("mousemove", () => {
          content.onHover?.(getBoundingRectAsPOJO(newElement));
        });
        newElement.addEventListener("mouseleave", () => {
          content.onStopHover?.();
        });
        newElement.classList.add(...(content.classes || []));
      }
      if (child) {
        this.el.replaceChild(newElement, child);
      } else {
        this.el.appendChild(newElement);
      }
    }

    if (childrenLength > contentLength) {
      for (let i = contentLength; i < childrenLength; i++) {
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
    const selection = window.getSelection()!;
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
    let isFirstParagraph = true;
    let emptyParagraph = false;
    const it = iterateChildren(this.el);
    for (let current = it.next(); !current.done; current = it.next()) {
      if (
        current.value.nodeName === "P" ||
        (current.value.nodeName === "DIV" && current.value !== this.el) // On paste, the HTML may contain <div> instead of <p>
      ) {
        if (isFirstParagraph) {
          isFirstParagraph = false;
        } else {
          text += NEWLINE;
        }
        emptyParagraph = isEmptyParagraph(current.value);
        continue;
      }
      if (!current.value.hasChildNodes()) {
        if (current.value.nodeName === "BR" && !emptyParagraph) {
          text += NEWLINE;
        }
        text += current.value.textContent;
      }
    }
    return text;
    return text.substring(0, text.length - 1);
  }
}

function compareContentToSpanElement(content: HtmlContent, node: HTMLElement): boolean {
  const contentColor = content.color || "";
  const nodeColor = node.style?.color || "";
  const nodeOpacity = node.style?.opacity || "1";

  const sameColor = contentColor === nodeColor;
  const sameClass = deepEquals(content.classes, [...node.classList]);
  const sameContent = node.innerText === content.value;
  const sameOpacity = (content.opacity ?? 1).toString() === nodeOpacity;
  return sameColor && sameClass && sameContent && sameOpacity;
}

const doc = new DOMParser();
const brNode = doc.parseFromString("<br>", "text/html").body.firstChild;
const spanBrNode = doc.parseFromString("<span><br></span>", "text/html").body.firstChild;

function isEmptyParagraph(node: Node) {
  if (node.childNodes.length > 1) return false;
  const node2 = node.firstChild?.cloneNode(true);
  if (!node2) return true;
  if (!(node2 instanceof Element)) return false;
  node2.removeAttribute("class");
  node2.removeAttribute("style");
  return node2.isEqualNode(brNode) || node2.isEqualNode(spanBrNode) || false;
}
