import { DOMCoordinates, Pixel, PixelPosition, Position, UID } from ".";

export interface Figure {
  id: UID;
  anchor: Position;
  offset: PixelPosition;
  fixed_position: boolean;
  width: Pixel;
  height: Pixel;
  tag: string;
}

export interface FigureUI extends DOMCoordinates {
  figure: Figure;
}

export interface AnchorOffset {
  anchor: Position;
  offset: PixelPosition;
}

export interface FigureSize {
  width: Pixel;
  height: Pixel;
}

export interface ExcelFigureSize {
  cx: number;
  cy: number;
}

export type ResizeDirection = -1 | 0 | 1;
