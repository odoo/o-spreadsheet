import { GridIcon } from "../../../../src/registries/icons_on_cell_registry";
import { ImageSVG } from "./image";
import { Alias, Align, BorderDescr, Color, DataBarFill, Pixel, Style, Zone } from "./misc";

/**
 * Coordinate in pixels
 */
export interface DOMCoordinates {
  x: Pixel;
  y: Pixel;
}

export interface DOMDimension {
  width: Pixel;
  height: Pixel;
}

export type Rect = DOMCoordinates & DOMDimension;

export interface BoxTextContent {
  textLines: string[];
  width: Pixel;
  align: Align;
  fontSizePx: number;
  x: Pixel;
  y: Pixel;
}

export type BorderDescrWithOpacity = BorderDescr & { opacity?: number };
export type RenderingBorder = {
  top?: BorderDescrWithOpacity;
  right?: BorderDescrWithOpacity;
  bottom?: BorderDescrWithOpacity;
  left?: BorderDescrWithOpacity;
};
export type RenderingGridIcon = GridIcon & { clipRect?: Rect; opacity?: number };

export interface RenderingBox {
  id: string;
  content?: BoxTextContent;
  style: Style;
  chip?: {
    x: number;
    y: number;
    width: Pixel;
    height: Pixel;
    color: Color;
  };
  dataBarFill?: DataBarFill;
  border?: RenderingBorder;
  clipRect?: Rect;
  isError?: boolean;
  isMerge?: boolean;
  isOverflow?: boolean;
  overlayColor?: Color;
  icons: { left?: RenderingGridIcon; right?: RenderingGridIcon; center?: RenderingGridIcon };
  textOpacity?: number;
  skipCellGridLines?: boolean;
  disabledAnimation?: boolean;
}

export type Box = RenderingBox & Rect;

export interface Image {
  clipIcon: Rect | null;
  size: Pixel;
  type: "icon"; //| "Picture"
  svg: ImageSVG;
}

export const LAYERS = {
  Background: 0,
  Highlights: 1,
  Clipboard: 2,
  Chart: 4,
  Autofill: 5,
  Selection: 6,
  Headers: 100, // ensure that we end up on  top
} as const;
/**
 * The viewport is the visible area of a sheet.
 * Column and row headers are not included in the viewport.
 */

export type Viewport = Zone & Alias;
export interface SheetDOMScrollInfo {
  /**
   * The scrollBar offset in the X coordinate
   */
  scrollX: Pixel;

  /**
   * The scrollBar offset in the Y coordinate
   */
  scrollY: Pixel;
}
export type LayerName = keyof typeof LAYERS;
export interface GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  thinLineWidth: number;
}
