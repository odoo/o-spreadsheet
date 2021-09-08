import { hooks } from "@odoo/owl";
import { DOMCoordinates } from "../../types";
const { useComponent, useState, onPatched, useRef, onMounted } = hooks;

// type Ref is not exported by owl :(
type Ref = ReturnType<typeof useRef>;

function spreadsheetPosition() {
  const spreadsheetElement = document.querySelector(".o-spreadsheet");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement?.getBoundingClientRect();
    return { top, left };
  }
  return { top: 0, left: 0 };
}

export function gridCanvasPosition() {
  const gridCanvasElement = document.querySelector(".o-grid-canvas");
  if (gridCanvasElement) {
    const { top, left } = gridCanvasElement?.getBoundingClientRect();
    return { top, left };
  }
  return { top: 0, left: 0 };
}

/**
 * Return the component (or ref's component) top left position (in pixels) relative
 * to the upper left corner of the spreadsheet.
 *
 * Note: when used with a <Portal/> component, it will
 * return the portal position, not the teleported position.
 */
export function useAbsolutePosition(ref?: Ref): DOMCoordinates {
  const position = useState({ x: 0, y: 0 });
  const component = useComponent();
  const { top: spreadsheetTop, left: spreadsheetLeft } = spreadsheetPosition();
  function updateElPosition() {
    const el = ref?.el || component.el;
    const { top, left } = el!.getBoundingClientRect();
    const x = left - spreadsheetLeft;
    const y = top - spreadsheetTop;
    if (x !== position.x || y !== position.y) {
      position.x = x;
      position.y = y;
    }
  }
  onMounted(updateElPosition);
  onPatched(updateElPosition);
  return position;
}
