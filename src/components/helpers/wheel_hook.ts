import { onWillUnmount } from "@odoo/owl";
import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { useStore } from "../../store_engine/store_hooks";
import { ScrollLatchStore, WheelScroller } from "../../stores/scroll_latch_store";
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

function useScrollLatch(scroller: WheelScroller) {
  const latch = useStore(ScrollLatchStore);
  onWillUnmount(() => latch.release(scroller));
  return latch;
}

/**
 * Wheel handler of a scrollable container nested in another one. It only handles the
 * gestures it owns and lets the others bubble up to the parent container.
 */
export function useNestedWheelHandler(scroller: WheelScroller) {
  const latch = useScrollLatch(scroller);
  return useWheelHandler((deltaX, deltaY, ev) => {
    if (latch.claim(ev, scroller, deltaX, deltaY) !== scroller) {
      return;
    }
    ev.stopPropagation();
    ev.preventDefault();
    scroller.scrollBy(deltaX, deltaY);
  });
}

/**
 * Wheel handler of the outermost scrollable container. It owns the gestures no nested
 * container claimed, and forwards the gestures of a nested owner the pointer drifted away from.
 */
export function useRootWheelHandler(scrollBy: WheelScroller["scrollBy"]) {
  const scroller: WheelScroller = { canScroll: () => true, scrollBy };
  const latch = useScrollLatch(scroller);
  return useWheelHandler((deltaX, deltaY, ev) => {
    latch.claim(ev, scroller, deltaX, deltaY)!.scrollBy(deltaX, deltaY);
  });
}
