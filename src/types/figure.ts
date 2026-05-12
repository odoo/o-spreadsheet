import { TitleDesign } from "./chart/chart";
import { HeaderIndex, Pixel, PixelPosition, UID } from "./misc";
import { Range, RangeData } from "./range";
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

export type CarouselItem =
  | { type: "chart"; chartId: UID; title?: string }
  // Type with never otherwise since both range/rangeData are optional, we could assign a CarouselItemData to a CarouselItem
  | { type: "carouselDataView"; title?: string; range?: Range; rangeData?: never };

export interface CarouselData extends Omit<Carousel, "items"> {
  readonly items: CarouselItemData[];
}

export type CarouselItemData =
  | { type: "chart"; chartId: UID; title?: string }
  | { type: "carouselDataView"; title?: string; rangeData?: RangeData; range?: never };
