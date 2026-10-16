import {
  onMounted,
  onPatched,
  proxy,
  shallowEqual,
  Signal,
  signal,
  useEffect,
  usePlugin,
} from "@odoo/owl";
import { Rect } from "../../types/rendering";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";
import { getBoundingRectAsPOJO } from "./dom_helpers";

/**
 * Return the o-spreadsheet element position relative
 * to the browser viewport.
 */
export function useSpreadsheetRect(): Rect {
  const position = proxy({ x: 0, y: 0, width: 0, height: 0 });
  let spreadsheetElement: Element | null = null;
  function updatePosition() {
    if (!spreadsheetElement) {
      spreadsheetElement = document.querySelector(".o-spreadsheet");
    }
    if (spreadsheetElement) {
      const { top, left, width, height } = spreadsheetElement.getBoundingClientRect();
      position.x = left;
      position.y = top;
      position.width = width;
      position.height = height;
    }
  }
  onMounted(updatePosition);
  onPatched(updatePosition);
  return position;
}

/**
 * Get the rectangle inside which a popover should stay when being displayed.
 * It's the value defined in `env.getPopoverContainerRect`, or the Rect of the "o-spreadsheet"
 * element by default.
 *
 * Coordinates are expressed expressed as absolute DOM position.
 */
export function usePopoverContainer(): Rect {
  const container = proxy({ x: 0, y: 0, width: 0, height: 0 });
  const popoverContainerPlugin = usePlugin(PopoverContainerPlugin);
  function updateRect() {
    const newRect = popoverContainerPlugin.getContainerRect();
    container.x = newRect.x;
    container.y = newRect.y;
    container.width = newRect.width;
    container.height = newRect.height;
  }
  updateRect();
  onMounted(updateRect);
  onPatched(updateRect);
  return container;
}

export function useResizeObserver(ref: () => HTMLElement | null, callback: ResizeObserverCallback) {
  useEffect(() => {
    const el = ref();
    if (!el) {
      return;
    }
    const resizeObserver = new ResizeObserver(callback);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  });
}

/**
 * Get the rect of a DOM element as a reactive signal.
 * The dimensions are updated and the signal triggered whenever the element is resized.
 */
export function useElementRect(ref: () => HTMLElement | null): Signal<Rect> {
  const dimensions = signal<Rect>({ x: 0, y: 0, width: 0, height: 0 }, { equals: shallowEqual });
  function updateDimensions() {
    const el = ref();
    if (el) {
      dimensions.set(getBoundingRectAsPOJO(el));
    }
  }
  useResizeObserver(ref, updateDimensions);
  onMounted(updateDimensions);
  onPatched(updateDimensions);
  return dimensions;
}
