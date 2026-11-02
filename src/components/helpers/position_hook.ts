import {
  onMounted,
  onPatched,
  providePlugins,
  shallowEqual,
  signal,
  Signal,
  usePlugin,
} from "@odoo/owl";
import { SpreadsheetRectPlugin } from "../../owl_plugins/spreadsheet_rect_plugin";
import { Rect } from "../../types/rendering";
import { getBoundingRectAsPOJO } from "./dom_helpers";
import { useResizeObserver } from "./listener_hook";

export function provideSpreadsheetRect(spreadsheetRef: Signal<HTMLElement | null>) {
  providePlugins([SpreadsheetRectPlugin]);
  const spreadsheetRectPlugin = usePlugin(SpreadsheetRectPlugin);
  function updatePosition() {
    const spreadsheetElement = spreadsheetRef();
    if (spreadsheetElement) {
      spreadsheetRectPlugin.setSpreadsheetRect(getBoundingRectAsPOJO(spreadsheetElement));
    }
  }
  onMounted(updatePosition);
  onPatched(updatePosition);
  useResizeObserver(spreadsheetRef, updatePosition);
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
