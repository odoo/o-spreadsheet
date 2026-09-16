import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { isMacOS } from "./dom_helpers";

export function useWheelHandler(handler: (deltaX: number, deltaY: number, ev: WheelEvent) => void) {
  function normalize(val: number, deltaMode: number): number {
    return val * (deltaMode === 0 ? 1 : DEFAULT_CELL_HEIGHT);
  }
  const onMouseWheel = (ev: WheelEvent) => {
    const deltaX = normalize(ev.shiftKey && !isMacOS() ? ev.deltaY : ev.deltaX, ev.deltaMode);
    const deltaY = normalize(ev.shiftKey && !isMacOS() ? ev.deltaX : ev.deltaY, ev.deltaMode);
    handler(deltaX, deltaY, ev);
  };
  return onMouseWheel;
}

/**
 * Coalesce ctrl+wheel zoom ticks into a single update per animation frame. A fast wheel burst can
 * fire many native `wheel` events before the browser repaints; applying each one synchronously
 * (own measurement + resize + scroll) races the async reflow of the CSS `zoom` change, which is
 * what causes a wrong sheet-view size to stick once the burst ends. Batching to one `applyZoom`
 * call per frame guarantees at most one zoom-driven resize per repaint, in sync with it.
 */
export function useWheelZoomBatcher(applyZoom: (ticks: number, ev: WheelEvent) => void) {
  let pendingTicks = 0;
  let latestEvent: WheelEvent | undefined;
  let frameScheduled = false;

  function flush() {
    frameScheduled = false;
    const ticks = pendingTicks;
    const ev = latestEvent;
    pendingTicks = 0;
    latestEvent = undefined;
    if (ticks && ev) {
      applyZoom(ticks, ev);
    }
  }

  return (ev: WheelEvent) => {
    pendingTicks += ev.deltaY < 0 ? 1 : -1;
    latestEvent = ev;
    if (!frameScheduled) {
      frameScheduled = true;
      requestAnimationFrame(flush);
    }
  };
}
