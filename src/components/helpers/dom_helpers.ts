import { Rect } from "./../../types/rendering";
/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement, ev: Event): boolean {
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
