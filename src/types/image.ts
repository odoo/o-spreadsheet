import { FigureSize } from "./figure";
import { XLSXFigureSize } from "./xlsx";

export interface Image {
  path: string;
  size: FigureSize;
  mimetype?: string;
  /**
   * Arbitrary metadata for the image. Can be used
   * to store additional information such as the storage
   * location.
   */
  metaData?: ImageMetadata;
}

export type ImageMetadata = Record<string, unknown>;

export interface ExcelImage {
  imageSrc: string;
  size: XLSXFigureSize;
  mimetype?: string;
}
