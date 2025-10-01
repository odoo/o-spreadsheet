import { FigureSize } from "./figure";
import { Color } from "./misc";
import { XLSXFigureSize } from "./xlsx";

export type ImageSVG = {
  name: string;
  width: number;
  height: number;
  paths: { path: string; fillColor: Color }[];
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
