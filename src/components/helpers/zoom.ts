import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Pixel, Rect } from "../..";

export type ZoomedMouseEvent<T extends MouseEvent | PointerEvent> = {
  clientX: Pixel;
  clientY: Pixel;
  offsetX: Pixel;
  offsetY: Pixel;
  ev: T;
};

/**
 * Return a POJO containing the original event as well as the client position and the client offset
 * where the event would target if the spreadsheet was not zoomed
 * @param ev unzoomed mouse event
 * @param originalTargetRect The original target bounding rect the resulting ZoomedMouseEvent offset must refer to
 * @returns a ZoomedMouseEvent
 */
export function withZoom<T extends MouseEvent>(
  env: SpreadsheetChildEnv,
  ev: T,
  originalTargetRect?: DOMRect | null
): ZoomedMouseEvent<T> {
  const zoomLevel = env.model.getters.getViewportZoomLevel();
  if (originalTargetRect === undefined) {
    originalTargetRect = getZoomTargetBoundingRect(ev);
  }
  if (!originalTargetRect) return withNoZoom(ev);
  const baseOffsetX = ev.clientX - originalTargetRect.left;
  const baseOffsetY = ev.clientY - originalTargetRect.top;
  const offsetX = baseOffsetX / zoomLevel;
  const offsetY = baseOffsetY / zoomLevel;
  return {
    ev,
    clientX: ev.clientX - baseOffsetX + offsetX,
    clientY: ev.clientY - baseOffsetY + offsetY,
    offsetX,
    offsetY,
  };
}

function withNoZoom<T extends MouseEvent>(ev: T): ZoomedMouseEvent<T> {
  return {
    ev,
    clientX: ev.clientX,
    clientY: ev.clientY,
    offsetX: ev.offsetX,
    offsetY: ev.offsetY,
  };
}

/**
 * Return a Rect with position and size on the zoomed canvas
 */
export function getZoomedRect(zoom: number, rect: Rect): Rect {
  return {
    height: rect.height * zoom,
    width: rect.width * zoom,
    x: rect.x * zoom,
    y: rect.y * zoom,
  };
}

/**
 * Returns the bounding rect of the closest or self element who is targetable by a ZoomedMouseEvent
 */
function getZoomTargetBoundingRect(ev: MouseEvent): DOMRect | null {
  const target = ev.target;
  if (!target || !("classList" in target) || !(target instanceof Element)) {
    return null;
  }
  const targetEl = target.classList.contains("o-zoomable") ? target : target.closest(".o-zoomable");
  if (!targetEl) return null;
  return targetEl.getBoundingClientRect();
}
