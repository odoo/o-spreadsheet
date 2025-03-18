import { FigureSize } from "./figure";
import { XLSXFigureSize } from "./xlsx";

export type ImageSVG = {
  path: string;
  width: number;
  height: number;
  fillColor: string;
};

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
