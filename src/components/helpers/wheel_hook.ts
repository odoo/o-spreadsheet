import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { useStore } from "../../store_engine/store_hooks";
import { ScrollGestureOwner, ScrollGestureStore } from "../../stores/scroll_gesture_store";
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
 * Wheel handler for the outermost scrollable element of the spreadsheet (the grid or the
 * dashboard). It is the fallback owner of a scroll gesture: it claims any gesture that no nested
 * scrollable element (eg. a carousel data view) wanted, which is what lets the spreadsheet keep
 * scrolling smoothly through a gesture even as a nested viewport scrolls under the pointer.
 *
 * If a nested viewport already owns the current gesture (the pointer moved away from it while it
 * was still scrolling), the wheel is forwarded to it instead, exactly like a browser keeps
 * scrolling a latched scrollable element regardless of where the pointer goes.
 */
export function useRootWheelHandler(handler: (deltaX: number, deltaY: number) => void) {
  const gesture = useStore(ScrollGestureStore);
  const owner: ScrollGestureOwner = { scroll: handler };

  return useWheelHandler((deltaX, deltaY) => {
    if (gesture.hasOwner() && !gesture.isOwnedBy(owner)) {
      gesture.scrollOwner(deltaX, deltaY);
      return;
    }
    if (gesture.hasOwner()) {
      gesture.keepAlive();
    } else {
      gesture.claim(owner);
    }
    handler(deltaX, deltaY);
  });
}

/**
 * Wheel handler for a scrollable element nested inside another scrollable element (eg. a carousel
 * data view inside the spreadsheet), mimicking the browser's scroll chaining (also known as scroll
 * latching):
 *  - the nested element consumes the wheel event as long as `canScroll` allows it,
 *  - once it reaches its boundary, the rest of the current gesture is swallowed instead of being
 *    chained to the parent,
 *  - the parent only takes over on a new gesture, ie. after a pause of SCROLL_GESTURE_TIMEOUT ms
 *    without any scroll activity.
 *
 * The owner of a gesture is decided when the gesture starts and does not change until it ends,
 * even if the user reverses the scrolling direction or moves the pointer away.
 */
export function useNestedWheelHandler(
  canScroll: (deltaX: number, deltaY: number) => boolean,
  handler: (deltaX: number, deltaY: number) => void
) {
  const gesture = useStore(ScrollGestureStore);
  const owner: ScrollGestureOwner = { scroll: handler };

  return useWheelHandler((deltaX, deltaY, ev) => {
    if (gesture.hasOwner()) {
      if (!gesture.isOwnedBy(owner)) {
        // an ancestor scrollable element owns the current gesture: let the event bubble to it
        return;
      }
      ev.stopPropagation();
      ev.preventDefault();
      gesture.keepAlive();
      handler(deltaX, deltaY);
      return;
    }
    if (!canScroll(deltaX, deltaY)) {
      // let the event bubble up to the parent scrollable element, which will claim the gesture
      return;
    }
    gesture.claim(owner);
    ev.stopPropagation();
    ev.preventDefault();
    handler(deltaX, deltaY);
  });
}
