import { DisposableStore } from "../store_engine/store";
import { Pixel } from "../types/misc";

/** Wheel inactivity after which a scroll gesture is over (Chromium's wheel latching window). */
export const SCROLL_SETTLE_DELAY = 500;

export interface WheelScroller {
  canScroll: (deltaX: Pixel, deltaY: Pixel) => boolean;
  scrollBy: (deltaX: Pixel, deltaY: Pixel) => void;
}

/**
 * Elects which of the nested scrollers owns a wheel gesture, like browsers do: the owner is the
 * innermost scroller able to scroll when the gesture starts, and it keeps every event of the
 * gesture, even at its scroll boundary or if another scroller moves under the pointer.
 */
export class ScrollLatchStore extends DisposableStore {
  // not mutators: the latch is bookkeeping that never affects rendering
  storeGetters = ["claim", "release"] as const;

  private owner: WheelScroller | undefined = undefined;
  private lastEvent: WheelEvent | undefined = undefined;

  claim(ev: WheelEvent, candidate: WheelScroller, deltaX: Pixel, deltaY: Pixel) {
    if (ev !== this.lastEvent) {
      if (!this.lastEvent || ev.timeStamp - this.lastEvent.timeStamp > SCROLL_SETTLE_DELAY) {
        this.owner = undefined;
      }
      this.lastEvent = ev;
    }
    if (!this.owner && candidate.canScroll(deltaX, deltaY)) {
      this.owner = candidate;
    }
    return this.owner;
  }

  release(scroller: WheelScroller) {
    if (this.owner === scroller) {
      this.owner = undefined;
    }
  }
}
