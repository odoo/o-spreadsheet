import { Command, CommandResult } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class FigureUIPlugin extends UIPlugin {
  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const subCommand of cmd.commands) {
          const result = this.allowDispatch({ type: "UPDATE_FIGURE", ...subCommand });
          if (result !== CommandResult.Success) {
            return result;
          }
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          if (!this.getters.getFigure(cmd.sheetId, figureId)) {
            return CommandResult.FigureDoesNotExist;
          }
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const subCommand of cmd.commands) {
          this.dispatch("UPDATE_FIGURE", subCommand);
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
        }
        break;
    }
  }
}
