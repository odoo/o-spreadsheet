import { Align, Border, Pixel, Style, Zone } from "./misc";

export type Rect = {
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
};

/**
 * Coordinate in pixels
 */
export interface DOMCoordinates {
  x: Pixel;
  y: Pixel;
}

export interface BoxTextContent {
  text: string;
  width: Pixel;
  align: Align;
}

export interface Box extends Rect {
  content?: BoxTextContent;
  style: Style;
  border?: Border;
  clipRect?: Rect;
  error?: string;
  image?: Image;
  isMerge?: boolean;
}
export interface Image {
  clipIcon: Rect | null;
  size: Pixel;
  type: "icon"; //| "Picture"
  image: HTMLImageElement;
}

export interface DOMDimension {
  width: Pixel;
  height: Pixel;
}

/**
 * The viewport is the visible area of a sheet.
 * Column and row headers are not included in the viewport.
 */
export interface Viewport extends Zone {
  /**
   * The offset in the X coordinate between the viewport left side and
   * the grid left side (left of column "A").
   */
  offsetX: Pixel;
  /**
   * The scrollBar offset in the X coordinate, which can differ from offsetX as
   * the former is "smooth" and the latter will "snap" from one cell coordinate to the other
   */
  offsetScrollbarX: Pixel;
  /**
   * The offset in the Y coordinate between the viewport top side and
   * the grid top side (top of row "1").
   */
  offsetY: Pixel;
  /**
   * The scrollBar offset in the Y coordinate, which can differ from offsetX as
   * the former is "smooth" and the latter will "snap" from one cell coordinate to the other
   */
  offsetScrollbarY: Pixel;
}

export interface GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  thinLineWidth: number;
}

export const enum LAYERS {
  Background,
  Highlights,
  Clipboard,
  Search,
  Chart,
  Selection,
  Autofill,
  Headers, // Probably keep this at the end
}

export interface EdgeScrollInfo {
  canEdgeScroll: boolean;
  direction: number;
  delay: number;
}

export type ScrollDirection = 1 | 0 | -1;
