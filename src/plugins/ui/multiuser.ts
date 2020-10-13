import { Mode } from "../../model";
import { Command } from "../../types";
import { UIPlugin } from "./ui_plugin";

export class MultiUserPlugin extends UIPlugin {
  static getters = [];
  static modes: Mode[] = ["normal", "readonly"];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (cmd.type === "MULTIUSER") {
      const command = cmd.command;
      if (
        command.type === "UPDATE_CELL" ||
        command.type === "CREATE_SHEET" ||
        command.type === "MOVE_SHEET"
      ) {
        if (command.type === "CREATE_SHEET") {
          command.activate = false;
        }
        this.dispatch(command.type, command);
      }
    }
  }
}
