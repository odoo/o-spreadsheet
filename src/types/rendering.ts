import { memoize } from "../helpers/misc";
import { Alias, Align, Border, Pixel, Style, VerticalAlign, Zone } from "./misc";

/**
 * Coordinate in pixels
 */
export interface DOMCoordinates {
  x: Pixel;
  y: Pixel;
}

export interface DOMDimension {
  width: Pixel;
  height: Pixel;
}

export type Rect = DOMCoordinates & DOMDimension;

export interface BoxTextContent {
  textLines: string[];
  width: Pixel;
  align: Align;
}

export interface Box extends Rect {
  content?: BoxTextContent;
  style: Style;
  border?: Border;
  hasIcon?: boolean;
  clipRect?: Rect;
  isError?: boolean;
  image?: Image;
  isMerge?: boolean;
  verticalAlign?: VerticalAlign;
  isOverflow?: boolean;
}
export interface Image {
  clipIcon: Rect | null;
  size: Pixel;
  type: "icon"; //| "Picture"
  image: HTMLImageElement;
}

/**
 * The viewport is the visible area of a sheet.
 * Column and row headers are not included in the viewport.
 */

export type Viewport = Zone & Alias;

export interface SheetScrollInfo {
  /**
   * The offset in the X coordinate between the viewport left side and
   * the grid left side (left of column "A").
   */
  scrollX: Pixel;
  /**
   * The offset in the Y coordinate between the viewport top side and
   * the grid top side (top of row "1").
   */
  scrollY: Pixel;
}

export interface SheetDOMScrollInfo {
  /**
   * The scrollBar offset in the X coordinate, which can differ from offsetX as
   * the former is "smooth" and the latter will "snap" from one cell coordinate to the other
   */
  scrollX: Pixel;

  /**
   * The scrollBar offset in the Y coordinate, which can differ from offsetX as
   * the former is "smooth" and the latter will "snap" from one cell coordinate to the other
   */
  scrollY: Pixel;
}

export interface GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  thinLineWidth: number;
}

const LAYERS = {
  Background: 0,
  Highlights: 1,
  Clipboard: 2,
  Search: 3,
  Chart: 4,
  Autofill: 5,
  Selection: 6,
  Headers: 100, // ensure that we end up on  top
} as const;

export type LayerName = keyof typeof LAYERS;

export const OrderedLayers = memoize(
  () => Object.keys(LAYERS).sort((a, b) => LAYERS[a] - LAYERS[b]) as LayerName[]
);

/**
 *
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
