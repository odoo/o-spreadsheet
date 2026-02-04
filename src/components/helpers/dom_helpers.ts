import { Ref } from "@odoo/o-spreadsheet-engine/types/misc";
import { DOMCoordinates, Rect } from "@odoo/o-spreadsheet-engine/types/rendering";
import { whenReady } from "@odoo/owl";

const macRegex = /Mac/i;

let zoomCssDoesNotAffectBoundingRect = false;

function defineZoomCssImpactOnBoundingRect() {
  const div = document.createElement("div");
  div.setAttribute("style", `width:10px;height:1px;zoom:2;position:absolute;z-index:-10000`);
  document.body.appendChild(div);
  zoomCssDoesNotAffectBoundingRect = div.getBoundingClientRect().width !== 20;
  document.body.removeChild(div);
}

whenReady(defineZoomCssImpactOnBoundingRect);

const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta"];

/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement | null | undefined, ev: Event): boolean {
  if (!parent) return false;
  return !!ev.target && parent!.contains(ev.target as Node);
}

export function gridOverlayPosition(zoom = 1): DOMCoordinates {
  const spreadsheetElement = document.querySelector(".o-grid-overlay");
  const result = spreadsheetElement && zoomCorrectedElementRect(spreadsheetElement, zoom);
  if (!result) {
    throw new Error("Can't find spreadsheet position");
  }
  return result;
}

export function zoomCorrectedElementRect(el: Element, zoomLevel: number): Rect {
  const zoomedElement = el.closest(".o-zoomable");

  let targetEl: Element;
  let zoom: number = 1;
  if (zoomedElement) {
    targetEl = zoomedElement;
    // FIXME
    // Some navigators, like Safari, mess up the computation of getBoundingClientRect on elements subjected to a zoom CSS property.
    // See https://bugs.webkit.org/show_bug.cgi?id=77998
    // The issue is supposedly fixed in webkit https://github.com/WebKit/WebKit/pull/52333
    // we should monitor this and remove the workaround when Safari is fixed
    zoom = zoomCssDoesNotAffectBoundingRect ? zoomLevel : 1;
  } else {
    targetEl = el;
  }
  const rect = targetEl.getBoundingClientRect();
  return {
    x: rect.x * zoom,
    y: rect.y * zoom,
    width: rect.width * zoom,
    height: rect.height * zoom,
  };
}

export function getRefBoundingRect(ref: Ref<HTMLElement>): Rect {
  if (!ref.el) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return getBoundingRectAsPOJO(ref.el);
}

export function getBoundingRectAsPOJO(el: Element): Rect {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Iterate over all the children of `el` in the dom tree starting at `el`, depth first.
 */
export function* iterateChildren(el: Node): Generator<Node> {
  yield el;
  if (el.hasChildNodes()) {
    for (const child of el.childNodes) {
      yield* iterateChildren(child);
    }
  }
}

export function getOpenedMenus(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".o-spreadsheet .o-menu"));
}

export function getCurrentSelection(el: HTMLElement) {
  const { startElement, endElement, startSelectionOffset, endSelectionOffset } =
    getStartAndEndSelection(el);
  const startSizeBefore = findSelectionIndex(el, startElement!, startSelectionOffset);
  const endSizeBefore = findSelectionIndex(el, endElement!, endSelectionOffset);

  return {
    start: startSizeBefore,
    end: endSizeBefore,
  };
}

function getStartAndEndSelection(el: HTMLElement) {
  const selection = document.getSelection()!;

  return {
    startElement: selection.anchorNode || el,
    startSelectionOffset: selection.anchorOffset,
    endElement: selection.focusNode || el,
    endSelectionOffset: selection.focusOffset,
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
 * all the nodes prior to the selected node as well as the content of the child node before the offset.
 *
 * See the MDN documentation for more details.
 * https://developer.mozilla.org/en-US/docs/Web/API/Range/startOffset
 * https://developer.mozilla.org/en-US/docs/Web/API/Range/endOffset
 *
 */
function findSelectionIndex(el: HTMLElement, nodeToFind: Node, nodeOffset: number): number {
  let usedCharacters = 0;

  const it = iterateChildren(el);
  let current = it.next();
  let isFirstParagraph = true;
  while (!current.done && current.value !== nodeToFind) {
    if (!current.value.hasChildNodes()) {
      if (current.value.textContent) {
        usedCharacters += current.value.textContent.length;
      }
    }
    // One new paragraph = one new line character, except for the first paragraph
    if (
      current.value.nodeName === "P" ||
      (current.value.nodeName === "DIV" && current.value !== el) // On paste, the HTML may contain <div> instead of <p>
    ) {
      if (isFirstParagraph) {
        isFirstParagraph = false;
      } else {
        usedCharacters++;
      }
    }
    current = it.next();
  }
  if (current.value !== nodeToFind) {
    /** This situation can happen if the code is called while the selection is not currently on the element.
     * In this case, we return 0 because we don't know the size of the text before the selection.
     *
     * A known occurrence is triggered since the introduction of commit d4663158 (PR #2038).
     */
    return 0;
  } else {
    if (!current.value.hasChildNodes()) {
      usedCharacters += nodeOffset;
    } else {
      const children = [...current.value.childNodes].slice(0, nodeOffset);
      usedCharacters += children.reduce((acc: number, child: Node, index: number) => {
        if (child.textContent !== null) {
          // need to account for paragraph nodes that implicitly add a new line
          // except for the last paragraph
          let chars = child.textContent.length;
          if (child.nodeName === "P" && index !== children.length - 1) {
            chars++;
          }
          return acc + chars;
        } else {
          return acc;
        }
      }, 0);
    }
  }
  if (nodeToFind.nodeName === "P" && !isFirstParagraph && nodeToFind.textContent === "") {
    usedCharacters++;
  }
  return usedCharacters;
}

const letterRegex = /^[a-zA-Z]$/;

/**
 * Transform a keyboard event into a shortcut string that represent this event. The letters keys will be uppercased.
 *
 * @argument ev - The keyboard event to transform
 * @argument mode - Use either ev.key of ev.code to get the string shortcut
 *
 * @example
 * event : { ctrlKey: true, key: "a" } => "Ctrl+A"
 * event : { shift: true, alt: true, key: "Home" } => "Alt+Shift+Home"
 */
export function keyboardEventToShortcutString(
  ev: KeyboardEvent,
  mode: "key" | "code" = "key"
): string {
  let keyDownString = "";
  if (!MODIFIER_KEYS.includes(ev.key)) {
    if (isCtrlKey(ev)) keyDownString += "Ctrl+";
    if (ev.altKey) keyDownString += "Alt+";
    if (ev.shiftKey) keyDownString += "Shift+";
  }
  const key = mode === "key" ? ev.key : ev.code;
  keyDownString += letterRegex.test(key) ? key.toUpperCase() : key;
  return keyDownString;
}

export function isMacOS(): boolean {
  return Boolean(macRegex.test(navigator.userAgent));
}

/**
 * @param {KeyboardEvent | MouseEvent} ev
 * @returns Returns true if the event was triggered with the "ctrl" modifier pressed.
 * On Mac, this is the "meta" or "command" key.
 */
export function isCtrlKey(ev: KeyboardEvent | MouseEvent): boolean {
  return isMacOS() || isIOS() ? ev.metaKey : ev.ctrlKey;
}

/**
 * @param {MouseEvent} ev - The mouse event.
 * @returns {boolean} Returns true if the event was triggered by a middle-click
 * or a Ctrl + Click (Cmd + Click on Mac).
 */
export function isMiddleClickOrCtrlClick(ev: MouseEvent): boolean {
  return ev.button === 1 || (isCtrlKey(ev) && ev.button === 0);
}

export function downloadFile(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Detects the current browser brand and subsequent rendering engine
 */
export function isBrowserFirefox() {
  return /Firefox/i.test(navigator.userAgent);
}

// Mobile detection
function maxTouchPoints() {
  return navigator.maxTouchPoints || 1;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isIOS() {
  return (
    /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && maxTouchPoints() > 1)
  );
}

function isOtherMobileOS() {
  return /(webOS|BlackBerry|Windows Phone)/i.test(navigator.userAgent);
}

export function isMobileOS() {
  return isAndroid() || isIOS() || isOtherMobileOS();
}
