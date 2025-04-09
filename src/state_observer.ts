import { createEmptyStructure } from "./helpers/state_manager_helpers";
import { AddConditionalFormatCommand, CoreCommand, HistoryChange } from "./types";

export class StateObserver {
  private changes: HistoryChange[] | undefined;
  private commands: CoreCommand[] = [];
  private commandsByType: Set<string> = new Set();

  /**
   * Record the changes which could happen in the given callback, save them in a
   * new revision with the given id and userId.
   */
  recordChanges(callback: () => void): { changes: HistoryChange[]; commands: CoreCommand[] } {
    this.changes = [];
    this.commands = [];
    this.commandsByType = new Set<string>();
    callback();
    return { changes: this.changes, commands: this.commands };
  }

  addCommand(command: CoreCommand) {
    if (this.commandsByType.has(command.type)) {
      switch (command.type) {
        case "ADD_CONDITIONAL_FORMAT":
          let similarCmd = this.commands.find(
            (cmd) =>
              cmd.type === "ADD_CONDITIONAL_FORMAT" &&
              cmd.cf.id === command.cf.id &&
              cmd.sheetId === command.sheetId
          ) as AddConditionalFormatCommand | undefined;

          // this works because the command ADD_CONDITIONAL_FORMAT always contains the full definition of the CF
          if (similarCmd) {
            similarCmd.ranges = [...command.ranges];
            similarCmd.cf.rule = command.cf.rule;
            similarCmd.cf.stopIfTrue = command.cf.stopIfTrue;
          }
          return;
      }
    }
    this.commands.push(command);
    this.commandsByType.add(command.type);
  }

  addChange(...args: [...HistoryChange["path"], any]) {
    const val: any = args.pop();
    const root = args[0];
    let value = root as any;
    let key = args.at(-1);
    const pathLength = args.length - 2;
    for (let pathIndex = 1; pathIndex <= pathLength; pathIndex++) {
      const p = args[pathIndex];
      if (value[p] === undefined) {
        const nextPath = args[pathIndex + 1];
        value[p] = createEmptyStructure(nextPath);
      }
      value = value[p];
    }
    if (value[key] === val) {
      return;
    }
    this.changes?.push({
      path: args,
      before: value[key],
      after: val,
    });
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
