import { onMounted, onPatched, useRef, useState } from "@odoo/owl";
import { DOMCoordinates, Rect } from "../../types";

// type Ref is not exported by owl :(
type Ref = ReturnType<typeof useRef>;

/**
 * Return the o-spreadsheet element position relative
 * to the browser viewport.
 */
export function useSpreadsheetRect(): Rect {
  const position = useState({ x: 0, y: 0, width: 0, height: 0 });
  let spreadsheetElement = document.querySelector(".o-spreadsheet");
  updatePosition();
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
 * Return the component (or ref's component) top left position (in pixels) relative
 * to the upper left corner of the screen (<body> element).
 *
 * Note: when used with a <Portal/> component, it will
 * return the portal position, not the teleported position.
 */
export function useAbsolutePosition(ref: Ref): DOMCoordinates {
  const position = useState({ x: 0, y: 0 });
  function updateElPosition() {
    const el = ref.el;
    if (el === null) {
      return;
    }
    const { top, left } = el.getBoundingClientRect();
    if (left !== position.x || top !== position.y) {
      position.x = left;
      position.y = top;
    }
  }
  onMounted(updateElPosition);
  onPatched(updateElPosition);
  return position;
}
