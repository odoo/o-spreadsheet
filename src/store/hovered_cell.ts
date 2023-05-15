import { Position } from "../types";
import { Store } from "./store";

export class HoveredCell extends Store {
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
