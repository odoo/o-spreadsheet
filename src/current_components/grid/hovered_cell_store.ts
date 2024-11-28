import { SpreadsheetStore } from "../../stores";
import { Command, Position } from "../../types";

export class HoveredCellStore extends SpreadsheetStore {
  mutators = ["clear", "hover"] as const;
  col: number | undefined;
  row: number | undefined;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Position) {
    this.col = position.col;
    this.row = position.row;
  }

  clear() {
    this.col = undefined;
    this.row = undefined;
  }
}
