import { Position } from "../types";

export class HoveredCell {
  col?: number;
  row?: number;
  hover(position: Position | undefined) {
    if (position) {
      this.col = position.col;
      this.row = position.row;
    } else {
      this.col = undefined;
      this.row = undefined;
    }
  }
}
