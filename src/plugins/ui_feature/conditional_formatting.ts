import { Command, CommandResult, DispatchResult } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class ConditionalFormatUIPlugin extends UIPlugin {
  allowDispatch(command: Command): CommandResult | CommandResult[] {
    switch (command.type) {
      case "UPDATE_CONDITIONAL_FORMATS": {
        const results: DispatchResult[] = [];
        for (const sheetId of command.sheetIdsToRemove || []) {
          results.push(
            this.canDispatch("REMOVE_CONDITIONAL_FORMAT", {
              sheetId,
              id: command.cfId,
            })
          );
        }
        for (const sheetId in command.sheetIdsToAdd) {
          results.push(
            this.canDispatch("ADD_CONDITIONAL_FORMAT", {
              sheetId,
              cf: command.sheetIdsToAdd[sheetId].cf,
              ranges: command.sheetIdsToAdd[sheetId].ranges,
            })
          );
        }
        const reasons = results
          .map((result) => result.reasons)
          .flat()
          .filter((r) => r !== CommandResult.NoChanges);
        if (reasons.length) {
          return reasons;
        }
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CONDITIONAL_FORMATS":
        for (const sheetId of cmd.sheetIdsToRemove || []) {
          this.dispatch("REMOVE_CONDITIONAL_FORMAT", {
            sheetId,
            id: cmd.cfId,
          });
        }
        for (const sheetId in cmd.sheetIdsToAdd) {
          this.dispatch("ADD_CONDITIONAL_FORMAT", {
            sheetId,
            cf: cmd.sheetIdsToAdd[sheetId].cf,
            ranges: cmd.sheetIdsToAdd[sheetId].ranges,
          });
        }
        break;
    }
  }
}
