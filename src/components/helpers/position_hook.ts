import { onMounted, onPatched, useRef, useState } from "@odoo/owl";
import { DOMCoordinates } from "../../types";

// type Ref is not exported by owl :(
type Ref = ReturnType<typeof useRef>;

/**
 * Return the o-spreadsheet element position relative
 * to the browser viewport.
 */
function useSpreadsheetPosition(): DOMCoordinates {
  const position = useState({ x: 0, y: 0 });
  let spreadsheetElement = document.querySelector(".o-spreadsheet");
  function updatePosition() {
    if (!spreadsheetElement) {
      spreadsheetElement = document.querySelector(".o-spreadsheet");
    }
    if (spreadsheetElement) {
      const { top, left } = spreadsheetElement.getBoundingClientRect();
      position.x = left;
      position.y = top;
    }
  }
  onMounted(updatePosition);
  onPatched(updatePosition);
  return position;
}

/**
 * Return the component (or ref's component) top left position (in pixels) relative
 * to the upper left corner of the spreadsheet.
 *
 * Note: when used with a <Portal/> component, it will
 * return the portal position, not the teleported position.
 */
export function useAbsolutePosition(ref: Ref): DOMCoordinates {
  const position = useState({ x: 0, y: 0 });
  const spreadsheet = useSpreadsheetPosition();
  function updateElPosition() {
    const el = ref.el;
    const { top, left } = el!.getBoundingClientRect();
    const x = left - spreadsheet.x;
    const y = top - spreadsheet.y;
    if (x !== position.x || y !== position.y) {
      position.x = x;
      position.y = y;
    }
  }
  onMounted(updateElPosition);
  onPatched(updateElPosition);
  return position;
}
