import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, SCROLLBAR_WIDTH } from "../constants";
import { getZoomedRect } from "../helpers/rectangle";
import { Pixel } from "../types/misc";
import { Rect } from "../types/rendering";

/**
 * Holds the zoom level of the spreadsheet UI, and everything derived purely from it.
 */
export class ZoomStore {
  mutators = ["setZoom"] as const;
  storeGetters = ["getZoomedRect"] as const;
  zoomLevel: number = DEFAULT_ZOOM;

  setZoom(zoom: number) {
    if (zoom > MAX_ZOOM || zoom < MIN_ZOOM || zoom === this.zoomLevel) {
      return "noStateChange";
    }
    this.zoomLevel = zoom;
    return;
  }

  getZoomedRect(rect: Rect): Rect {
    return getZoomedRect(this.zoomLevel, rect);
  }

  get scrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.zoomLevel;
  }

  get cssZoom(): string {
    return `${this.zoomLevel}`;
  }
}
