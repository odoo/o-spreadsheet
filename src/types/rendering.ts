import { memoize } from "../helpers/misc";
import { GridIcon } from "../registries/icons_on_cell_registry";
import { ImageSVG } from "./image";
import {
  Alias,
  Align,
  Border,
  Color,
  DataBarFill,
  Pixel,
  Style,
  VerticalAlign,
  Zone,
} from "./misc";

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
  fontSizePx: number;
  x: Pixel;
  y: Pixel;
}

export interface Box extends Rect {
  content?: BoxTextContent;
  style: Style;
  dataBarFill?: DataBarFill;
  border?: Border;
  clipRect?: Rect;
  isError?: boolean;
  isMerge?: boolean;
  verticalAlign?: VerticalAlign;
  isOverflow?: boolean;
  overlayColor: Color | undefined;
  icons: { left?: GridIcon; right?: GridIcon; center?: GridIcon };
}
export interface Image {
  clipIcon: Rect | null;
  size: Pixel;
  type: "icon"; //| "Picture"
  svg: ImageSVG;
}

/**
 * The viewport is the visible area of a sheet.
 * Column and row headers are not included in the viewport.
 */

export type Viewport = Zone & Alias;

export interface SheetDOMScrollInfo {
  /**
   * The scrollBar offset in the X coordinate
   */
  scrollX: Pixel;

  /**
   * The scrollBar offset in the Y coordinate
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
