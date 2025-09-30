import { Pixel, UID } from "@odoo/o-spreadsheet-engine";

export interface FigureInfo {
  id: UID;
  width: Pixel;
  height: Pixel;
  tag: string;
}

export interface Figure extends FigureInfo, AnchorOffset {}

export interface FigureUI extends DOMCoordinates, Figure {}

export interface AnchorOffset {
  col: HeaderIndex;
  row: HeaderIndex;
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

export interface Carousel {
  readonly items: CarouselItem[];
  readonly title?: TitleDesign;
}

export type CarouselItem =
  | { type: "chart"; chartId: UID; title?: string }
  | { type: "carouselDataView"; title?: string };
