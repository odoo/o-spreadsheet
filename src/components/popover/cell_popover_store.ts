import { plugin } from "@odoo/owl";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellPopoverPlugin } from "../owl_plugins/cell_popover_plugin";

export class CellPopoverStore extends SpreadsheetStore {
  mutators = ["open", "close"] as const;

  // FIXME: the store is there because at the moment the plugins are not available in the helpers that take the env as argument.
  // It is a bit hacky, and wrong because the plugin won't be scoped correctly.
  // Remove the store once we can access the plugins from the helpers.
  popoverPlugin = plugin(CellPopoverPlugin);
}
