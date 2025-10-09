import { memoize } from "../helpers";
import { LayerName, LAYERS } from "./rendering";

export const OrderedLayers = memoize(
  () => Object.keys(LAYERS).sort((a, b) => LAYERS[a] - LAYERS[b]) as LayerName[]
);

/**
 *
 * Add a new rendering layer
 * @param layer New layer name
 * @param priority The lower priorities are rendered first
 */
export function addRenderingLayer(layer: string, priority: number) {
  if (LAYERS[layer]) {
    throw new Error(`Layer ${layer} already exists`);
  }
  LAYERS[layer] = priority;
}

export interface EdgeScrollInfo {
  canEdgeScroll: boolean;
  direction: ScrollDirection;
  delay: number;
}

export type ScrollDirection = 1 | 0 | -1 | "reset";
