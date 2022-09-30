import { Command } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

/**
 * Transaction Plugin
 *
 * This plugin solely handles the command TRANSACTION
 * It was isolated in a single module in order to place
 * it before all other uiPlugins in the handling list.
 *
 * Command TRANSACTION is meant to allow multiple external dispatch
 * (i.e. dispatches from model itself) to be batched in a single
 * history entry. This way, those calls will be undone/redone in the
 * same call to UNDO/REDO. Before this command, this behaviour was only
 * available for dispatches from inside the plugins.
 *
 */
export class TransactionPlugin extends UIPlugin {
  static layers = [];
  static getters = [] as const;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "TRANSACTION":
        for (const command of cmd.commands) {
          this.dispatch(command.type, command);
        }
        break;
    }
  }
}
