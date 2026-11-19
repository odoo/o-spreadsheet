import { onWillUnmount, usePlugin } from "@odoo/owl";
import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { WheelGesturePlugin, WheelScroller } from "../../owl_plugins/wheel_gesture_plugin";
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

export function useNestedWheelHandler(scroller: WheelScroller) {
  const wheelGesturePlugin = usePlugin(WheelGesturePlugin);
  onWillUnmount(() => wheelGesturePlugin.release(scroller));
  return useWheelHandler((deltaX, deltaY, ev) => {
    if (wheelGesturePlugin.claimGesture(ev, scroller, deltaX, deltaY) === scroller) {
      ev.stopPropagation();
      ev.preventDefault();
      scroller.scrollBy(deltaX, deltaY);
    }
  });
}

export function useRootWheelHandler(scrollBy: WheelScroller["scrollBy"]) {
  const wheelGesturePlugin = usePlugin(WheelGesturePlugin);
  const scroller: WheelScroller = { canScroll: () => true, scrollBy };
  onWillUnmount(() => wheelGesturePlugin.release(scroller));
  return useWheelHandler((deltaX, deltaY, ev) => {
    (wheelGesturePlugin.claimGesture(ev, scroller, deltaX, deltaY) ?? scroller).scrollBy(
      deltaX,
      deltaY
    );
  });
}
