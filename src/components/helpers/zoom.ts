import { MAX_ZOOM, MIN_ZOOM } from "../../constants";
import { Pixel } from "../../types/misc";
import { DOMDimension, Rect } from "../../types/rendering";
import { getElBoundingRect } from "./dom_helpers";

/**
 * Marker class on whichever element actually carries the live CSS `zoom` style (the grid
 * container, the dashboard container, ...). Its own getBoundingClientRect() origin is the one
 * stable, zoom-invariant screen point in each of those subtrees: unlike its descendants (headers,
 * group layers, centered content, ...), its on-screen position never depends on the zoom value
 * that happens to be currently painted, only on the layout around it. Elements further down the
 * tree can shift position as zoom changes (or lag behind the JS zoom level while Owl's
 * requestAnimationFrame-batched render hasn't caught up yet), which is what caused the zoom focal
 * point to drift away from the cursor during a fast wheel burst.
 */
// export const ZOOM_ROOT_SELECTOR = ".o-zoom-root";

export type ZoomedMouseEvent<T extends MouseEvent | PointerEvent> = {
  clientX: Pixel;
  clientY: Pixel;
  offsetX: Pixel;
  offsetY: Pixel;
  ev: T;
};

export const ZOOM_WHEEL_STEP = 0.1;

/**
 * Compute the next zoom level for a single ctrl+wheel "tick", clamped to [MIN_ZOOM, MAX_ZOOM].
 * Only the sign of deltaY is used (scroll up = zoom in): its magnitude is unreliable across
 * devices/browsers (trackpad line mode vs mouse notch vs OS-level acceleration).
 */
export function nextWheelZoomLevel(currentZoom: number, deltaY: number): number {
  const factor = deltaY < 0 ? 1 + ZOOM_WHEEL_STEP : 1 - ZOOM_WHEEL_STEP;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * factor));
}

/**
 * Return the bounding rect to use as the zoom-invariant screen origin when computing a wheel-zoom
 * anchor point: the closest ancestor (or self) carrying `ZOOM_ROOT_SELECTOR`, falling back to `el`
 * itself if none is found. See `ZOOM_ROOT_SELECTOR` for why this matters.
 */
export function getZoomAnchorRect(el: HTMLElement | null): Rect {
  return getElBoundingRect(el);
}

/**
 * Compute the scroll offset to apply so the sheet point currently under `cursor` (screen pixels,
 * relative to a point on screen that is invariant across a zoom change, e.g. the zoomable
 * element's own getBoundingClientRect() origin) stays visually fixed under the cursor after the
 * zoom level changes from oldZoom to newZoom.
 */
export function zoomedScrollOffset(
  scroll: { scrollX: Pixel; scrollY: Pixel },
  cursor: { x: Pixel; y: Pixel },
  oldZoom: number,
  newZoom: number
): { offsetX: Pixel; offsetY: Pixel } {
  const factor = 1 / oldZoom - 1 / newZoom;
  return {
    offsetX: scroll.scrollX + cursor.x * factor,
    offsetY: scroll.scrollY + cursor.y * factor,
  };
}

/**
 * Rescale a "logical" (unzoomed) sheet-view dimension to account for a zoom level change,
 * assuming the physical screen space available for the grid stays the same. The DOM's actual
 * physical size only reflects a zoom change once the browser has reflowed for the new CSS `zoom`
 * value, which happens asynchronously (after the next render); recomputing the logical dimension
 * analytically lets the viewport/canvas/scrollbars react to the new zoom immediately, instead of
 * drawing one stale frame while waiting for a ResizeObserver to catch up.
 */
export function rescaleDimensionsForZoom(
  dimensions: DOMDimension,
  oldZoom: number,
  newZoom: number
): DOMDimension {
  const scale = oldZoom / newZoom;
  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
  };
}
