import { Pixel, UID } from ".";

export interface Figure {
  id: UID;
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
  tag: string;
}
