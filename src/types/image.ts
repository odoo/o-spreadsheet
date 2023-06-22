import { FigureSize } from "./figure";
import { XLSXFigureSize } from "./xlsx";

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
