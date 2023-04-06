import { FigureSize } from "./figure";

export interface Image {
  path: string;
  size: FigureSize;
  mimetype?: string;
}
