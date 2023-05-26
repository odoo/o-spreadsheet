import { Command, Position } from "../types";
import { ModelStore } from "./model_store";
import { Store } from "./store";

export class HoveredCell extends Store {
  col?: number;
  row?: number;

  constructor(get) {
    super(get);
    const model = this.get(ModelStore);
    model.on("command-dispatched", this, (cmd: Command) => {
      switch (cmd.type) {
        case "ACTIVATE_SHEET":
          this.col = undefined;
          this.row = undefined;
      }
    });
  }

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
