import { TitleDesign } from "./chart/chart";
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
  readonly layout?: "tabs" | "row" | "grid";
  readonly columns?: number;
  readonly showDataView?: boolean;
}

export interface CarouselItem {
  type: string;
  id: UID;
  title?: string;
  colSpan?: number;
  rowSpan?: number;
}
