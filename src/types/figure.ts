import { UID } from ".";

export interface Figure {
  id: UID;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
}
