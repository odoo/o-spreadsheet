import { Pixel, Rect, SpreadsheetChildEnv } from "../..";

export type OMouseEvent<T extends MouseEvent | PointerEvent> = {
  clientX: Pixel;
  clientY: Pixel;
  offsetX: Pixel;
  offsetY: Pixel;
  ev: T;
};

export function applyZoomLevel<T extends MouseEvent>(
  env: SpreadsheetChildEnv,
  ev: T,
  originalTargetRect?: DOMRect | null
): OMouseEvent<T> {
  const zoomLevel = env.model.getters.getViewportZoomLevel();
  if (originalTargetRect === undefined) originalTargetRect = getZoomTargetBoundingRect(ev);
  if (!originalTargetRect) return applyNoZoom(ev);
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

function applyNoZoom<T extends MouseEvent>(ev: T): OMouseEvent<T> {
  return {
    ev,
    clientX: ev.clientX,
    clientY: ev.clientY,
    offsetX: ev.offsetX,
    offsetY: ev.offsetY,
  };
}

export function applyZoomRect(zoom: number, rect: Rect): Rect {
  return {
    height: rect.height * zoom,
    width: rect.width * zoom,
    x: rect.x * zoom,
    y: rect.y * zoom,
  };
}

export function getZoomTargetBoundingRect(ev: MouseEvent): DOMRect | null {
  const target = ev.target;
  let targetElement: HTMLElement | undefined = undefined;
  if (target && "classList" in target) {
    //@ts-ignore
    targetElement = target.classList.contains("o-zoomable")
      ? target
      : //@ts-ignore
        target.closest(".o-zoomable");
  }
  if (!targetElement) return null;
  return targetElement.getBoundingClientRect();
}
