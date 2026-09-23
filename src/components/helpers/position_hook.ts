import {
  onMounted,
  onPatched,
  providePlugins,
  proxy,
  shallowEqual,
  signal,
  Signal,
  useEffect,
  usePlugin,
} from "@odoo/owl";
import { SpreadsheetRectPlugin } from "../../owl_plugins/spreadsheet_rect_plugin";
import { Rect } from "../../types/rendering";
import { getBoundingRectAsPOJO } from "./dom_helpers";

export function provideSpreadsheetRect(spreadsheetRef: Signal<HTMLElement | null>) {
  providePlugins([SpreadsheetRectPlugin]);
  const spreadsheetRectPlugin = usePlugin(SpreadsheetRectPlugin);
  function updatePosition() {
    const spreadsheetElement = spreadsheetRef();
    if (spreadsheetElement) {
      spreadsheetRectPlugin.setPosition(getBoundingRectAsPOJO(spreadsheetElement));
    }
  }
  onMounted(updatePosition);
  onPatched(updatePosition);
  useResizeObserver(spreadsheetRef, updatePosition);
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
  // const popoverContainerPlugin = usePlugin(PopoverContainerPlugin);
  // function updateRect() {
  //   const newRect = popoverContainerPlugin.getContainerRect();
  //   container.x = newRect.x;
  //   container.y = newRect.y;
  //   container.width = newRect.width;
  //   container.height = newRect.height;
  // }
  // updateRect();
  // onMounted(updateRect);
  // onPatched(updateRect);
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
