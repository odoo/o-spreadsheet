import { computed, onWillDestroy, Plugin, signal, useListener } from "@odoo/owl";
import { WHEEL_GESTURE_MOVE_THRESHOLD, WHEEL_GESTURE_TIMEOUT } from "../constants";
import { debounce } from "../helpers/misc";
import { Pixel } from "../types/misc";

export interface WheelScroller {
  canScroll: (deltaX: Pixel, deltaY: Pixel) => boolean;
  scrollBy: (deltaX: Pixel, deltaY: Pixel) => void;
}

// Locks each wheel gesture to the innermost scroller that could scroll when it started
export class WheelGesturePlugin extends Plugin {
  // Not reactive: only read to update the hover when scrolling stops
  pointer: MouseEvent | undefined = undefined;
  private owner: WheelScroller | undefined = undefined;
  private gestureStart = signal<WheelEvent | undefined>(undefined);
  private debouncedEndGesture = debounce(() => this.endGesture(), WHEEL_GESTURE_TIMEOUT);

  isScrolling = computed(() => this.gestureStart() !== undefined);

  setup() {
    useListener(window, "pointermove", (ev: PointerEvent) => (this.pointer = ev));
    onWillDestroy(() => this.debouncedEndGesture.stopDebounce());
  }

  claimGesture(ev: WheelEvent, candidate: WheelScroller, deltaX: Pixel, deltaY: Pixel) {
    if (!this.isInCurrentGesture(ev)) {
      this.startGesture(ev);
    }
    this.pointer = ev;
    this.debouncedEndGesture();
    this.owner ??= candidate.canScroll(deltaX, deltaY) ? candidate : undefined;
    return this.owner;
  }

  // Called on unmount, so a destroyed scroller never keeps the gesture
  release(scroller: WheelScroller) {
    if (this.owner === scroller) {
      this.owner = undefined;
    }
  }

  private isInCurrentGesture(ev: WheelEvent): boolean {
    const start = this.gestureStart();
    return (
      !!start &&
      Math.hypot(ev.clientX - start.clientX, ev.clientY - start.clientY) <=
        WHEEL_GESTURE_MOVE_THRESHOLD
    );
  }

  private startGesture(ev: WheelEvent) {
    this.owner = undefined;
    this.gestureStart.set(ev);
  }

  private endGesture() {
    this.owner = undefined;
    this.gestureStart.set(undefined);
  }
}
