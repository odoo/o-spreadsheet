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
 * Compute the next zoom level for `ticks` ctrl+wheel "ticks" coalesced into a single update
 * (positive = zoom in, negative = zoom out; e.g. a fast wheel burst spanning several native `wheel`
 * events before the next animation frame nets out to |ticks| > 1), clamped to [MIN_ZOOM, MAX_ZOOM].
 * Only the sign of each individual tick is used, never a wheel event's deltaY magnitude: that
 * magnitude is unreliable across devices/browsers (trackpad line mode vs mouse notch vs OS-level
 * acceleration).
 */
export function nextWheelZoomLevel(currentZoom: number, ticks: number): number {
  const factor = ticks > 0 ? 1 + ZOOM_WHEEL_STEP : 1 - ZOOM_WHEEL_STEP;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * factor ** Math.abs(ticks)));
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
 *
 * `xCenteringMargin` accounts for content that is horizontally auto-centered inside the zoom-root
 * (e.g. the dashboard, whose content is centered whenever it's narrower than the available width,
 * i.e. when there's no horizontal scrollbar): the cursor's x position relative to the zoom-root
 * origin isn't the cursor's x position relative to the content, since a centering margin sits in
 * between -- and that margin itself shrinks/grows with the zoom level (see
 * `centeredContentMargin`), so both its old and new value are needed. Defaults to no margin, e.g.
 * for content that always starts flush against the zoom-root origin (the main Grid).
 */
export function zoomedScrollOffset(
  scroll: { scrollX: Pixel; scrollY: Pixel },
  cursor: { x: Pixel; y: Pixel },
  oldZoom: number,
  newZoom: number,
  xCenteringMargin: { old: Pixel; new: Pixel } = { old: 0, new: 0 }
): { offsetX: Pixel; offsetY: Pixel } {
  const factor = 1 / oldZoom - 1 / newZoom;
  return {
    offsetX:
      scroll.scrollX +
      cursor.x * factor -
      xCenteringMargin.old / oldZoom +
      xCenteringMargin.new / newZoom,
    offsetY: scroll.scrollY + cursor.y * factor,
  };
}

/**
 * The horizontal margin (screen px) added by auto-centering (`margin: 0 auto`) content of logical
 * (unzoomed) width `contentWidth` inside a zoom-invariant container of screen width
 * `availableWidth`, at a given zoom level. 0 once the content is wide enough, at that zoom level,
 * to fill or overflow the container (e.g. once a horizontal scrollbar appears).
 */
export function centeredContentMargin(
  availableWidth: Pixel,
  contentWidth: Pixel,
  zoom: number
): Pixel {
  return Math.max(0, (availableWidth - contentWidth * zoom) / 2);
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
