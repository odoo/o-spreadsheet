import { Rect } from "./../../types/rendering";

const macRegex = /Mac/i;

const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta"];

/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement | null | undefined, ev: Event): boolean {
  if (!parent) return false;
  return !!ev.target && parent!.contains(ev.target as Node);
}

export function gridOverlayPosition() {
  const spreadsheetElement = document.querySelector(".o-grid-overlay");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement?.getBoundingClientRect();
    return { top, left };
  }
  throw new Error("Can't find spreadsheet position");
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
    for (let child of el.childNodes) {
      yield* iterateChildren(child);
    }
  }
}

export function getOpenedMenus(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".o-spreadsheet .o-menu"));
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
  return isMacOS() ? ev.metaKey : ev.ctrlKey;
}
