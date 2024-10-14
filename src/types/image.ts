import { Alias } from "..";
import { FigureSize } from "./figure";
import { XLSXFigureSize } from "./xlsx";

/**
 * Image source given to <img src="..."/>
 */
export type ImageSrc = string & Alias;

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

export const AllowedImageMimeTypes = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/vnd.microsoft.icon",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
] as const;
