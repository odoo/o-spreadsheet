import { Align, Border, Style, Zone } from "./misc";

export type Rect = [number, number, number, number];

/**
 * Coordinate in pixels
 */
export interface DOMCoordinates {
  x: number;
  y: number;
}

export interface BoxTextContent {
  text: string;
  width: number;
  align: Align;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
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
  size: number;
  type: "icon"; //| "Picture"
  image: HTMLImageElement;
}

export interface GridDimension {
  width: number;
  height: number;
}

export interface ViewportOffsets {
  /**
   * The offset in the X coordinate between the viewport left side and
   * the grid left side (left of column "A").
   */
  offsetX: number;
  /**
   * The offset in the Y coordinate between the viewport top side and
   * the grid top side (top of row "1").
   */
  offsetY: number;
}

/**
 * The viewport is the visible area of a sheet.
 * Column and row headers are not included in the viewport.
 */
export interface Viewport extends Zone, ViewportOffsets {}

export interface GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
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
