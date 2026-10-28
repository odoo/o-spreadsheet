import { DisposableStore } from "../store_engine/store";
import { Pixel } from "../types/misc";
import { Get } from "../types/store_engine";

/** Wheel inactivity after which a scroll gesture is over (Chromium's wheel latching window). */
export const SCROLL_SETTLE_DELAY = 500;
/** Pointer distance from the gesture start after which a scroll gesture is over (Chromium's latching slop region). */
const WHEEL_LATCHING_SLOP = 10;

export interface WheelScroller {
  canScroll: (deltaX: Pixel, deltaY: Pixel) => boolean;
  scrollBy: (deltaX: Pixel, deltaY: Pixel) => void;
}

/**
 * Elects which of the nested scrollers owns a wheel gesture, like browsers do: the owner is the
 * innermost scroller able to scroll when the gesture starts, and it keeps every event of the
 * gesture, even at its scroll boundary or if another scroller moves under the still pointer.
 * The gesture ends when the wheel is idle or when the pointer moves away from where it started.
 */
export class ScrollLatchStore extends DisposableStore {
  // not mutators: the latch is bookkeeping that never affects rendering
  storeGetters = ["claim", "release", "isGestureActive", "onGestureEnd"] as const;

  private owner: WheelScroller | undefined = undefined;
  private gestureStart: WheelEvent | undefined = undefined;
  private lastEvent: WheelEvent | undefined = undefined;
  private settleTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  private gestureEndCallbacks = new Set<() => void>();

  constructor(get: Get) {
    super(get);
    this.onDispose(() => clearTimeout(this.settleTimeout));
  }

  claim(ev: WheelEvent, candidate: WheelScroller, deltaX: Pixel, deltaY: Pixel) {
    if (ev !== this.lastEvent) {
      if (this.isOutsideGesture(ev)) {
        this.endGesture();
      }
      this.gestureStart ??= ev;
      this.lastEvent = ev;
      clearTimeout(this.settleTimeout);
      this.settleTimeout = setTimeout(() => this.endGesture(), SCROLL_SETTLE_DELAY);
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

  isGestureActive(): boolean {
    return this.gestureStart !== undefined;
  }

  /** Calls `callback` each time a gesture ends. Returns the unsubscribe function. */
  onGestureEnd(callback: () => void): () => void {
    this.gestureEndCallbacks.add(callback);
    return () => this.gestureEndCallbacks.delete(callback);
  }

  private isOutsideGesture(ev: WheelEvent): boolean {
    if (!this.lastEvent || !this.gestureStart) {
      return false;
    }
    const distance = Math.hypot(
      ev.clientX - this.gestureStart.clientX,
      ev.clientY - this.gestureStart.clientY
    );
    // the timestamps catch an idle gap the timer could not end in time, e.g. on a busy main thread
    return (
      ev.timeStamp - this.lastEvent.timeStamp > SCROLL_SETTLE_DELAY ||
      distance > WHEEL_LATCHING_SLOP
    );
  }

  private endGesture() {
    clearTimeout(this.settleTimeout);
    this.settleTimeout = undefined;
    this.owner = undefined;
    this.gestureStart = undefined;
    this.lastEvent = undefined;
    this.gestureEndCallbacks.forEach((callback) => callback());
  }
}
