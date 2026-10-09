import { Pixel } from "../types/misc";

export interface ScrollPosition {
  offsetX: Pixel;
  offsetY: Pixel;
}

/**
 * Persists the scroll position of carousel data views (StandaloneViewport) across remounts.
 *
 * A carousel figure's content is only rendered while the figure itself is visible on screen (see
 * ViewportsStore.visibleFigures): scrolling it out of view destroys its component, along with the
 * viewport store holding its scroll offset. This store keeps that offset alive outside the
 * component's lifetime, keyed by the range it displays, so scrolling the figure back into view
 * restores the position instead of resetting to the top.
 */
export class CarouselScrollPositionStore {
  mutators = ["save"] as const;
  storeGetters = ["getPosition"] as const;

  private positions = new Map<string, ScrollPosition>();

  save(key: string, position: ScrollPosition) {
    this.positions.set(key, position);
    return "noStateChange" as const;
  }

  getPosition(key: string): ScrollPosition | undefined {
    return this.positions.get(key);
  }
}
