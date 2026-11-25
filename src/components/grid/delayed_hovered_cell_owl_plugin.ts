import { shallowEqual, signal } from "@odoo/owl";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { Command } from "../../types/commands";
import { CellPosition } from "../../types/misc";

export class HoveredCellPlugin extends OwlPluginWithModel {
  position = signal<CellPosition | undefined>(undefined, { equals: shallowEqual });

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: CellPosition) {
    this.position.set(position);
  }

  clear() {
    this.position.set(undefined);
  }
}

export class DelayedHoveredCellPlugin extends HoveredCellPlugin {
  static id = "DelayedHoveredCellPlugin";
}
