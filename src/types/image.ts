import { FigureSize } from "./figure";
import { XLSXFigureSize } from "./xlsx";

/**
 * Image source given to <img src="..."/>
 */
export type ImageSrc = string;

export interface Image {
  path: string;
  size: FigureSize;
  mimetype?: string;
}

export interface ExcelImage {
  imageSrc: string;
  size: XLSXFigureSize;
  mimetype?: string;
}
