import { UID } from "./misc";

export interface Figure {
  id: UID;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
}
