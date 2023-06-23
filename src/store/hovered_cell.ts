import { Command, Position } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export class HoveredCell extends SpreadsheetStore {
  col?: number;
  row?: number;

  protected handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.col = undefined;
        this.row = undefined;
    }
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
