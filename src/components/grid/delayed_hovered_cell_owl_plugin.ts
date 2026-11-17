import { signal } from "@odoo/owl";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { Command } from "../../types/commands";
import { Position } from "../../types/misc";

export class DelayedHoveredCellPlugin extends OwlPluginWithModel {
  col = signal<number | undefined>(undefined);
  row = signal<number | undefined>(undefined);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position>) {
    this.col.set(position.col);
    this.row.set(position.row);
  }

  clear() {
    this.col.set(undefined);
    this.row.set(undefined);
  }
}
