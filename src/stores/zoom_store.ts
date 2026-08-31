import { zoomCorrectedElementRect } from "../components/helpers/dom_helpers";
import { ZoomedMouseEvent } from "../components/helpers/zoom";
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, SCROLLBAR_WIDTH } from "../constants";
import { getZoomedRect } from "../helpers/rectangle";
import { Pixel } from "../types/misc";
import { DOMCoordinates, Rect } from "../types/rendering";

/**
 * Holds the zoom level of the spreadsheet UI, and everything derived purely from it.
 */
export class ZoomStore {
  mutators = ["setZoom"] as const;
  storeGetters = ["getZoomedRect", "getZoomedEvent"] as const;
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

  /**
   * Return a POJO containing the original event as well as the client position and the client offset
   * where the event would target if the spreadsheet was not zoomed
   * @param ev unzoomed mouse event
   * @param originalTargetPosition The original target bounding rect the resulting ZoomedMouseEvent offset must refer to
   * @returns a ZoomedMouseEvent
   */
  getZoomedEvent<T extends MouseEvent>(
    ev: T,
    originalTargetPosition?: DOMCoordinates | null
  ): ZoomedMouseEvent<T> {
    if (originalTargetPosition === undefined) {
      originalTargetPosition = this.getZoomTargetPosition(ev, this.zoomLevel);
    }
    if (!originalTargetPosition) {
      return {
        ev,
        clientX: ev.clientX,
        clientY: ev.clientY,
        offsetX: ev.offsetX,
        offsetY: ev.offsetY,
      };
    }
    const baseOffsetX = ev.clientX - originalTargetPosition.x;
    const baseOffsetY = ev.clientY - originalTargetPosition.y;
    const offsetX = baseOffsetX / this.zoomLevel;
    const offsetY = baseOffsetY / this.zoomLevel;
    return {
      ev,
      clientX: ev.clientX - baseOffsetX + offsetX,
      clientY: ev.clientY - baseOffsetY + offsetY,
      offsetX,
      offsetY,
    };
  }

  /**
   * Returns the bounding rect of the closest or self element who is targetable by a ZoomedMouseEvent
   */
  private getZoomTargetPosition(ev: MouseEvent, zoom: number): DOMCoordinates | null {
    const target = ev.target;
    if (!target || !("classList" in target) || !(target instanceof Element)) {
      return null;
    }
    return zoomCorrectedElementRect(target, zoom);
  }

  get scrollBarWidth(): Pixel {
    return SCROLLBAR_WIDTH / this.zoomLevel;
  }

  get cssZoom(): string {
    return `${this.zoomLevel}`;
  }
}
