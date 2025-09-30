import { Position } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetStore } from "../../stores";
import { Command } from "../../types";

export class DelayedHoveredCellStore extends SpreadsheetStore {
  mutators = ["clear", "hover"] as const;
  col: number | undefined;
  row: number | undefined;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position>) {
    if (position.col === this.col && position.row === this.row) {
      return "noStateChange";
    }
    this.col = position.col;
    this.row = position.row;
    return;
  }

  clear() {
    if (this.col === undefined && this.row === undefined) {
      return "noStateChange";
    }
    this.col = undefined;
    this.row = undefined;
    return;
  }
}
