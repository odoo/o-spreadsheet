import { onMounted, onPatched, useComponent, useRef, useState } from "@odoo/owl";
import { Rect } from "../../types";

// type Ref is not exported by owl :(
type Ref = ReturnType<typeof useRef>;

/**
 * Return the o-spreadsheet element position relative
 * to the browser viewport.
 */
export function useSpreadsheetRect(): Rect {
  const position = useState({ x: 0, y: 0, width: 0, height: 0 });
  let spreadsheetElement: Element | null = null;
  function updatePosition() {
    if (!spreadsheetElement) {
      spreadsheetElement = document.querySelector(".o-spreadsheet");
    }
    if (spreadsheetElement) {
      const { top, left, width, height } = spreadsheetElement.getBoundingClientRect();
      position.x = left;
      position.y = top;
      position.width = width;
      position.height = height;
    }
  }
  onMounted(updatePosition);
  onPatched(updatePosition);
  return position;
}

/**
 * Return the component (or ref's component) BoundingRect, relative
 * to the upper left corner of the screen (<body> element).
 *
 * Note: when used with a <Portal/> component, it will
 * return the portal position, not the teleported position.
 */
export function useAbsoluteBoundingRect(ref: Ref): Rect {
  const rect = useState({ x: 0, y: 0, width: 0, height: 0 });
  function updateElRect() {
    const el = ref.el;
    if (el === null) {
      return;
    }
    const { top, left, width, height } = el.getBoundingClientRect();
    rect.x = left;
    rect.y = top;
    rect.width = width;
    rect.height = height;
  }
  onMounted(updateElRect);
  onPatched(updateElRect);
  return rect;
}

/**
 * Get the rectangle inside which a popover should stay when being displayed.
 * It's the value defined in `env.getPopoverContainerRect`, or the Rect of the "o-spreadsheet"
 * element by default.
 *
 * Coordinates are expressed expressed as absolute DOM position.
 */
export function usePopoverContainer(): Rect {
  const container = useState({ x: 0, y: 0, width: 0, height: 0 });
  const component = useComponent();
  const spreadsheetRect = useSpreadsheetRect();
  function updateRect() {
    const env = component.env;
    const newRect =
      "getPopoverContainerRect" in env ? env.getPopoverContainerRect() : spreadsheetRect;
    container.x = newRect.x;
    container.y = newRect.y;
    container.width = newRect.width;
    container.height = newRect.height;
  }
  updateRect();
  onMounted(updateRect);
  onPatched(updateRect);
  return container;
}
