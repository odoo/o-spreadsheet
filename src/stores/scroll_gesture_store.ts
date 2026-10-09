/**
 * Delay without any scroll activity after which the current scroll gesture is considered finished.
 */
export const SCROLL_GESTURE_TIMEOUT = 500;

export interface ScrollGestureOwner {
  scroll: (deltaX: number, deltaY: number) => void;
}

/**
 * Holds which scrollable element owns the scroll gesture currently in progress, mimicking the
 * browser's scroll chaining (also known as scroll latching).
 *
 * The spreadsheet and the viewports nested inside it (the carousel data views) all scroll through
 * their own mechanism, so a wheel event over a nested viewport is ambiguous. This store is the
 * single arbiter: the first scrollable element able to handle a new gesture claims it and keeps it
 * until the gesture ends, ie. until SCROLL_GESTURE_TIMEOUT elapses without any scroll activity.
 * Elements which do not own the gesture must ignore it, so that reaching the boundary of a nested
 * viewport does not hand the remaining scroll over to the spreadsheet, and so that a nested
 * viewport scrolling under the pointer does not steal an ongoing spreadsheet gesture.
 *
 * This store is deliberately *not* owned by the nested viewports store containers: it is shared by
 * the whole spreadsheet.
 */
export class ScrollGestureStore {
  mutators = ["claim", "keepAlive", "scrollOwner", "register", "unRegister"] as const;
  storeGetters = ["hasOwner", "isOwnedBy"] as const;

  private owner: ScrollGestureOwner | undefined = undefined;
  private timeOutId: ReturnType<typeof setTimeout> | undefined = undefined;
  private listeners: (() => void)[] = [];

  /** Make the given element the owner of a new scroll gesture */
  claim(owner: ScrollGestureOwner) {
    this.owner = owner;
    this.restartTimeOut();
    return "noStateChange" as const;
  }

  /** Keep the gesture of the current owner alive */
  keepAlive() {
    this.restartTimeOut();
    return "noStateChange" as const;
  }

  /**
   * Scroll the owner of the current gesture. This is used when the pointer left the owner while it
   * is still scrolling: like in a browser, the scroll keeps being applied to the latched element.
   */
  scrollOwner(deltaX: number, deltaY: number) {
    this.restartTimeOut();
    this.owner?.scroll(deltaX, deltaY);
  }

  hasOwner() {
    return this.owner !== undefined;
  }

  isOwnedBy(owner: ScrollGestureOwner) {
    return this.owner === owner;
  }

  /** Register a callback called whenever a scroll gesture ends */
  register(listener: () => void) {
    this.listeners.push(listener);
    return "noStateChange" as const;
  }

  unRegister(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
    return "noStateChange" as const;
  }

  dispose() {
    clearTimeout(this.timeOutId);
    this.timeOutId = undefined;
  }

  private restartTimeOut() {
    clearTimeout(this.timeOutId);
    this.timeOutId = setTimeout(() => this.endGesture(), SCROLL_GESTURE_TIMEOUT);
  }

  private endGesture() {
    this.timeOutId = undefined;
    this.owner = undefined;
    // The listeners mutate their own stores, which is what triggers a re-render. A store mutating
    // itself outside of a component call does not notify anyone.
    for (const listener of this.listeners) {
      listener();
    }
  }
}
