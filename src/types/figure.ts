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

export interface CarouselDataViewItem {
  type: "carouselDataView";
  title?: string;
  range?: Range;
  // Type with never otherwise since both range/rangeData are optional, we could assign a CarouselItemData to a CarouselItem
  rangeData?: never;
  /**
   * The weights of the columns define the ratio of the width of each column relative to the other columns and the figure width.
   *
   * For example if the carousel data view is 500px wide, and the weights are [250, 250, 500], the first two columns
   * will be 125px wide and the last column will be 250px wide.
   */
  columnWeights?: number[];
}

export type CarouselItem = { type: "chart"; chartId: UID; title?: string } | CarouselDataViewItem;

export interface CarouselData extends Omit<Carousel, "items"> {
  readonly items: CarouselItemData[];
}

export interface CarouselDataViewItemData
  extends Omit<CarouselDataViewItem, "range" | "rangeData"> {
  rangeData?: RangeData;
  range?: never;
}

export type CarouselItemData =
  | { type: "chart"; chartId: UID; title?: string }
  | CarouselDataViewItemData;
