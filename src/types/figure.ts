import type { Pixel, UID } from ".";

export interface Figure {
  id: UID;
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
  tag: string;
}

export interface FigureSize {
  width: Pixel;
  height: Pixel;
}

export type ResizeDirection = -1 | 0 | 1;
