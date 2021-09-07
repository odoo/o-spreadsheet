import { Align, Border, Style, Zone } from "./misc";

export type Rect = [number, number, number, number];

/**
 * Coordinate in pixels
 */
export interface DOMCoordinates {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textWidth: number;
  style: Style | null;
  border: Border | null;
  align: Align;
  clipRect: Rect | null;
  error?: string;
  image?: Image;
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

export interface Offsets {
  offsetX: number;
  offsetY: number;
}

export interface Viewport extends Zone, Offsets {}

export interface PluginRenderingContext {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr: number;
  thinLineWidth: number;
}

export interface RenderingContexts {
  grid: PluginRenderingContext;
  columns: PluginRenderingContext;
  rows: PluginRenderingContext;
}

export const enum LAYERS {
  Background,
  Highlights,
  Clipboard,
  Search,
  Chart,
  Selection,
  Autofill,
  ColumnHeader, // Probably keep this at the end
  RowHeader, // Probably keep this at the end
}

export interface EdgeScrollInfo {
  canEdgeScroll: boolean;
  direction: number;
  delay: number;
}

export type ScrollDirection = 1 | 0 | -1;
