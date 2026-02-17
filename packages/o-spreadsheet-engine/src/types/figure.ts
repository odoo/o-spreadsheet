import { TitleDesign } from "./chart";
import { HeaderIndex, Pixel, PixelPosition, UID } from "./misc";
import { DOMCoordinates } from "./rendering";

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

export interface RangeCarouselItem {
  type: "dataRange";
  id: string; // ADRM TODO: remove id ? or use it in carousel_ui
  range: string;
  title?: string;
}

export type CarouselItem =
  | { type: "chart"; chartId: UID; title?: string }
  | RangeCarouselItem // ADRM TODO: remove id ? or use it un carousel_ui
  | { type: "carouselDataView"; title?: string }; // ADRM TODO: remove this ?
