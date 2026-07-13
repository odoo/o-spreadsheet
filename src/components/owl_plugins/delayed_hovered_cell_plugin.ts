import { signal } from "@odoo/owl";
import { Command } from "../../types/commands";
import { Position } from "../../types/misc";
import { SpreadsheetOwlPlugin } from "./spreadsheet_owl_plugin";

export class DelayedHoveredCellPlugin extends SpreadsheetOwlPlugin {
  col = signal<number | undefined>(undefined);
  row = signal<number | undefined>(undefined);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position>) {
    if (position.col === this.col() && position.row === this.row()) {
      return;
    }
    this.col.set(position.col);
    this.row.set(position.row);
    return;
  }

  clear() {
    if (this.col() === undefined && this.row() === undefined) {
      return;
    }
    this.col.set(undefined);
    this.row.set(undefined);
    return;
  }
}
