import { Style, Border, Zone } from "./misc";

export type Rect = [number, number, number, number];

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textWidth: number;
  style: Style | null;
  border: Border | null;
  align: "left" | "right" | "center" | null;
  clipRect: Rect | null;
  error?: string;
}

export interface Viewport extends Zone {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

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
  Selection,
  Autofill,
  Headers, // Probably keep this at the end
}
