import type { FigureSize } from "./figure";
import type { XLSXFigureSize } from "./xlsx";

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
